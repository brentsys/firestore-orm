import { ModelSettings } from "../model";
import { ModelDefinition } from "../model/model_definition";
import { ID, ModelType, QueryGroup } from "../types";
import { BaseRepository, WID } from "./base_repository";
import axios, { AxiosInstance, AxiosError, AxiosResponse, AxiosRequestConfig } from 'axios'
import { AuthError } from "../errors/auth_error";
import debug from 'debug'
import { notEmpty } from "../utils";
import { RestApiSetting } from "../types/rest_api";
import { SetOptions } from "../types/request";

const dLog = debug("test:rest-repository")

type AxiosHeaderValue = string | string[] | number | boolean | null;
type RawAxiosHeaders = Record<string, AxiosHeaderValue>;


export type RestDefinition = ModelDefinition & { settings: ModelSettings & { restApi: RestApiSetting } }

export abstract class RestRepository<T extends ModelType, Input = Partial<T>> extends BaseRepository<T, Input> {
  definition: RestDefinition
  rest: AxiosInstance
  qg: QueryGroup<T> = {}

  constructor(definition: RestDefinition) {
    super()
    this.definition = definition
    const headers: RawAxiosHeaders = definition.settings.restApi.headers ?? {}
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
    if (parent) record._parentPath = parent
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async processAxios<Q>(promise: Promise<AxiosResponse<Q>>, parent: string | null | undefined) {
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

  getAuthConfig(token: string | undefined): AxiosRequestConfig | undefined {
    return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  }


  async getList(queryGroup: QueryGroup, token?: string | undefined): Promise<WID<T>[]> {
    dLog(`parent path = '${queryGroup.parentPath}'`)
    const url = this.getUrl(queryGroup.parentPath)
    dLog("getting list", url)
    const request = this.rest.get<WID<T>[]>(url, this.getAuthConfig(token))
    return this.processAxios(request, queryGroup.parentPath)
  }

  async getById(id: ID, parent: string | undefined, token?: string | undefined): Promise<WID<T>> {
    const request = this.rest.get<WID<T>>(this.getUrl(parent, id), this.getAuthConfig(token))
    return this.processAxios(request, parent)
  }

  async add(input: Input, token?: string | undefined): Promise<T & { id: ID }> {
    const record = this.formConverter(input)
    dLog("record to save = ", record)
    const data = await this.validateOnCreate(this.beforeSave(record));
    const parent = record._parentPath
    dLog("add url = ", this.getUrl(parent))
    const request = this.rest.post<T & { id: ID }>(this.getUrl(parent), data, this.getAuthConfig(token))
    return this.processAxios(request, parent)
  }

  override async set(input: Input & { id: ID }, options: SetOptions, token?: string | undefined): Promise<T & { id: ID }> {
    const record = this.formConverter(input)
    const data = await this.validateOnCreate(this.beforeSave(record));
    const id = record.id
    const parent = record._parentPath
    const fn = options.merge ? this.rest.patch : this.rest.post
    const request = fn<T & { id: ID }>(this.getUrl(parent, id), data, this.getAuthConfig(token))
    return this.processAxios(request, parent)
  }
  async put(input: Input & { id: ID }, token?: string | undefined): Promise<T & { id: ID }> {
    const record = this.formConverter(input)
    const data = await this.validateOnUpdate(this.beforeSave(record))
    const id = record.id
    const parent = record._parentPath
    const request = this.rest.put(this.getUrl(parent, id), data, this.getAuthConfig(token))
    return this.processAxios(request, parent)
  }

  override async delete(id: ID, parent: string | undefined, token?: string | undefined): Promise<void> {
    const url = this.getUrl(parent, id)
    dLog("deleting", url)
    const request = this.rest.delete<void>(url, this.getAuthConfig(token))
    return this.processAxios(request, parent)
  }

  async deleteRecord(record: T, token?: string | undefined): Promise<void> {
    const url = "/" + this.getDocumentPath(record)
    dLog("delete url = ", url)
    const request = this.rest.delete<void>(url, this.getAuthConfig(token))
    return this.processAxios(request, null)
  }

  async deleteGroup(idx: ID[], parent: string | undefined, token?: string | undefined): Promise<unknown> {
    const promises = idx.map(id => this.delete(id, parent, token))
    return Promise.all(promises)
  }
}