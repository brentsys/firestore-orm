import { ModelDefinition } from '../../model/model_definition';
import { Repository } from '../../repository';
import { User } from '../models/user';


export const userDefinition: ModelDefinition = {
  name: 'users',
  settings: {
    restApi: {
      baseUrl: "https://gorest.co.in/public/v2/users",
      headers: {
        'Accept': "application/json",
        'Content-type': "application/json",
        'Authorization': `Bearer ${process.env.gorest_access_token}`
      }
    }
  }
};

export class UserRepository extends Repository<User> {
  definition: ModelDefinition;

  constructor() {
    super(undefined);
    this.definition = userDefinition;
  }

}
