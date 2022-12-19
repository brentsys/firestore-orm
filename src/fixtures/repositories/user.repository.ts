import { RestRepository } from '../../repository/rest_repository';
import { User } from '../models/user';
import { getRestDefinition } from './firebase';

export class UserRepository extends RestRepository<User> {

  constructor() {
    super(getRestDefinition("users"))
  }

}
