import { ModelDefinition } from "../model";
import { BaseQueryGroup, ID, ModelType } from "../types";
import { SetOptions } from "../types/request";


export type WID<Q extends ModelType> = Q & { id: ID }

export abstract class BaseRepository<T extends ModelType> {
  abstract definition: ModelDefinition;
  abstract deleteRecord(record: T, token?: string | undefined): Promise<void>
  abstract deleteGroup(idx: ID[], parentPath: string | undefined, token?: string | undefined): Promise<unknown>
  abstract delete(id: ID, parentPath: string | undefined, token?: string | undefined): Promise<void>
  abstract set(record: Partial<T> & { id: ID }, options: SetOptions, token?: string | undefined): Promise<WID<T>>
  abstract add(record: T, token?: string | undefined): Promise<WID<T>>
  abstract getById(id: ID, parentPath: string | undefined, token?: string | undefined): Promise<WID<T>>
  abstract getList(queryGroup: BaseQueryGroup, token?: string | undefined): Promise<WID<T>[]>

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