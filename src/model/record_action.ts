import { firestore } from "firebase-admin";
import debug from 'debug'
import { DocumentPath } from "./document_path";
import { ModelCreator } from "../interface/model_creator";
import { RecordModel } from "./record_model";
import { DataModel } from "../interface/data_model";
import { CollectionReference, DocumentData } from "../interface/types";
import { Query, QueryOrder } from "./query";
import { AuthError } from "./auth_error";
import { IDBGroupConfig } from "../interface/idb_group_config";

const log = debug('orm:record_action');

export class RecordAction<Q extends RecordModel> {
  private config?: IDBGroupConfig
  debug: number;
  documentPath?: DocumentPath
  constructor(readonly creator: ModelCreator<Q>, reference?: DocumentPath | Q) {
    if (reference instanceof DocumentPath) this.documentPath = reference
    if (reference instanceof RecordModel) this.documentPath = reference.getDocumentPath()
    this.debug = 0
  }

  setData(data: DataModel): Promise<Q> {
    const obj = this.setSyncData(data)
    return Promise.resolve(obj)
  }

  newRecord(): Q {
    return new this.creator(this.creator.recordType(), this.documentPath)
  }

  setSyncData(data: DataModel): Q {
    const base = this.newRecord()
    base.assign(data);
    return base
  }

  setConfig(cfg: IDBGroupConfig): RecordAction<Q> {
    this.config = cfg
    if (cfg.debug !== undefined) this.debug = cfg.debug
    return this
  }

  getConfig(): IDBGroupConfig | undefined {
    return this.config
  }

  getCollection(cfg?: IDBGroupConfig): CollectionReference {
    if (cfg !== undefined) this.setConfig(cfg)
    return this.newRecord().collection(this.config!)
  }

  add(data: DocumentData, cfg?: IDBGroupConfig): Promise<Q> {
    // data.id = "new"
    const rec = this.setSyncData(data as DataModel)
    if (!cfg) return Promise.reject("cfg not set")
    return rec.save(cfg)
  }

  find(queries: Query[], order?: QueryOrder): Promise<Q> {
    let collRef: firestore.Query = this.getCollection()
    for (const query of queries) {
      const { field, comp, value } = query
      collRef = collRef.where(field, comp, value)
    }
    if (order !== undefined) {
      collRef = collRef.orderBy(order.fieldPath, order.directionStr)
    }
    if (this.debug > 0) log(`[debug-${this.debug}]collRef =>`, collRef)
    return collRef
      .get()
      .then((querySnapshot) => {
        if (querySnapshot.empty) return AuthError.reject('Not Found', 404);
        const doc = querySnapshot.docs[0];
        return this.fromDocRef(doc)
      });
  }

  fromDocRef(docRef: firestore.DocumentSnapshot): Promise<Q> {
    const data = docRef.data() || {};
    data.id = docRef.id
    const record = this.setSyncData(data as DataModel)
    return Promise.resolve(record)
  }


  findAll(queries: Query[] = [], order?: QueryOrder, limit?: number): Promise<Q[]> {
    let qs = this.getCollection() as any
    for (const query of queries) {
      const { field, comp, value } = query
      if (this.debug > 2) log(`[debug-${this.debug}]`, "field =>", field, "(", typeof field, ") - value =>", value, "(", typeof value, ")")
      qs = qs.where(field, comp, value);
    }
    if (order) {
      qs = qs.orderBy(order.fieldPath, order.directionStr)
    }
    if (limit) {
      qs = qs.limit(limit)
    }
    if (this.debug > 0) log(`[debug-${this.debug}]`, "qs =>", qs)
    return qs
      .get()
      .then((querySnapshot: firestore.QuerySnapshot) => {
        if (this.debug > 1) log(`[debug-${this.debug}]`, "found ", querySnapshot.docs.length, "elements")
        const result: Promise<RecordModel>[] = [];
        for (const doc of querySnapshot.docs) {
          const obj = this.fromDocRef(doc)
          result.push(obj);
        }
        return Promise.all(result);
      });
  }

  findById(value: string): Promise<Q> {
    const docRef = this.getCollection().doc(value)
    return docRef.get()
      .then(doc => {
        if (doc.exists) {
          return this.fromDocRef(doc)
        } else {
          return Promise.reject(new Error(`Record Not found: ${docRef.path}`))
        }
      })
  }

}