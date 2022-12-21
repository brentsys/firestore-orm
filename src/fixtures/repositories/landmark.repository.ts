import { ModelDefinition } from "../../model";
import { Repository } from "../../repository";
import { Landmark } from "../models/landmark";

export class LandmarkRepository extends Repository<Landmark> {
  definition: ModelDefinition<Landmark> = { name: "landmarks" }

}
