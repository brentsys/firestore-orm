import { ModelDefinition } from '../../model/model_definition';
import { Repository } from '../../repository/repository';
import { Dummy } from '../models/dummy';

const dummyDefinition: ModelDefinition<Dummy> = {
  name: 'dummies',
  settings: {
    postInit: (model) => {
      model.url = `http://${model.name}.platform.io`
    },
    transientProperties: ["url"]
  }
};

export class DummyRepository extends Repository<Dummy> {
  definition = dummyDefinition

  override getRecordId: (obj: Partial<Dummy>) => string | undefined = (obj) => obj.name;
}
