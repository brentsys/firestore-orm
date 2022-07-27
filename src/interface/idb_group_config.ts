import { LocalApp } from "../model/local_app"
import { firestore } from "firebase-admin";

export interface IDBGroupConfig {
  localApp: LocalApp
  getDatabase(): firestore.Firestore
  debug?: number
}