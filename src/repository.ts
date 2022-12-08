import { AuthError } from "./auth_error";
import { getDb } from "./config";
import { BaseModel, ModelCreator, ModelDefinition, RecordModel } from "./record_model";
import { CollectionReference, DocumentData, DocumentSnapshot, Query, QueryDocumentSnapshot, SetOptions } from "./types/firestore";
import { ModelType } from "./types/model.types";
import { QueryGroup } from "./types/query.types";
import { notEmpty } from "./utils";
import _ from "lodash"
import { removeUndefined } from "./tools";

export type ParentType = ModelType | undefined | null

function getParentHierarchy(doc: DocumentSnapshot): [string, string][] {
  const pathArray = doc.ref.path.split("/")
  let i = 0
  const hierarchy: [string, string][] = []
  while (i < pathArray.length) {
    const node: [string, string] = [pathArray[i], pathArray[i + 1]]
    hierarchy.push(node)
    i += 2
  }
  return hierarchy.slice(0, -1)
}

export class Repository<T extends RecordModel> {

  constructor(private klass: ModelCreator<T>, readonly definition: ModelDefinition) { }

  getCollectionReference(parent: ParentType): CollectionReference {
    const { name, settings } = this.definition
    const collPath = [parent?.getDocumentPath(), name].filter(notEmpty).join("/")

    return getDb(settings?.projectId).collection(collPath)
  }

  fromDoc = (doc: DocumentSnapshot) => {
    const data = doc.data() || {}
    let parent: RecordModel | undefined = undefined
    getParentHierarchy(doc).forEach(cpl => {
      parent = new BaseModel(cpl, parent)
    })
    const obj = new this.klass(data, parent)
    obj.id = doc.id
    return obj
  }

  getById = async (id: string, parent: ParentType) => {
    const collRef = this.getCollectionReference(parent)

    return collRef.doc(id).get()
      .then(snap => {
        return snap.exists ? Promise.resolve(this.fromDoc(snap)) : AuthError.reject(`Record not found (${snap.ref.path})`, 404)
      })
  }

  fromQuerySnap = (parent: ModelType | undefined | null) => (doc: QueryDocumentSnapshot) => {
    const data = doc.data() || {}
    const obj = new this.klass(data, parent ?? undefined)
    obj.id = doc.id
    return obj
  }

  getList = async (queryGroup: QueryGroup) => {
    const { parent } = queryGroup
    const collRef = this.getCollectionReference(parent)
    const sorts = queryGroup.sorts || []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = collRef as any as Query
    const queries = queryGroup.queries || []
    queries.forEach(q => query = query.where(q[0], q[1], q[2]))
    sorts.forEach(s => query = query.orderBy(s[0], s[1]))
    if (queryGroup.cursorId) {
      const lastVisible = collRef.doc(`${queryGroup.cursorId}`)
      query = query.startAfter(lastVisible)
    }
    if (queryGroup.limit) query = query.limit(queryGroup.limit)
    const snapShot = await query.get();
    return snapShot.docs.map(this.fromQuerySnap(parent));
  }

  make = (data: DocumentData, parent: ParentType) => {
    const obj = new this.klass(data, parent ?? undefined)
    return obj
  }

  private sanitize: (data: DocumentData) => DocumentData = (data) => {
    let transients = this.definition.settings?.hiddenProperties ?? []
    transients = transients.concat(["id", "parent"])

    return _.omit(data, transients)
  }

  save = async (record: T) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model = record as any as RecordModel
    model.beforeSave()
    const options: SetOptions = { merge: false }
    const data = this.sanitize(model.objectData())
    const promise = !model.id ?
      this.add(data, model.parent) :
      this.set(model.id, data, model.parent, options)

    return await promise
  }


  add = async (data: DocumentData, parent: ParentType) => {
    //console.log("sanitized data =>", this.sanitize(data))
    const rec = await this.getCollectionReference(parent).add(this.sanitize(data))
    const obj = new this.klass(data)
    obj.id = rec.id

    return obj
  }

  set = async (id: string, _data: DocumentData, parent: ParentType, options: SetOptions) => {
    const collRef = this.getCollectionReference(parent)
    const data = this.sanitize(removeUndefined(_data))
    const docRef = collRef.doc(id)
    await docRef.set(data, options)
    const obj = new this.klass(data)
    obj.id = id

    return obj
  }


}