import { ModelType } from '../../types/model.types';

export interface Device extends ModelType {
  model: string;
  size: number;
}
