import { ModelDefinition } from "../model";
import { ID, ModelType, XQG } from "../types";
import { SetOptions } from "../types/firestore";

export type WID<Q extends ModelType> = Q & { id: ID }

export abstract class BaseRepository<T extends ModelType> {
  abstract definition: ModelDefinition;
  abstract deleteRecord: (record: T) => Promise<void>
  abstract deleteGroup: (idx: ID[], parentPath: string | undefined) => Promise<unknown>
  abstract delete: (id: ID, parentPath: string | undefined) => Promise<void>
  abstract set: (record: Partial<T> & { id: ID }, options: SetOptions) => Promise<WID<T>>
  abstract add: (record: T) => Promise<WID<T>>
  abstract getById: (id: ID, parentPath: string | undefined) => Promise<WID<T>>
  abstract getList: (queryGroup: XQG) => Promise<WID<T>[]>

  getCollectionPath = (parentPath: string | undefined) =>
    parentPath ? [parentPath, this.definition.name].join("/") : this.definition.name

  getDocumentPath = (record: T) =>
    [this.getCollectionPath(record.parentPath), record.id].join("/")


  protected getRecordId: (obj: ModelType) => string | undefined = () => {
    return undefined;
  };

  protected beforeSave = (data: Partial<T>) => {
    return data
  };

  protected validateOnCreate = async (data: Partial<T>) => {
    return data
  }

  protected validateOnUpdate = async (data: Partial<T>) => {
    return data
  }

}