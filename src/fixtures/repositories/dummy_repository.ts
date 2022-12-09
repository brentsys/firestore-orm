import { ModelDefinition } from '../../model/model_definition';
import { Repository } from '../../repository';
import { Dummy } from '../models/dummy';

const dummyDefinition: ModelDefinition = { name: 'dummies' };

export class DummyRepository extends Repository<Dummy> {
  constructor() {
    super(dummyDefinition);
  }

  override getRecordId: (obj: Dummy) => string | undefined = (obj) => obj.name;
}
