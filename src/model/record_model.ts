
import * as admin from 'firebase-admin';
import * as _ from 'lodash';
// import { DocumentData, Timestamp } from "@google-cloud/firestore";
import { validateOrReject } from "class-validator";
import { RecordType } from "./record_type";
import { getCustomProperties } from "./utils";
import { firestore } from "firebase-admin";
import debug from 'debug'
import { DocumentPath } from "./document_path";
import { CollectionReference, DocReference, DocumentData } from "../interface/types";
import { DataModel } from "../interface/data_model";
import { IDBGroupConfig } from '../interface/idb_group_config';

const log = debug('orm:record_model');

const NotSavedKeys = ["modelType", "errors", "collectionPath"]


export abstract class RecordModel {

  /*
  protected setTimestamp(elements?: string[]) {
    if (elements === undefined) elements = ["createdAt"]
    for (let elm of elements) {
      let target = this[elm]
      if (target !== undefined && target._seconds !== undefined) {
        if (target.toMillis === undefined) {
          this[elm] = new admin.firestore.Timestamp(target._seconds, target._nanoseconds)
        }
      }
    }
  }*/

  // createdAt: admin.firestore.Timestamp
  id: string | undefined
  private errors: string[] = []
  private collectionPath: string[] = []

  protected static transient: string[] = ["errors", "collectionPath"]

  constructor(readonly modelType: RecordType, docModel?: DocumentPath | RecordModel, ...other: any) {
    const table = modelType.toString().split("::")[0]
    if (docModel === undefined) {
      this.collectionPath = [table]
    } else {
      let documentPath: DocumentPath
      if (docModel instanceof DocumentPath) {
        documentPath = docModel
        this.collectionPath = documentPath.collectionPath.concat([documentPath.id, table])
      }
      if (docModel instanceof RecordModel) {
        documentPath = docModel.getDocumentPath()
        this.collectionPath = documentPath.collectionPath.concat([documentPath.id, table])
      }
    }
  }

  protected getTransientSet(): string[] {
    return RecordModel.transient
  }

  getCollectionPath(): string[] {
    return this.collectionPath
  }

  collection(cfg: IDBGroupConfig): CollectionReference {
    return this.getDocumentPath().getCollectionReference(cfg)
  }

  getDocumentRef(cfg: IDBGroupConfig): DocReference {
    return this.getDocumentPath().getDocumentRef(cfg)
  }

  getDocumentPath(): DocumentPath {
    const id = this.id || "N_A"
    if (this.collectionPath === undefined) this.collectionPath = []
    return new DocumentPath(id, this.collectionPath)
  }

  save<Q extends RecordModel>(cfg: IDBGroupConfig, id?: string): Promise<Q> {
    const data = this.data();
    const customProps = getCustomProperties(data)
    if (customProps.length > 0) {
      const msg = `Firestore cannot save object that has custom properties. Concerned properties are: ${customProps.join(", ")}`
      return Promise.reject(new Error(msg))
    }
    if (this.id === undefined || this.id === "new") {
      return this.newRecord(data, cfg)
    } else {
      return this.updateData(data, cfg)
    }
  }

  set(cfg: IDBGroupConfig, data: DocumentData): Promise<void> {
    return (this.getDocumentRef(cfg) as any).set(data, { merge: true })
  }

  validate(model: any): Promise<any> {
    return validateOrReject(model)
    /*
    return validate(model)
      .then(errors => {
        if (errors.length > 0) {
          let msg = errors.map(err => Object.keys(err.constraints).map(key => err.constraints[key]).join(", ")).join(", ")
          return Promise.reject(new Error(msg))
        }
        return Promise.resolve(model)
      })*/
  }

  data(): admin.firestore.DocumentData {
    const attributes = Object.keys(this)
    const docData: firestore.DocumentData = {}
    const reducer = (acc: any, key: any) => {
      if (this.getTransientSet().indexOf(key) < 0) acc[key] = _.get(this, key) // this[key]
      return acc
    }
    const result = attributes.reduce(reducer, docData)
    NotSavedKeys.forEach(x => delete result[x])
    return result
  }

  delete(cfg: IDBGroupConfig): Promise<any> {
    if (!this.id) return Promise.reject("cannot delete without I")
    const docRef = this.collection(cfg).doc(this.id) as any
    return this.beforeDelete(cfg)
      .then(() => {
        return docRef.delete()
      })
      .then(res => {
        return this.afterDelete(cfg, res)
      })
  }

  reload<T extends RecordModel>(cfg: IDBGroupConfig): Promise<T> {
    return (this.getDocumentRef(cfg) as any).get()
      .then((docRef: any) => {
        if (!docRef.exists) return Promise.reject(new Error("Record not found"))
        this.assign(docRef.data())
        return Promise.resolve(this)
      })
  }

  assign(data: DataModel | DocumentData) {
    _.assign(this, data)
    /*
    for (var key of Object.keys(data)) {
      this[key] = data[key]
    }
    return*/
  }

  protected beforeCreate(cfg: IDBGroupConfig, data: DocumentData): Promise<DocumentData> {
    return Promise.resolve(data)
  }

  protected beforeUpdate(cfg: IDBGroupConfig, data: DocumentData): Promise<DocumentData> {
    return Promise.resolve(data)
  }

  protected beforeSave(cfg: IDBGroupConfig, data: DocumentData): Promise<DocumentData> {
    return Promise.resolve(data)
  }

  protected beforeDelete(cfg: IDBGroupConfig): Promise<RecordModel> {
    return Promise.resolve(this)
  }

  protected afterCreate<Q extends RecordModel>(cfg: IDBGroupConfig): Promise<Q> {
    const result = (this as any) as Q
    return Promise.resolve(result)
  }

  protected afterUpdate<Q extends RecordModel>(cfg: IDBGroupConfig): Promise<Q> {
    const result = (this as any) as Q
    return Promise.resolve(result)
  }

  protected afterDelete(cfg: IDBGroupConfig, result: any): Promise<any> {
    return Promise.resolve(result)
  }

  protected setRecordId(): string | undefined {
    return undefined
  }



  updateData<Q extends RecordModel>(data: DocumentData, cfg: IDBGroupConfig): Promise<Q> {
    const collection = this.collection(cfg)
    let newData: DocumentData
    return this.beforeUpdate(cfg, data)
      .then(_data => this.beforeSave(cfg, _data))
      .then(xData => {
        newData = xData
        this.assign(newData)
        return Promise.resolve(this)
      })
      .then(this.validate)
      .then(() => {
        if (!this.id) return Promise.reject("cannot update without ID")
        const docRef = collection.doc(this.id) as any
        return docRef.update(newData)
      })
      .then(() => this.afterUpdate<Q>(cfg))
  }


  protected newRecord<Q extends RecordModel>(data: DocumentData, cfg: IDBGroupConfig): Promise<Q> {
    data.createdAt = admin.firestore.Timestamp.now();
    const coll = this.collection(cfg) as any
    let id: string | undefined
    return this.beforeCreate(cfg, data)
      .then(_data => this.beforeSave(cfg, _data))
      .then(dt => {
        this.assign(dt)
        return this.validate(this)
      })
      .then(model => {
        id = this.setRecordId()
        if (id === undefined) return coll.add(model.data())
        return coll.doc(id).set(model.data())
      })
      .then(docRef => {
        this.id = (id === undefined) ? docRef.id : id
        return this.afterCreate<Q>(cfg)
      })
  }
}

export interface IdRecordModel {
  id: string
  collection(cfg: IDBGroupConfig): CollectionReference
  getCollectionPath(): string[]
}
