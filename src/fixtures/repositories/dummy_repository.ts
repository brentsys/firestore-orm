import { ModelDefinition } from '../../model/model_definition';
import { Repository } from '../../repository';
import { ModelType } from '../../types';
import { Dummy } from '../models/dummy';

const dummyDefinition: ModelDefinition = { name: 'dummies' };

export class DummyRepository extends Repository<Dummy> {
  definition: ModelDefinition;

  constructor(parentRepo?: Repository<ModelType>) {
    super(parentRepo);
    this.definition = dummyDefinition;
  }

  override getRecordId: (obj: Dummy) => string | undefined = (obj) => obj.name;
}
