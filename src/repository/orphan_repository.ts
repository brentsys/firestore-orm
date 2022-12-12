import { ModelType, QueryGroup } from "../types";
import { BaseRepository } from "./base_repository";

export abstract class OrphanRepository<T extends ModelType> extends BaseRepository<T> {

  constructor() {
    super(undefined)
  }

  override async getList(queryGroup: QueryGroup<T>) {
    return super.getList(queryGroup)
  }
}