import { ModelDefinition } from "../model";
import { BaseQueryGroup, ID, ModelType, QueryGroup } from "../types";
import { SetOptions } from "../types/request";
import _ from "lodash"


export type WID<Q extends ModelType> = Q & { id: ID }

export abstract class BaseRepository<T extends ModelType, Input = Partial<T>> {
  abstract definition: ModelDefinition;
  abstract qg: QueryGroup<T>
  abstract formConverter(data: Input): Partial<T>
  abstract deleteRecord(record: T, token?: string | undefined): Promise<void>
  abstract deleteGroup(idx: ID[], parentPath: string | undefined, token?: string | undefined): Promise<unknown>
  abstract delete(id: ID, parentPath: string | undefined, token?: string | undefined): Promise<void>
  abstract set(data: Input & { id: ID }, options: SetOptions, token?: string | undefined): Promise<WID<T>>
  abstract add(data: Input, token?: string | undefined): Promise<WID<T>>
  abstract getById(id: ID, parentPath: string | undefined, token?: string | undefined): Promise<WID<T>>
  abstract getList(queryGroup: BaseQueryGroup, token?: string | undefined): Promise<WID<T>[]>

  makeQueryGoup(qg: QueryGroup<T>): BaseQueryGroup {
    const parentPath = this.qg.parentPath ?? qg.parentPath
    const queries = _.concat(qg.queries ?? [], this.qg.queries ?? [])
    const sorts = _.concat(qg.sorts ?? [], this.qg.sorts ?? [])
    const limit = qg.limit ?? this.qg.limit
    const newQG = { ...qg, parentPath, sorts, limit }
    if (queries.length > 0) newQG.queries = queries

    return newQG
  }

  getCollectionPath(parentPath: string | undefined) {
    return parentPath ? [parentPath, this.definition.name].join("/") : this.definition.name
  }

  getDocumentPath(record: T) {
    return [this.getCollectionPath(record._parentPath), record.id].join("/")

  }


  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected getRecordId(model: Partial<T>): string | undefined {
    return undefined
  }

  protected beforeSave(data: Partial<T>) {
    return data
  }

  protected async validateOnCreate(data: Partial<T>) {
    return data
  }

  protected async validateOnUpdate(data: Partial<T>) {
    return data
  }

}