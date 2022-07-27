import { CreatorFn } from "../interface/creator";
import { FIREBASE_CUSTOM } from "../constants";
import * as admin from 'firebase-admin'
import * as _ from 'lodash';
import { AuthError, Query, RecordModel } from "../model";
import { firestore } from "firebase-admin";
import { ModelCreator } from "../interface/model_creator";
import { DocumentPath } from "../model/document_path";
import { RecordAction } from "../model/record_action";
import { IDBGroupConfig } from "../interface/idb_group_config";

const removedKeys = ["modelType", "errors", "collectionPath", "context"]

type Body = { [key: string]: any }

export function isCreatorFn<Q extends RecordModel>(creator: ModelCreator<Q> | null | CreatorFn<Q>): creator is CreatorFn<Q> {
  return (creator as any).recordType === undefined
}

/*
export function getPostData(req: any) {
  let data = this.getData(req)
  let res = this.postRequired.reduce((acc: string[], key: string) => {
    if (data[key] === undefined) acc.push(key)
    return acc
  }, [])
  if (res.length > 0) return AuthError.reject(`Params: ${res.join(", ")} required`, 400)
  return Promise.resolve(data)
}*/

export default abstract class RecordModelController<Q extends RecordModel> {

  abstract creator: ModelCreator<Q> | null | CreatorFn<Q>

  documentPath?: DocumentPath

  postRequired: string[] = []

  protected getProtectedFields(): string[] {
    return ["id", "createdAt", "updatedAt"]
  }

  protected getPrivateFields(): string[] {
    return []
  }


  protected getFloatFields(): string[] {
    return []
  }


  protected getIntegerFields(): string[] {
    return []
  }

  st?: RecordAction<Q>

  cfg?: IDBGroupConfig

  hasFirebaseToken(req: any): boolean {
    return req.headers.from === FIREBASE_CUSTOM
  }

  protected sanitize(obj: Body | Body[]): Body | Body[] {
    if (!obj) return obj
    if (obj instanceof Array) {
      return obj.map(x => this.sanitize(x))
    } else {
      this.getPrivateFields().concat(removedKeys).forEach(x => delete obj[x])
      _.keys(obj).forEach(key => {
        if (obj[key] instanceof Object) {
          obj[key] = this.sanitize(obj[key])
        } else if (obj[key] instanceof Array) {
          obj[key] = this.sanitize(obj[key])
        }
      })
      return obj
    }
  }

  protected sanitizeTime(obj: Body | Body[]): Body | Body[] {
    function timeString(time: admin.firestore.Timestamp): string {
      return time.toDate().toLocaleString()
    }
    if (obj instanceof Array) {
      return obj.map(x => this.sanitizeTime(x))
    } else {
      const timeKeys = _.keys(obj).filter(k => obj[k] instanceof admin.firestore.Timestamp)
      timeKeys.forEach(k => obj[k] = timeString(obj[k]))
      return obj
    }
  }

  getFilters(req: any): Promise<Query[]> {
    const fields = Object.keys(req.query || {})
    const queries: Query[] = []
    fields.forEach(field => {
      const value = req.query[field]
      // console.log("value : ", value, " type: ", typeof value)
      if (typeof value === "object") {
        // does not know how to handle it for the moment
      } else if (this.getFloatFields().includes(field)) {
        queries.push(new Query(field, "==", parseFloat(value)))
      } else if (this.getIntegerFields().includes(field)) {
        queries.push(new Query(field, "==", parseInt(value, 10)))
      } else {
        queries.push(new Query(field, "==", value))
      }
    })
    return Promise.resolve(queries)
  }

  setSt(req: any): void {
    const creator = isCreatorFn(this.creator) ? this.creator(req) : this.creator
    if (!creator) return
    const st = new RecordAction(creator, this.documentPath)
    this.cfg = req.config
    st.setConfig(this.cfg!)
    this.st = st
  }

  notFound(error?: [number, string]) {
    if (error === undefined) error = [404, 'Not found']
    return Promise.reject(new AuthError(error[0], error[1]));
  }

  process(req: any) {
    // if(this.creator == null) return this.notFound([500, "creator missing on controller"])
    return this.preProcess(req)
      .then(() => {
        this.setSt(req)
        if (req.method === 'POST') return this.post(req)
        if (req.method === 'GET') return this.get(req)
        if (req.method === 'PUT') return this.put(req)
        if (req.method === 'DELETE') return this.del(req)
        return AuthError.reject("Not found", 404)
      })
      .then(res => Promise.resolve(this.sanitize(res)))
  }

  preProcess(req: any): Promise<any> {
    return Promise.resolve()
  }

  get(req: any): Promise<Q | Q[]> {
    if (req.params.id === undefined) return this.getList(req)
    return this.getSingle(req.params.id, req)
  }

  // req? is kept here for backward compatibility issue
  getSingle(id: string, req?: any): Promise<Q> {
    if (!this.st) return Promise.reject("st not set !")
    return this.st.findById(id)
  }

  private findAll(queries: Query[]): Promise<Q[]> {
    if (!this.st) return Promise.reject("controller 'st' not set")
    return this.st.findAll(queries)
  }

  getList(req: any): Promise<Q[]> {
    return this.getFilters(req)
      .then(this.findAll)
  }

  protected getData(req: any): any {
    return req.body
  }


  protected getUpdatableData(req: any): any {
    return _.omit(this.getData(req), this.getProtectedFields())
  }

  protected getPostData(req: any): Promise<any> {
    const data = this.getData(req)
    const res = this.postRequired.reduce((acc: string[], key: string) => {
      if (data[key] === undefined) acc.push(key)
      return acc
    }, [])
    if (res.length > 0) return AuthError.reject(`Params: ${res.join(", ")} required`, 400)
    return Promise.resolve(data)
  }

  protected post(req: any): Promise<Q> {
    return this.getPostData(req)
      .then(data => this.st!.setData(data))
      .then(this.beforeCreate(req))
      .then(this.beforeSave(req))
      .then(obj => obj.save<Q>(req.config))
      .then(res => Promise.resolve((res as any) as Q))
  }

  protected beforeSave(req: any): (obj: Q) => Promise<Q> {
    return (obj: Q) => Promise.resolve(obj)
  }

  protected beforeCreate(req: any): (obj: Q) => Promise<Q> {
    return (obj: Q) => {
      const fn = (obj as any).setRecordId
      if (!fn) return Promise.resolve(obj)
      const id = fn.bind(obj)()
      if (id === undefined) return Promise.resolve(obj)
      return (this.st!.getCollection(req.config).doc(id) as any).get()
        .then((docRef: firestore.DocumentSnapshot) => {
          if (docRef.exists) return AuthError.reject("Doc already exists", 400)
          return Promise.resolve(obj)
        })
    }
  }

  protected put(req: any): Promise<Q> {
    const data = this.getUpdatableData(req)
    return this.getSingle(req.params.id, req)
      .then(obj => {
        obj.assign(data)
        return obj.save(req.config)
      })
  }
  protected del(req: any): Promise<any> {
    return this.notFound()
  }

}