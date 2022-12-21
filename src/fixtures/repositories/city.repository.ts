import { ModelDefinition } from '../../model/model_definition';
import { Repository } from '../../repository/repository';
import { City } from '../models/city';

export class CityRepository extends Repository<City> {
  definition: ModelDefinition<City> = { name: "cities" }

}
