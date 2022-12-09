import { ModelType } from '../types/model.types';
import { RecordModel } from './record_model';

export class BaseModel extends RecordModel {
  constructor(couple: [string, string], parent: ModelType | undefined) {
    super(undefined, parent);
    Object.assign(this, { modelName: couple[0], id: couple[1] });
  }
}
