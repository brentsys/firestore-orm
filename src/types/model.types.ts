/* eslint-disable @typescript-eslint/no-explicit-any */
import admin from 'firebase-admin';

export type ID = string | number

export type ModelType = {
  id?: ID;
  collectionPath?: string
};

export interface RecordType extends ModelType {
  createdAt: admin.firestore.Timestamp;
  modelName: string;
}
