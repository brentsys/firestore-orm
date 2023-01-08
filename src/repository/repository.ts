import { AuthError } from '../errors/auth_error';
import { ModelDefinition } from '../model';
import {
  DocumentReference,
  QueryDocumentSnapshot,
  SetOptions,
} from '../types/firestore';
import { ID, ModelType } from '../types/model.types';
import { DocumentObserver, makeQuery, QueryGroup, QueryObserver } from '../types/query.types';
import _ from 'lodash';
import promiseSequential from 'promise-sequential';
import { BaseRepository, WID } from './base_repository';
import Firebase from 'firebase/compat/app'
import debug from "debug"
import { FirestoreConverter } from '../model/firestore_converter';
import { FirebaseConfig } from '../config';

const dLog = debug("test:repository")

const CHUNK_SIZE = 500;

export abstract class Repository<T extends ModelType, Input = Partial<T>> extends BaseRepository<T, Input> {
  abstract definition: ModelDefinition
  formConverter(data: Partial<T> | Input): Promise<Partial<T>> {
    return Promise.resolve(data as Partial<T>)
  }
  qg: QueryGroup<T> = {}

  get db(): Firebase.firestore.Firestore {
    return FirebaseConfig.getDb()
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

  getCollectionPath(parentPath?: string | undefined): string {
    const _qg = this.makeQueryGoup({ parentPath })

    return super.getCollectionPath(_qg.parentPath ?? undefined)
  }

  getCollectionReference(parentPath: string | undefined) {

    return this.db.collection(this.getCollectionPath(parentPath))
  }

  async getById(id: ID, parentPath: string | undefined) {
    return this.getCollectionReference(parentPath).doc(`${id}`).withConverter(this.converter).get()
      .then((snap) => {
        const record = snap.data()
        return record
          ? Promise.resolve(record as WID<T>)
          : AuthError.reject(`Record not found (${snap.ref.path})`, 404);
      });
  }

  async findById(id: string, parentPath: string | undefined) {
    return this.getById(id, parentPath).catch(() => Promise.resolve(undefined));
  }

  async getSnapshot(queryGroup: QueryGroup<T>) {
    const _qg = this.makeQueryGoup(queryGroup)
    const collRef = this.getCollectionReference(_qg.parentPath ?? undefined).withConverter(this.converter)
    const query = makeQuery(collRef, _qg)

    return query.get()
  }

  async getList(queryGroup: QueryGroup<T>) {
    return this.getSnapshot(queryGroup)
      .then(snaps => {
        const records = snaps.docs.map(doc => doc.data() as WID<T>)

        return Promise.resolve(records)
      })
  }

  async getGroupSnap(queryGroup: QueryGroup<T>) {
    const _qg = this.makeQueryGoup(queryGroup)
    const q0 = this.db.collectionGroup(this.definition.name).withConverter(this.converter)
    const query = makeQuery(q0, _qg)
    return query.get()
  }

  async getGroupModel(queryGroup: QueryGroup<T>) {
    const snaps = await this.getGroupSnap(queryGroup)
    return snaps.docs.map(doc => doc.data())
  }

  async add(input: Input) {
    const _data = await this.formConverter(input)
    const data = await this.validateOnCreate(this.beforeSave(_data));
    await this.checkRecordId(data);
    return this.save(data);
  }

  async save(record: Partial<T>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const id = record.id ?? this.getRecordId(record);
    dLog("saving with id", id)
    const options: SetOptions = { merge: !!record.id };
    const data = record;
    const promise = !id ? this.addData(data) : this.setData(data, options);

    return await promise;
  }

  private checkRecordId = async (record: Partial<T>) => {
    const id = record.id ?? this.getRecordId(record);
    if (id) {
      const docSnap = await this.getCollectionReference(record._parentPath).doc(`${id}`).get()
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
    const collRef = this.getCollectionReference(record._parentPath).withConverter(this.converter)
    const data = this.beforeSave(record)
    const docRef = await collRef.add(data as T)
    return this.getDocRefResult(docRef)
  };

  private setData = async (record: Partial<T>, options: SetOptions) => {
    const docRef = this.documentReference(record)
    await docRef.set(this.beforeSave(record), options)  // collRef.doc(id).set(data, options)
    return this.getDocRefResult(docRef);
  };

  async set(input: Input & { id: ID }, options: SetOptions) {
    const record = await this.formConverter(input) as WID<Partial<T>>
    const docRef = this.documentReference(record)
    const data = await this.validateOnUpdate(this.beforeSave(record));
    await docRef.set(data, options) // docRef.set(data, options);
    return this.getById(record.id, record._parentPath);
  }

  async delete(id: ID | undefined, parentPath: string | undefined): Promise<void> {
    if (!id) return AuthError.reject("Cannot delete undefined id")
    const docRef = this.getCollectionReference(parentPath).doc(id.toString())
    return docRef.delete()
  }

  async deleteRecord(record: T): Promise<void> {
    const { id } = record
    if (!id) return AuthError.reject("Cannot delete undefined ID")
    dLog("deleting", this.documentReference(record).path)
    return this.documentReference(record).delete()
  }

  deleteGroup(idx: ID[], parentPath: string | undefined) {
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
  }
  fromQueryDoc(_doc: QueryDocumentSnapshot): T {

    return this.converter.fromFirestore(_doc)
  }

  documentReference(record: Partial<T>) {
    const path = [this.getCollectionPath(record._parentPath), record.id].join("/")

    return this.db.doc(path).withConverter(this.converter)
  }

  onSnapshot(queryGroup: QueryGroup<T>, observer: QueryObserver<T>) {
    const _qg = this.makeQueryGoup(queryGroup)
    const collRef = this.getCollectionReference(queryGroup.parentPath ?? undefined)
    const query = makeQuery(collRef.withConverter(this.converter), _qg)
    return query.onSnapshot({
      ...observer,
      next: (snap) => {
        if (observer.next) observer.next(snap.docChanges())
      }
    })
  }

  onDocumentSnapshot(record: T, observer: DocumentObserver<T>) {
    const docRef = this.documentReference(record)

    return docRef.onSnapshot(observer)
  }

}
