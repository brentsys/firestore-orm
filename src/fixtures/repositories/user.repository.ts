import { ModelDefinition } from '../../model/model_definition';
import { OrphanRepository } from '../../repository/orphan_repository';
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

export class UserRepository extends OrphanRepository<User> {
  definition = userDefinition

  constructor() {
    super()
  }


}
