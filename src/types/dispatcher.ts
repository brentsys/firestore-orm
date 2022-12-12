import { HttpMethods } from "../model"
import { DocumentData, SetOptions } from "./firestore"
import { ModelType } from "./model.types"
import { QueryGroup } from "./query.types"

type Body = DocumentData // { [key: string]: any };

export interface DispatchSpecs<T extends ModelType> {
  method: HttpMethods
  query: QueryGroup<T>
  data?: Body
  id?: string
  options?: SetOptions
}
