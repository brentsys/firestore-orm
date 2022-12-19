/* eslint-disable @typescript-eslint/no-explicit-any */
import { ModelType } from '../types';
import { ModelSettings } from './record_model';


export interface ModelDefinitionSyntax {
  name: string;
  settings?: ModelSettings;
  updateVersion?: (record: any) => Promise<void>;
  [attribute: string]: any;
}

type nameOrSettings = string | ModelDefinitionSyntax;

export class ModelDefinition<T extends ModelType = any> {
  name: string;
  activable?= false;
  settings?: ModelSettings<T>;

  constructor(params: nameOrSettings) {
    if (typeof params === 'string') {
      this.name = params;
    } else {
      this.name = params.name;
      this.activable = !!params.settings?.activable;
      this.settings = params.settings;
    }
  }
}
