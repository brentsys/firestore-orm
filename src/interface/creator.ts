import { ModelCreator, RecordModel } from "../model";
export type CreatorFn<Q extends RecordModel> = (req: any) => ModelCreator<Q>