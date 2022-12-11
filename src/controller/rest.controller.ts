/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpMethods, RestApiSetting } from "../model/record_model";
import { QueryGroup } from "../types";
import { DocumentData, SetOptions } from "../types/firestore";
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios'
import { AuthError } from "../errors";
import debug from 'debug'
import { notEmpty } from "../utils";

const dLog = debug("test:rest")


type Body = DocumentData // { [key: string]: any };

export interface DispatchSpecs {
  method: HttpMethods
  query?: QueryGroup
  data?: Body
  id?: string
  options?: SetOptions
}


export class RestController {
  rest: AxiosInstance

  constructor(readonly settings: RestApiSetting | undefined) {
    const restConfig = {
      baseURL: settings?.baseUrl,
      headers: settings?.headers
    }
    this.rest = axios.create(restConfig)
  }

  toAxiosConfig: <T>(specs: DispatchSpecs) => AxiosRequestConfig<T> = <T>(specs: DispatchSpecs) => {
    const serializer = this.settings?.paramSerialization
    const { id, data } = specs
    dLog("specs =>", specs)
    const config: AxiosRequestConfig<T> = {
      method: specs.method
    }
    if (data) config.data = data as T
    config.url = ["/", id].filter(notEmpty).join("")
    const qg = specs.query
    if (qg) {
      if (serializer) {
        const params = serializer(qg)
        if (typeof params === 'string') config.url = [config.url, serializer(qg)].join("?")
        else config.params = params
      }
    }
    dLog("config  = ", config)
    return config
  }

  canProcess: (method: HttpMethods) => boolean = (method) => {
    if (!this.settings) return false
    const { methods } = this.settings
    return !methods || methods.includes(method)
  }

  process: <T>(specs: DispatchSpecs) => Promise<T> = (specs: DispatchSpecs) => {
    return this.rest.request(this.toAxiosConfig(specs))
      .then(response => {
        dLog("response:", response.data)
        return Promise.resolve(response.data)
      })
      .catch((error: AxiosError) => {
        return AuthError.reject(error.message, error.status ?? 500)
      })
      .catch((error: Error) => {
        dLog(`Error: ${error.message}`, error)
        return AuthError.reject(error.message, 422)
      })
      .catch(error => {
        dLog("got unexpected error", error)
        return AuthError.reject(error)
      })

  }
}