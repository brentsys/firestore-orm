import { Dummy } from "../models/dummy"
import RecordModelController from "../../controller/record_model.controller"
import { DummyRepository } from "../repositories/dummy_repository"

export class DummyController extends RecordModelController<Dummy> {
  repo = new DummyRepository()

}