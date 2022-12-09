/* eslint-disable @typescript-eslint/no-explicit-any */
import { SortField } from '../types/query.types';
import { AnyObject, DataObject } from '../types/common';
import { ModelType } from '../types/model.types';
import { Timestamp } from '../types/firestore';

// export type Constructor = { new(...args: any[]): {} }

export type Constructor<T extends RecordModel = RecordModel> = new (data?: AnyObject, parent?: ModelType) => T;

export interface DataSyncSettings {
  table: string;
  field: string;
  sort: SortField[];
}

export interface ModelSettings {
  /**
   * Description of the model
   */
  description?: string;

  /**
   * firestore ProjectId
   */
  projectId?: string;

  /**
   * Prevent clients from setting the auto-generated ID value manually
   */
  forceId?: boolean;

  /**
   * Hides properties from response bodies
   */
  hiddenProperties?: string[];

  /**
   * Scope enables you to set a scope that will apply to every query made by the model's repository
   */
  scope?: object;

  /**
   * Specifies whether the model accepts only predefined properties or not
   */
  strict?: boolean | 'filter';

  /**
   * Specify if the model is activable
   */
  activable?: boolean;
  [name: string]: any;
}

export abstract class RecordModel implements ModelType {
  id: string | undefined;
  createdAt!: Timestamp;
  modelName!: string;
  version?: number;

  getHiddenFields: () => string[] = () => [];

  beforeSave = () => {
    /** */
  };

  getRecordId: () => string | undefined = () => undefined;

  /**
   * Serialize into a plain JSON object
   */
  // toJSON(): Object;

  /**
   * Convert to a plain object as DTO
   *
   * If `ignoreUnknownProperty` is set to false, convert all properties in the
   * model instance, otherwise only convert the ones defined in the model
   * definitions.
   *
   * See function `asObject` for each property's conversion rules.
   */
  // toObject(options?: Options): Object;
  constructor(data?: DataObject<RecordModel>, readonly parent?: ModelType | undefined) {
    // Object.assign(this, _.omit(data, 'modelName'))
  }
}
