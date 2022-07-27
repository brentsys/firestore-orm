import { RecordModel } from "../model";
import { ModelCreator } from "./model_creator";
export type CreatorFn<Q extends RecordModel> = (req: any) => ModelCreator<Q>