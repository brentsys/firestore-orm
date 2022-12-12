import { AuthError } from '../errors/auth_error';
import { getDb } from '../config';
import { BaseModel, ModelDefinition } from '../model';
import {
  CollectionReference,
  DocumentData,
  DocumentSnapshot,
  Query,
  QueryDocumentSnapshot,
  SetOptions,
} from '../types/firestore';
import { ModelType } from '../types/model.types';
import { XQG } from '../types/query.types';
import { notEmpty } from '../utils';
import _ from 'lodash';
import { removeUndefined } from '../tools';
import { transform } from '../types/common';
import promiseSequential from 'promise-sequential';
import { DispatchSpecs } from '../types/dispatcher';

const CHUNK_SIZE = 500;

function getParentHierarchy(doc: DocumentSnapshot): [string, string][] {
  const pathArray = doc.ref.path.split('/');
  let i = 0;
  const hierarchy: [string, string][] = [];
  while (i < pathArray.length) {
    const node: [string, string] = [pathArray[i], pathArray[i + 1]];
    hierarchy.push(node);
    i += 2;
  }
  return hierarchy.slice(0, -1);
}

export abstract class BaseRepository<T extends ModelType, P extends ModelType = ModelType> {
  abstract definition: ModelDefinition;

  constructor(protected parentRepo: BaseRepository<P> | undefined) { }

  protected getRecordId: (obj: T) => string | undefined = () => {
    return undefined;
  };

  protected beforeSave = (data: DocumentData) => {
    return this.sanitize(removeUndefined(data));
  };

  protected validateOnCreate = async (data: DocumentData) => {
    return data
  }

  protected validateOnUpdate = async (data: DocumentData) => {
    return data
  }

  getCollectionPath = (parent: ModelType | undefined) =>
    [parent?.collectionPath, parent?.id, this.definition.name]
      .filter(notEmpty).join("/")

  db = () => getDb(this.definition.settings?.projectId)

  getCollectionReference(parent: ModelType | undefined): CollectionReference {

    return this.db().collection(this.getCollectionPath(parent));
  }

  fromDoc = (doc: DocumentSnapshot) => {
    const data = doc.data() || {};
    let parent: ModelType | undefined;
    getParentHierarchy(doc).forEach((cpl) => {
      parent = new BaseModel(cpl, parent);
    });
    const obj = this.make(data, parent);
    obj.id = doc.id;
    return obj;
  };

  getDocumentReference = (id: string, parent: ModelType | undefined) => {
    return this.getCollectionReference(parent).doc(id)
  };

  getById = async (id: string, parent: ModelType | undefined) => {
    return this.getDocumentReference(id, parent)
      .get()
      .then((snap) => {
        return snap.exists
          ? Promise.resolve(this.fromDoc(snap))
          : AuthError.reject(`Record not found (${snap.ref.path})`, 404);
      });
  };

  findById = async (id: string, parent: ModelType | undefined) => {
    return this.getById(id, parent).catch(() => Promise.resolve(undefined));
  };

  fromQuerySnap: (parent: ModelType | undefined | null) => (doc: QueryDocumentSnapshot) => T = (parent) => (doc) => {
    const data = doc.data() || {};
    const obj = this.make(data, parent ?? undefined);
    obj.id = doc.id;
    return obj;
  };
  async getList(queryGroup: XQG<P>) {
    const parent = queryGroup.parent ? queryGroup.parent : undefined
    const collRef = this.getCollectionReference(parent ?? undefined);
    const sorts = queryGroup.sorts || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = collRef as any as Query;
    const queries = queryGroup.queries || [];
    queries.forEach((q) => (query = query.where(q[0], q[1], q[2])));
    sorts.forEach((s) => (query = query.orderBy(s[0], s[1])));
    if (queryGroup.cursorId) {
      const lastVisible = collRef.doc(`${queryGroup.cursorId}`);
      query = query.startAfter(lastVisible);
    }
    if (queryGroup.limit) query = query.limit(queryGroup.limit);
    const snapShot = await query.get();
    return snapShot.docs.map(this.fromQuerySnap(parent));
  }

  // this one is obsolete...
  make = (data: DocumentData, parent: ModelType | undefined) => {
    const obj = transform<T>(data);
    obj.collectionPath = this.getCollectionPath(parent)
    return obj;
  };

  private sanitize: (data: DocumentData) => DocumentData = (data) => {
    let transients = this.definition.settings?.hiddenProperties ?? [];
    transients = transients.concat(['id', 'parent', 'collectionPath']);

    return _.omit(data, transients);
  };

  add = async (_data: DocumentData, parent: ModelType | undefined) => {
    const data = await this.validateOnCreate(this.beforeSave(_data));
    const record = this.make(data, parent);
    await this.checkRecordId(record);
    return this.save(record);
  };

  save = async (record: T) => {
    const collPath = record.collectionPath
    if (!collPath) return Promise.reject(new Error("invalid null collPath"))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const id = record.id ?? this.getRecordId(record);
    const options: SetOptions = { merge: !!record.id };
    const data = this.sanitize(record);
    const promise = !id ? this.addData(data, collPath) : this.setData(`${id}`, data, collPath, options);

    return await promise;
  };

  private checkRecordId = async (record: T) => {
    const id = record.id ?? this.getRecordId(record);
    const { collectionPath } = record
    if (id && collectionPath) {
      const docSnap = await this.db().collection(collectionPath).doc(`${id}`).get()
      if (docSnap.exists) return AuthError.reject(`record with id ${id} already exists`, 402);
    }
    return Promise.resolve();
  };

  private addData = async (_data: DocumentData, collPath: string) => {
    const collRef = this.db().collection(collPath)
    const data = this.beforeSave(_data);
    const docRef = await collRef.add(data);
    const obj = transform<T>(data);
    obj.collectionPath = collRef.path
    obj.id = docRef.id;

    return obj;
  };

  private setData = async (id: string, _data: DocumentData, collPath: string, options: SetOptions) => {
    const collRef = this.db().collection(collPath)
    const data = this.beforeSave(_data);
    await collRef.doc(id).set(data, options)
    const obj = transform<T>(data);
    obj.collectionPath = collRef.path
    obj.id = id;

    return obj;
  };

  set = async (id: string, _data: DocumentData, parent: ModelType | undefined, options: SetOptions) => {
    const collRef = this.getCollectionReference(parent)
    const data = await this.validateOnUpdate(this.beforeSave(_data));
    const docRef = collRef.doc(id);
    await docRef.set(data, options);
    return this.getById(id, parent);
  };

  delete: (id: string | undefined, parent: ModelType | undefined) => Promise<void> = async (id, parent) => {
    if (!id) return AuthError.reject("Cannot delete undefined id")
    await this.getCollectionReference(parent).doc(id).delete()
  };

  deleteRecord: (record: T) => Promise<void> = async (record) => {
    const { id, collectionPath } = record
    if (!collectionPath) return AuthError.reject("Cannot delete undefined collectionPath")
    if (!id) return AuthError.reject("Cannot delete undefined ID")
    await this.db().collection(collectionPath).doc(`${id}`).delete()
  };

  deleteGroup = (idx: string[], parent: ModelType | undefined) => {
    const collRef = this.getCollectionReference(parent);

    const tasks = _.chunk(idx, CHUNK_SIZE).map((list) => {
      return () => {
        const batch = this.db().batch();
        list.forEach((id) => {
          const docRef = collRef.doc(id);
          batch.delete(docRef);
        });

        return batch.commit();
      };
    });

    return promiseSequential(tasks);
  };

  execute(specs: DispatchSpecs<P>) {
    const { id } = specs
    const parent = specs.query?.parent ?? undefined
    switch (specs.method) {
      case "DELETE":
        return this.delete(specs.id, parent)
      case "PUT":
        if (!id) throw (new Error("invalid null id"))
        return this.set(id, specs.data ?? {}, parent, { merge: true })
      case "POST":
        return this.add(specs.data ?? {}, parent);
      case "GET":
        if (id) return this.getById(id, parent)
        else return this.getList(specs.query)
      default:
        throw (new Error(`cannot process method ${specs.method}`))
    }
  }
}
