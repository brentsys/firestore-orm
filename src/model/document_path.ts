import { IDBGroupConfig } from "../interface/idb_group_config"
import { IDocumentPath } from "../interface/i_document_path"
import { ModelCreator } from "../interface/model_creator"
import { CollectionReference, DocReference } from "../interface/types"
import { RecordModel } from "./record_model"

export class DocumentPath implements IDocumentPath {
  constructor(public id: string, public collectionPath: string[]) {
    if (collectionPath.length % 2 === 0) throw new Error("Collection Path should have odd length")
  }

  getParentDocumentPath(): DocumentPath | undefined {
    if (this.collectionPath.length < 3) return undefined
    return new DocumentPath(this.collectionPath.slice(-2, -1)[0], this.collectionPath.slice(0, -2))
  }

  subDocumentPath(subDocPath: DocumentPath): DocumentPath {
    const collPath = this.collectionPath.concat([this.id]).concat(subDocPath.collectionPath)
    return new DocumentPath(subDocPath.id, collPath)
  }

  getCollectionReference(cfg: IDBGroupConfig): CollectionReference {
    const db = cfg.localApp.firestore()
    let collRef = db.collection(this.collectionPath[0])
    const loop = (this.collectionPath.length - 1) / 2
    for (let i = 0; i < loop; i++) {
      const idx = 2 * i + 1
      collRef = collRef.doc(this.collectionPath[idx]).collection(this.collectionPath[idx + 1])
    }
    return collRef
  }

  getDocumentRef(cfg: IDBGroupConfig): DocReference {
    return this.getCollectionReference(cfg).doc(this.id)
  }

  getRecordModel<Q extends RecordModel, T extends ModelCreator<Q>>(cfg: IDBGroupConfig, creator: T): Promise<Q> {
    const record = new creator(creator.recordType())
    return (this.getDocumentRef(cfg) as any).get()
      .then((docRef: any) => {
        if (!docRef.exists) return Promise.reject(new Error("Internal Error - invalid document"))
        const data = docRef.data()
        data.id = this.id
        data.collectionPath = this.collectionPath
        record.assign(data)
        return Promise.resolve(record)
      })
  }
}