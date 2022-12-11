import { ModelType } from '../../types/model.types';

export interface User extends ModelType {
  name: string
  email: string
  gender: string
  status: string
}
