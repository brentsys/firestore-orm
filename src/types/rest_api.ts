import { AnyObject } from "./common";
import { QueryGroup } from "./query.types";

export type HttpMethods = "GET" | "PUT" | "POST" | "PATCH" | "DELETE"

type AxiosHeaderValue = string | string[] | number | boolean | null;
type RawAxiosHeaders = Record<string, AxiosHeaderValue>;

export interface RestApiSetting {
  baseUrl: string,
  headers?: RawAxiosHeaders
  methods?: HttpMethods[]
  filterPrefix?: string
  paramSerialization?: (qg: QueryGroup) => string | AnyObject
}