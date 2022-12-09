import { firestore } from 'firebase-admin';
export interface DataModel extends firestore.DocumentData {
  id: string | undefined;
}
