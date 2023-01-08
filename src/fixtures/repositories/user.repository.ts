import { RestRepository } from '../../repository/rest_repository';
import { User } from '../models/user';
import { getRestDefinition } from './firebase';

export class UserRepository extends RestRepository<User, Partial<User>> {
  formConverter(data: Partial<User>): Promise<Partial<User>> {
    return Promise.resolve(data)
  }

  constructor() {
    super(getRestDefinition("users"))
  }

}
