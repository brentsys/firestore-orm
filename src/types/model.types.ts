/* eslint-disable @typescript-eslint/no-explicit-any */

import { Timestamp } from "./firestore";

export type ID = string | number

export type ModelType = {
  id?: ID;
  parentPath?: string
};

export interface RecordType extends ModelType {
  createdAt: Timestamp;
  modelName: string;
}
