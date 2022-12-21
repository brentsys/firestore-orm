/* eslint-disable @typescript-eslint/no-explicit-any */
import { SortField } from '../types/query.types';
import { AnyObject, DataObject } from '../types/common';
import { ModelType } from '../types/model.types';
import { Timestamp } from '../types/firestore';
import { RestApiSetting } from '../types/rest_api';

// export type Constructor = { new(...args: any[]): {} }

export type Constructor<T extends RecordModel = RecordModel> = new (data?: AnyObject, parent?: ModelType) => T;

export interface DataSyncSettings {
  table: string;
  field: string;
  sort: SortField[];
}

export interface ModelSettings<T extends ModelType = any> {
  /**
   * Description of the model
   */
  description?: string;

  /**
   * firestore ProjectId
   */
  projectId?: string;

  /**
   * Rest Api
   */
  restApi?: RestApiSetting
  /**
   * Hides properties from response bodies
   */
  hiddenProperties?: string[];

  /**
   * * Transient properties not saved id database
   */
  transientProperties?: string[];

  /**
   *  post init function
   */
  postInit?: (model: T) => void
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


  getRecordId: () => string | undefined = () => undefined;


  constructor(data?: DataObject<RecordModel>, readonly parent?: ModelType | undefined) {

  }
}
