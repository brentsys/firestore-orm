import { AuthError } from '../errors/auth_error';
import { ModelDefinition } from '../model';
import { ID, ModelType } from '../types/model.types';
import _ from 'lodash';
import promiseSequential from 'promise-sequential';
import { BaseRepository, WID } from '../repository/base_repository';
import debug from "debug"
import Firebase from 'firebase/compat/app'
import {
  collection,
  doc, getDoc, QueryDocumentSnapshot, onSnapshot, getDocs,
  SetOptions, DocumentReference, addDoc, setDoc, deleteDoc, writeBatch
} from 'firebase/firestore'
import { ClientConverter } from './client_converter';
import { DocumentObserver, makeQuery, QueryGroup, QueryObserver } from './client.query.types';
import { FirebaseConfig } from '../config';

const dLog = debug("test:client:repository")

const CHUNK_SIZE = 500;

export abstract class ClientRepository<T extends ModelType> extends BaseRepository<T> {
  abstract definition: ModelDefinition

  get db(): Firebase.firestore.Firestore {
    return FirebaseConfig.getDb()
  }

  private _converter: ClientConverter<T> | undefined = undefined
  get converter(): ClientConverter<T> {
    let cv = this._converter
    if (!cv) {
      cv = new ClientConverter<T>(this.definition)
      this._converter = cv
    }
    return cv
  }

  getCollectionReference(parentPath: string | undefined) {

    return collection(this.db, this.getCollectionPath(parentPath))
  }

  getById = async (id: ID, parentPath: string | undefined) => {
    const docRef = doc(this.db, this.getCollectionPath(parentPath), `${id}`).withConverter(this.converter)
    return getDoc(docRef)
      .then((snap) => {
        const record = snap.data()
        return record
          ? Promise.resolve(record as WID<T>)
          : AuthError.reject(`Record not found (${snap.ref.path})`, 404);
      });
  };

  findById = async (id: string, parentPath: string | undefined) => {
    return this.getById(id, parentPath).catch(() => Promise.resolve(undefined));
  };

  fromQuerySnap: (doc: QueryDocumentSnapshot<T>) => WID<T> = (_doc) => {
    const data = _doc.data() || {}
    data.id = _doc.id;
    return data as WID<T>;
  };

  getSnapshot = async (queryGroup: QueryGroup<T>) => {
    const parent = queryGroup.parentPath ? queryGroup.parentPath : undefined
    const collRef = this.getCollectionReference(parent ?? undefined).withConverter(this.converter);
    const q = makeQuery(collRef, queryGroup)
    return getDocs(q)
  }
  getList = async (queryGroup: QueryGroup<T>) => {
    const snapshot = await this.getSnapshot(queryGroup)
    return snapshot.docs.map(this.fromQuerySnap);
  }

  add = async (_data: T) => {
    const data = await this.validateOnCreate(this.beforeSave(_data));
    await this.checkRecordId(data);
    return this.save(data);
  };

  save = async (record: Partial<T>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const id = record.id ?? this.getRecordId(record);
    dLog("saving with id", id)
    const options: SetOptions = { merge: !!record.id };
    const data = record;
    const promise = !id ? this.addData(data) : this.setData(data, options);

    return await promise;
  };

  private checkRecordId = async (record: Partial<T>) => {
    const id = record.id ?? this.getRecordId(record);
    if (id) {
      const docSnap = await getDoc(this.documentReference(record))
      if (docSnap.exists()) return AuthError.reject(`record with id ${id} already exists`, 402);
    }
    return Promise.resolve();
  };

  private getDocRefResult = async (docRef: DocumentReference<T>) => {
    const result = (await getDoc(docRef)).data()
    if (!result) return Promise.reject(new Error("Failed to save data"))
    return result as WID<T>
  }

  private addData = async (record: Partial<T>) => {
    const collRef = this.getCollectionReference(record.parentPath).withConverter(this.converter)
    const data = this.beforeSave(record) as T
    const docRef = await addDoc(collRef, data)
    return this.getDocRefResult(docRef)
  };

  private setData = async (record: Partial<T>, options: SetOptions) => {
    const docRef = this.documentReference(record).withConverter(this.converter)
    const data = this.beforeSave(record) as T
    await setDoc(docRef, data, options)  // docRef.set(this.beforeSave(record), options)  // collRef.doc(id).set(data, options)
    return this.getDocRefResult(docRef);
  };

  set = async (record: Partial<T> & { id: ID }, options: SetOptions) => {
    const docRef = this.documentReference(record).withConverter(this.converter)
    const data = await this.validateOnUpdate(this.beforeSave(record)) as T
    await setDoc(docRef, data, options)
    return this.getById(record.id, record.parentPath);
  };

  delete: (id: ID | undefined, parentPath: string | undefined) => Promise<void> = async (id, parentPath) => {
    const record = { id, parentPath } as T
    return this.deleteRecord(record)
  };

  deleteRecord: (record: T) => Promise<void> = async (record) => {
    const { id } = record
    if (!id) return AuthError.reject("Cannot delete undefined ID")
    dLog("deleting", this.documentReference(record).path)
    return deleteDoc(this.documentReference(record))
  };

  deleteGroup = (idx: ID[], parentPath: string | undefined) => {
    const tasks = _.chunk(idx, CHUNK_SIZE).map((list) => {
      return () => {
        const batch = writeBatch(this.db)
        list.forEach((_id) => {
          const docRef = this.documentReference({ id: _id, parentPath } as Partial<T>)
          batch.delete(docRef);
        });

        return batch.commit();
      };
    });

    return promiseSequential(tasks);
  };
  fromQueryDoc(_doc: QueryDocumentSnapshot): T {

    return this.converter.fromFirestore(_doc)
  }

  documentReference = (record: Partial<T>) => {
    const id = `${record.id}`
    return doc(this.getCollectionReference(record.parentPath), id)
  }

  onSnapshot = (queryGroup: QueryGroup<T>, observer: QueryObserver<T>) => {
    const collRef = this.getCollectionReference(queryGroup.parentPath ?? undefined).withConverter(this.converter)
    const q = makeQuery<T>(collRef, queryGroup)
    onSnapshot(q, {
      ...observer,
      next: (snap) => {
        if (observer.next) observer.next(snap.docChanges())
      }
    })
  }

  onDocumentSnapshot = (record: T, observer: DocumentObserver<T>) => {
    const docRef = this.documentReference(record).withConverter(this.converter)

    return onSnapshot(docRef, observer)
  }
}
