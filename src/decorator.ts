/* eslint-disable @typescript-eslint/no-explicit-any */
import { getDb } from "./config";
import { BaseModel, Constructor, RecordModel, ModelDefinition, ModelDefinitionSyntax } from "./record_model";
import { QueryGroup } from "./types/query.types"
import _ from "lodash"
import promiseSequential from "promise-sequential";
import { notEmpty } from "./utils";
import { ModelType } from "./types/model.types";
import { CollectionReference, DocumentData, DocumentSnapshot, Query, QueryDocumentSnapshot, SetOptions } from "./types/firestore";
import { AnyObject } from "./types/common";
import { removeUndefined } from "./tools";
import { AuthError } from "./auth_error";


const CHUNK_SIZE = 500

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


export function model(definition: ModelDefinitionSyntax): (target: Constructor & {
  definition?: ModelDefinition;
}) => void {


  return function (constructor: Constructor) {
    const klass = class extends constructor {
      getHiddenFields: () => string[] = () => definition.settings?.hiddenProperties ?? []
      constructor(data?: AnyObject, parent?: ModelType) {
        super(data, parent)
        Object.assign(this, data)
        this.postInit(data, parent)
      }
      static definition = definition

      static getCollectionReference(parent: ParentType): CollectionReference {
        const { name, settings } = this.definition
        const collPath = [parent?.getDocumentPath(), name].filter(notEmpty).join("/")

        return getDb(settings?.projectId).collection(collPath)
      }

      static fromDoc = (doc: DocumentSnapshot) => {
        const data = doc.data() || {}
        let parent: RecordModel | undefined = undefined
        getParentHierarchy(doc).forEach(cpl => {
          parent = new BaseModel(cpl, parent)
        })
        const obj = new klass(data, parent)
        obj.id = doc.id
        return obj
      }

      static fromQuerySnap = (parent: ModelType | undefined | null) => (doc: QueryDocumentSnapshot) => {
        const data = doc.data() || {}
        const obj = new klass(data, parent ?? undefined)
        obj.id = doc.id
        return obj
      }

      static make = (data: DocumentData, parent: ParentType) => {
        const obj = new klass(data, parent ?? undefined)
        return obj
      }

      static getList = async (queryGroup: QueryGroup) => {
        const { parent } = queryGroup
        const collRef = this.getCollectionReference(parent)
        const sorts = queryGroup.sorts || []
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
        const result = snapShot.docs.map(this.fromQuerySnap(parent));
        const { updateVersion } = definition
        if (updateVersion) {
          const promises = result.map(rec => updateVersion(rec))
          await Promise.all(promises)
            .catch(console.error)
        }

        return result
      }

      static find = async (queryGroup: QueryGroup) => {
        const records = await this.getList(queryGroup)
        if (records.length === 0) return Promise.reject(new Error("not found"))
        return records[0]
      }

      private static sanitize: (data: DocumentData) => DocumentData = (data) => {
        let transients = definition.settings?.hiddenProperties ?? []
        transients = transients.concat(["id", "parent"])

        return _.omit(data, transients)
      }

      static save = async (record: typeof klass) => {
        const model = record as any as RecordModel
        model.beforeSave()
        const options: SetOptions = { merge: false }
        const data = this.sanitize(model.objectData())
        const promise = !model.id ?
          this.add(data, model.parent) :
          this.set(model.id, data, model.parent, options)

        return await promise
      }


      static add = async (data: DocumentData, parent: ParentType) => {
        //console.log("sanitized data =>", this.sanitize(data))
        const rec = await this.getCollectionReference(parent).add(this.sanitize(data))
        const obj = new klass(data)
        obj.id = rec.id

        return obj
      }

      static set = async (id: string, _data: DocumentData, parent: ParentType, options: SetOptions) => {
        const collRef = this.getCollectionReference(parent)
        const data = this.sanitize(removeUndefined(_data))
        const docRef = collRef.doc(id)
        await docRef.set(data, options)
        const obj = new klass(data)
        obj.id = id

        return obj
      }

      static getById = (id: string, parent: ParentType) => {
        const collRef = this.getCollectionReference(parent)

        return collRef.doc(id).get()
          .then(snap => {
            return snap.exists ? Promise.resolve(this.fromDoc(snap)) : AuthError.reject(`Record not found (${snap.ref.path})`, 404)
          })
      }

      static delete = (id: string, parent: ParentType) => {
        const collRef = this.getCollectionReference(parent)

        return collRef.doc(id).delete()
      }

      static deleteGroup = (idx: string[], parent: ParentType) => {
        const collRef = this.getCollectionReference(parent)
        const { settings } = this.definition

        const tasks = _.chunk(idx, CHUNK_SIZE).map(list => {
          return () => {
            const batch = getDb(settings?.projectId).batch()
            list.forEach(id => {
              const docRef = collRef.doc(id)
              batch.delete(docRef)
            })

            return batch.commit()
          }
        })

        return promiseSequential(tasks)
      }
    };

    klass.prototype.modelName = definition.name

    return klass
  }
}

