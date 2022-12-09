import { AuthError } from './errors/auth_error';
import { getDb } from './config';
import { BaseModel, ModelDefinition } from './model';
import {
  CollectionReference,
  DocumentData,
  DocumentSnapshot,
  Query,
  QueryDocumentSnapshot,
  SetOptions,
} from './types/firestore';
import { ModelType } from './types/model.types';
import { QueryGroup } from './types/query.types';
import { notEmpty } from './utils';
import _ from 'lodash';
import { removeUndefined } from './tools';
import { transform } from './types/common';
import promiseSequential from 'promise-sequential';

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

export abstract class Repository<T extends ModelType = ModelType> {
  abstract definition: ModelDefinition;
  abstract parentRepo?: Repository;

  protected getRecordId: (obj: T) => string | undefined = () => {
    return undefined;
  };

  protected beforeSave = (data: DocumentData) => {
    return this.sanitize(removeUndefined(data));
  };

  private getParentPath(parent: ModelType | undefined): string | undefined {
    const repo = this.parentRepo;
    const id = parent?.id;
    if (!repo || !id) return;
    return repo.getCollectionReference(parent).doc(id).path;
  }

  getCollectionReference(parent: ModelType | undefined): CollectionReference {
    const { name, settings } = this.definition;
    const collPath = [this.getParentPath(parent), name].filter(notEmpty).join('/');

    return getDb(settings?.projectId).collection(collPath);
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
    const collRef = this.getCollectionReference(parent);
    return collRef.doc(id);
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

  getList = async (queryGroup: QueryGroup) => {
    const { parent } = queryGroup;
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
  };

  make = (data: DocumentData, parent: ModelType | undefined) => {
    const obj = transform<T>(data);
    obj.parent = parent;
    return obj;
  };

  private sanitize: (data: DocumentData) => DocumentData = (data) => {
    let transients = this.definition.settings?.hiddenProperties ?? [];
    transients = transients.concat(['id', 'parent']);

    return _.omit(data, transients);
  };

  add = async (_data: DocumentData, parent: ModelType | undefined) => {
    const data = this.beforeSave(_data);
    const record = this.make(data, parent);
    await this.checkRecordId(record);
    return this.save(record);
  };

  save = async (record: T) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const id = record.id ?? this.getRecordId(record);
    const options: SetOptions = { merge: !!record.id };
    const data = this.sanitize(record);
    const promise = !id ? this.addData(data, record.parent) : this.set(id, data, record.parent, options);

    return await promise;
  };

  private checkRecordId = async (record: T) => {
    const id = record.id ?? this.getRecordId(record);
    if (id) {
      const found = await this.findById(id, record.parent);
      if (found) return AuthError.reject(`record with id ${id} already exists`, 402);
    }
    return Promise.resolve();
  };

  private addData = async (_data: DocumentData, parent: ModelType | undefined) => {
    const collRef = this.getCollectionReference(parent);
    const data = this.beforeSave(_data);
    const docRef = await collRef.add(data);
    const obj = this.make(data, parent);
    obj.id = docRef.id;

    return obj;
  };

  set = async (id: string, _data: DocumentData, parent: ModelType | undefined, options: SetOptions) => {
    const collRef = this.getCollectionReference(parent);
    const data = this.beforeSave(_data);
    const docRef = collRef.doc(id);
    await docRef.set(data, options);
    return this.getById(id, parent);
  };

  delete: (obj: T) => Promise<void> = async (obj) => {
    const { id } = obj;
    if (!id) return AuthError.reject('Cannot delete. Id undefined', 422);
    const docRef = this.getDocumentReference(id, obj.parent);
    await docRef.delete();
  };

  deleteGroup = (idx: string[], parent: ModelType | undefined) => {
    const collRef = this.getCollectionReference(parent);
    const { settings } = this.definition;

    const tasks = _.chunk(idx, CHUNK_SIZE).map((list) => {
      return () => {
        const batch = getDb(settings?.projectId).batch();
        list.forEach((id) => {
          const docRef = collRef.doc(id);
          batch.delete(docRef);
        });

        return batch.commit();
      };
    });

    return promiseSequential(tasks);
  };
}
