import { AuthError } from '../errors/auth_error';
import { ModelDefinition } from '../model';
import {
  DocumentReference,
  QueryDocumentSnapshot,
  SetOptions,
} from '../types/firestore';
import { ID, ModelType } from '../types/model.types';
import { DocumentObserver, makeQuery, QueryGroup, QueryObserver, XQG } from '../types/query.types';
import _ from 'lodash';
import promiseSequential from 'promise-sequential';
import { BaseRepository, WID } from './base_repository';
import Firebase from 'firebase/compat/app'
import debug from "debug"
import { FirestoreConverter } from '../model/firestore_converter';
import { getDb } from '../fixtures/repositories/firebase';

const dLog = debug("test:repository")

const CHUNK_SIZE = 500;

export abstract class Repository<T extends ModelType> extends BaseRepository<T> {
  abstract definition: ModelDefinition
  private _db: Firebase.firestore.Firestore | undefined

  get db(): Firebase.firestore.Firestore {
    let mDb = this._db
    if (mDb) return mDb
    mDb = getDb()
    this._db = mDb
    return mDb
  }

  private _converter: FirestoreConverter<T> | undefined = undefined
  get converter(): FirestoreConverter<T> {
    let cv = this._converter
    if (!cv) {
      cv = new FirestoreConverter<T>(this.definition)
      this._converter = cv
    }
    return cv
  }

  getCollectionReference(parentPath: string | undefined) {

    return this.db.collection(this.getCollectionPath(parentPath))
  }

  getById = async (id: ID, parentPath: string | undefined) => {
    return this.getCollectionReference(parentPath).doc(`${id}`).withConverter(this.converter).get()
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

  getSnapshot = async (queryGroup: XQG) => {
    const parent = queryGroup.parentPath ? queryGroup.parentPath : undefined
    const collRef = this.getCollectionReference(parent ?? undefined).withConverter(this.converter);
    const query = makeQuery(collRef, queryGroup)
    return query.get()
  }
  getList = async (queryGroup: XQG) => {
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
      const docSnap = await this.getCollectionReference(record.parentPath).doc(`${id}`).get()
      if (docSnap.exists) return AuthError.reject(`record with id ${id} already exists`, 402);
    }
    return Promise.resolve();
  };

  private getDocRefResult = async (docRef: DocumentReference<T>) => {
    const result = (await docRef.get()).data()
    if (!result) return Promise.reject(new Error("Failed to save data"))
    return result as WID<T>
  }

  private addData = async (record: Partial<T>) => {
    const collRef = this.getCollectionReference(record.parentPath).withConverter(this.converter)
    const data = this.beforeSave(record)
    const docRef = await collRef.add(data as T)
    return this.getDocRefResult(docRef)
  };

  private setData = async (record: Partial<T>, options: SetOptions) => {
    const docRef = this.documentReference(record)
    await docRef.set(this.beforeSave(record), options)  // collRef.doc(id).set(data, options)
    return this.getDocRefResult(docRef);
  };

  set = async (record: Partial<T> & { id: ID }, options: SetOptions) => {
    const docRef = this.documentReference(record)
    const data = await this.validateOnUpdate(this.beforeSave(record));
    await docRef.set(data, options) // docRef.set(data, options);
    return this.getById(record.id, record.parentPath);
  };

  delete: (id: ID | undefined, parentPath: string | undefined) => Promise<void> = async (id, parentPath) => {
    if (!id) return AuthError.reject("Cannot delete undefined id")
    const docRef = this.getCollectionReference(parentPath).doc(id.toString())
    return docRef.delete()
  };

  deleteRecord: (record: T) => Promise<void> = async (record) => {
    const { id } = record
    if (!id) return AuthError.reject("Cannot delete undefined ID")
    dLog("deleting", this.documentReference(record).path)
    return this.documentReference(record).delete()
  };

  deleteGroup = (idx: ID[], parentPath: string | undefined) => {
    const collRef = this.getCollectionReference(parentPath);

    const tasks = _.chunk(idx, CHUNK_SIZE).map((list) => {
      return () => {
        const batch = this.db.batch()
        list.forEach((_id) => {
          batch.delete(collRef.doc(_id.toString()));
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
    const path = [this.getCollectionPath(record.parentPath), record.id].join("/")

    return this.db.doc(path).withConverter(this.converter)
  }

  onSnapshot = (queryGroup: QueryGroup, observer: QueryObserver<T>) => {
    const collRef = this.getCollectionReference(queryGroup.parentPath ?? undefined)
    const query = makeQuery(collRef.withConverter(this.converter), queryGroup)
    return query.onSnapshot({
      ...observer,
      next: (snap) => {
        if (observer.next) observer.next(snap.docChanges())
      }
    })
  }

  onDocumentSnapshot = (record: T, observer: DocumentObserver<T>) => {
    const docRef = this.documentReference(record)

    return docRef.onSnapshot(observer)
  }


}
