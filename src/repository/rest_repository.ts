import { ModelSettings, RestApiSetting } from "../model";
import { ModelDefinition } from "../model/model_definition";
import { ID, ModelType, XQG } from "../types";
import { BaseRepository, WID } from "./base_repository";
import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios'
import { AuthError } from "../errors/auth_error";
import debug from 'debug'
import firebase from "firebase/compat";
import { notEmpty } from "../utils";

const dLog = debug("test:rest-repository")

export type RestDefinition = ModelDefinition & { settings: ModelSettings & { restApi: RestApiSetting } }

export abstract class RestRepository<T extends ModelType> extends BaseRepository<T> {
  definition: RestDefinition
  rest: AxiosInstance

  constructor(definition: RestDefinition) {
    super()
    this.definition = definition
    const headers = definition.settings.restApi.headers ?? {}
    headers["Accept-Encoding"] = "gzip,deflate,compress"
    const restConfig = {
      baseURL: definition.settings.restApi.baseUrl,
      headers,
    }
    this.rest = axios.create(restConfig)
  }

  private processCollectionPath<Q>(record: Q, parent: string | null | undefined) {
    if (record instanceof Array) {
      (record as T[]).forEach(rec => this.addCollectionPath(rec, parent))
    } else if (record && typeof record === "object") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.addCollectionPath(record as any as WID<T>, parent)
    }
  }

  addCollectionPath(record: T, parent: string | null | undefined) {
    if (parent) record.parentPath = parent
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  processAxios = <Q>(promise: Promise<AxiosResponse<Q>>, parent: string | null | undefined) => {
    return promise
      .then(resp => {
        const data = resp.data
        this.processCollectionPath(data, parent)
        return Promise.resolve(data)
      })
      .catch(error => {
        if (error instanceof AxiosError) {
          dLog("error on request", error.request.path)
          return Promise.reject(error)
        } else if (error instanceof Error) {
          dLog(`Error: ${error.message}`, error)
          return AuthError.reject(error.message, 422)
        } else {
          dLog("got unexpected error", error)
          return AuthError.reject(error)
        }
      })
  }

  getUrl(parentPath: string | null | undefined, id?: ID) {
    return "/" + this.getRelativeUrl(parentPath, id)
  }

  getRelativeUrl(parentPath: string | null | undefined, id?: ID) {
    const collPath = this.getCollectionPath(parentPath ?? undefined)
    return [collPath, id].filter(notEmpty).join("/")
  }

  getList: (queryGroup: XQG) => Promise<WID<T>[]> = async (qg) => {
    dLog(`parent path = '${qg.parentPath}'`)
    const url = this.getUrl(qg.parentPath)
    dLog("getting list", url)
    const request = this.rest.get<WID<T>[]>(url)
    return this.processAxios(request, qg.parentPath)
  }

  getById: (id: ID, parent: string | undefined) => Promise<WID<T>> = (id, parent) => {
    const request = this.rest.get<WID<T>>(this.getUrl(parent, id))
    return this.processAxios(request, parent)
  }

  add: (record: T) => Promise<T & { id: ID }> = async (record) => {
    dLog("record to save = ", record)
    const data = await this.validateOnCreate(this.beforeSave(record));
    const parent = record.parentPath
    dLog("add url = ", this.getUrl(parent))
    const request = this.rest.post<T & { id: ID }>(this.getUrl(parent), data)
    return this.processAxios(request, parent)
  }

  override set: (record: Partial<T> & { id: ID }, options: firebase.firestore.SetOptions) => Promise<T & { id: ID }> = async (record) => {
    const data = await this.validateOnCreate(this.beforeSave(record));
    const id = record.id
    const parent = record.parentPath
    const request = this.rest.post<T & { id: ID }>(this.getUrl(parent, id), data)
    return this.processAxios(request, parent)
  }

  delete: (id: ID, parent: string | undefined) => Promise<void> = (id, parent) => {
    const url = this.getUrl(parent, id)
    dLog("deleting", url)
    const request = this.rest.delete<void>(url)
    return this.processAxios(request, parent)
  }

  deleteRecord: (record: T) => Promise<void> = (record) => {
    const url = "/" + this.getDocumentPath(record)
    dLog("delete url = ", url)
    const request = this.rest.delete<void>(url)
    return this.processAxios(request, null)
  }

  deleteGroup: (idx: ID[], parent: string | undefined) => Promise<unknown> = async (idx, parent) => {
    const promises = idx.map(id => this.delete(id, parent))
    return Promise.all(promises)
  }
}