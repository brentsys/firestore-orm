
import { QueryGroup } from '../types';
import { ModelType } from '../types/model.types';

import { BaseRepository } from './base_repository';

type PQG<T extends ModelType> = QueryGroup<T> & { parent: T }

export abstract class Repository<T extends ModelType, P extends ModelType = ModelType> extends BaseRepository<T, P> {

  constructor(protected parentRepo: BaseRepository<P>) {
    super(parentRepo)
  }

  override async getList(queryGroup: PQG<P>) {
    return super.getList(queryGroup)
  }

}
