/* eslint-disable @typescript-eslint/no-explicit-any */
import { FIREBASE_CUSTOM } from "../constants";
import admin from 'firebase-admin'
import _ from 'lodash';
import { QueryFilter, QueryGroup, toQueryGroup } from "../types/query.types";
import { AuthError } from "../auth_error";
import { Repository } from "../repository";
import { ModelType } from "../types/model.types";


const removedKeys = ["modelType", "errors", "collectionPath", "context"]

type Body = { [key: string]: any }

export default abstract class RecordModelController<Q extends ModelType> {

  abstract repo: Repository<Q>

  protected getParent: () => ModelType | undefined = () => undefined

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

  getFilters(req: any): Promise<QueryGroup> {
    const json = req.query?.filter as string | undefined
    if (!json) return Promise.resolve({})
    const filter = JSON.parse(json) as QueryFilter
    return Promise.resolve(toQueryGroup(filter))
  }

  setSt: (req: any) => void = () => {
    return
  }

  notFound(error?: [number, string]) {
    if (error === undefined) error = [404, 'Not found']
    return Promise.reject(new AuthError(error[0], error[1]));
  }

  process(req: any) {
    return this.preProcess(req)
      .then(() => {
        this.setSt(req)
        switch (req.method) {
          case "POST":
            return this.post(req)
          case "GET":
            return this.get(req)
          case "PUT":
            return this.put(req)
          case "DELETE":
            return this.del(req)
          default:
            return AuthError.reject("Not found", 404)
        }
      })
      .then(res => Promise.resolve(this.sanitize(res)))
  }

  preProcess: (req: any) => Promise<any> = () => {
    return Promise.resolve()
  }

  get(req: any): Promise<Q | Q[]> {
    if (req.params.id === undefined) return this.getList(req)
    return this.getSingle(req.params.id, req)
  }

  // req? is kept here for backward compatibility issue
  getSingle: (id: string, req?: any) => Promise<Q> = (id) => {
    return this.repo.getById(id, this.getParent())
  }

  getList: (req: any) => Promise<Q[]> = async (req) => {
    const qg: QueryGroup = await this.getFilters(req)
    if (this.getParent()) qg.parent = this.getParent()
    return this.repo.getList(qg)
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

  protected async post(req: any): Promise<Q> {
    const data = await this.getPostData(req)
    return this.repo.add(data, this.getParent())
  }

  protected async put(req: any): Promise<Q> {
    const data = this.getUpdatableData(req)
    const parent = this.getParent()
    const { id } = req.params
    return this.repo.set(id, data, parent, { merge: true })
  }

  protected del: (req: any) => Promise<any> = () => {
    return this.notFound()
  }

}