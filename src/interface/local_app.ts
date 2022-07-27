import { firestore } from 'firebase-admin';
import { LocalAuth } from '../model/local_auth';

export interface ILocalApp {
  auth(): LocalAuth
  firestore(): firestore.Firestore
}