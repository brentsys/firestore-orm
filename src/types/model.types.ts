/* eslint-disable @typescript-eslint/no-explicit-any */
import admin from "firebase-admin"

export type ModelLayoutType = {
  id: string
  parentId?: string
}

export interface ModelType {
  id?: string
  createdAt: admin.firestore.Timestamp
  modelName: string
  parent?: ModelType | null
  getDocumentPath: () => string | undefined
  getCollectionPath: () => string
  getDocumentReference: () => admin.firestore.DocumentReference<admin.firestore.DocumentData> | undefined
  beforeSave: () => void
  objectData: (obj?: any) => any
  documentData: () => admin.firestore.DocumentData
  getHiddenFields: () => string[]
}
