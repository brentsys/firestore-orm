
import { ModelType } from "../types";
import debug from "debug";
import { ModelDefinition } from "../model/model_definition";
import _ from 'lodash'
import { DocumentData, FirestoreDataConverter, QueryDocumentSnapshot, SnapshotOptions } from "firebase/firestore";

const dLog = debug("orm:firestore_converter")

export class ClientConverter<T extends ModelType> implements FirestoreDataConverter<T> {

  private transientFields: string[]
  postInit?: (model: T) => void

  constructor(definition?: ModelDefinition) {
    this.transientFields = definition?.settings?.transientProperties ?? []
    this.postInit = definition?.settings?.postInit
  }

  // public toFirestore(modelObject: T): DocumentData;
  // public toFirestore(modelObject: Partial<T>, options: SetOptions): DocumentData;
  public toFirestore(modelObject: unknown, options?: unknown): DocumentData {
    const data: DocumentData = modelObject as DocumentData
    if (options && Object.keys(options).length) {
      dLog("options ", options, " not yet implemented")
    }
    const transients = _.uniq(_.concat(["id", "collectionPath"], this.transientFields))
    dLog("==> transients = ", transients)

    return _.omit(data, transients)
  }
  fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>, options?: SnapshotOptions | undefined): T {
    if (!snapshot.exists) throw new Error("Snapshop does not exists!")
    if (options && Object.keys(options).length) {
      dLog("SnapshotOptions", options, "not implemented here", Object.keys(options))
    }
    const record = snapshot.data() as T
    const parentPath = snapshot.ref.path.split("/").slice(0, -2).join("/")
    const { id } = snapshot
    const model = parentPath ? { ...record, id, parentPath } : { ...record, id }
    if (this.postInit) this.postInit(model)

    return model
  }

}