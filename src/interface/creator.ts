import { RecordModel, ModelCreator } from "../record_model";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CreatorFn<Q extends RecordModel> = (req: any) => ModelCreator<Q>