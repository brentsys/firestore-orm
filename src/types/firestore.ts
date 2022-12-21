import Firebase from 'firebase/compat/app'

export type FirestoreDataConverter<T> = Firebase.firestore.FirestoreDataConverter<T>
export type Firestore = Firebase.firestore.Firestore
export type DocumentData = Firebase.firestore.DocumentData
export type FieldPath = Firebase.firestore.FieldPath
export type WhereFilterOp = Firebase.firestore.WhereFilterOp
export type OrderByDirection = Firebase.firestore.OrderByDirection
export type DocumentSnapshot<T = DocumentData> = Firebase.firestore.DocumentSnapshot<T>
export type QueryDocumentSnapshot<T = DocumentData> = Firebase.firestore.QueryDocumentSnapshot<T>
export type Timestamp = Firebase.firestore.Timestamp
export type CollectionReference<T = DocumentData> = Firebase.firestore.CollectionReference<T>
export type DocumentReference<T> = Firebase.firestore.DocumentReference<T>
export type Query<T = DocumentData> = Firebase.firestore.Query<T>
export type QuerySnapshot<T = DocumentData> = Firebase.firestore.QuerySnapshot<T>
export type SetOptions = Firebase.firestore.SetOptions
export type SnapshotOptions = Firebase.firestore.SnapshotOptions
export type DocumentChange<T = DocumentData> = Firebase.firestore.DocumentChange<T>
export type FirestoreError = Firebase.firestore.FirestoreError
export type FieldValue = Firebase.firestore.FieldValue
