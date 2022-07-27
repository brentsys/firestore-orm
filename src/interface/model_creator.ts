import { DocumentPath } from "../model/document_path"
import { RecordModel } from "../model/record_model"
import { RecordType } from "../model/record_type"

export interface ModelCreator<Q extends RecordModel> {
  recordType(): RecordType
  new(type?: RecordType, reference?: DocumentPath | RecordModel): Q
}
