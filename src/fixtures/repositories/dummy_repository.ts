import { ModelDefinition } from '../../model/model_definition';
import { OrphanRepository } from '../../repository/orphan_repository';
import { Dummy } from '../models/dummy';

const dummyDefinition: ModelDefinition = { name: 'dummies' };

export class DummyRepository extends OrphanRepository<Dummy> {
  definition = dummyDefinition

  override getRecordId: (obj: Dummy) => string | undefined = (obj) => obj.name;
}
