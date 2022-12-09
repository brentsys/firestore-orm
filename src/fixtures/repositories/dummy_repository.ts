import { ModelDefinition } from "../../record_model";
import { Repository } from "../../repository";
import { Dummy } from "../models/dummy";

const dummyDefinition: ModelDefinition = { name: "dummies" }

export class DummyRepository extends Repository<Dummy>{
  constructor() {
    super(dummyDefinition)
  }

  override getRecordId: (obj: Dummy) => string | undefined = (obj) => obj.name

}