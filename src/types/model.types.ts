/* eslint-disable @typescript-eslint/no-explicit-any */
import admin from "firebase-admin"

export type ModelType = {
  id?: string
  parent?: ModelType
}

export interface RecordType extends ModelType {
  createdAt: admin.firestore.Timestamp
  modelName: string
}
