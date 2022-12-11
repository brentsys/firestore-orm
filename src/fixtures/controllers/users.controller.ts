import { RecordModelController } from '../../controller/record_model.controller';
import { User } from '../models/user';
import { UserRepository } from '../repositories/user.repository';

export class UsersController extends RecordModelController<User> {
  repo = new UserRepository();
}
