import { firestore } from "firebase-admin";

type FirestoreType = firestore.Firestore

const DEFAULT_SHARDS = 8

let db: FirestoreType

function counterReference(recType: string) {
  return db.collection("counters").doc(recType);
}

function getCount(ref: firestore.DocumentReference): Promise<number> {
  // Sum the count of each shard in the subcollection
  return ref.collection('shards').get().then(snapshot => {
    let totalCount = 0;
    snapshot.forEach(doc => {
      totalCount += doc.data().count;
    });
    return Promise.resolve(totalCount);
  });
}

// [START increment_counter]
function incrementCounter(db: firestore.Firestore, ref: firestore.DocumentReference, numShards: number) {
  // Select a shard of the counter at random
  const shardId = Math.floor(Math.random() * numShards).toString();
  const shardRef = ref.collection('shards').doc(shardId);

  // Update count in a transaction
  return db.runTransaction(t => {
    return t.get(shardRef).then(doc => {
      const data = doc.data() || {}
      const newCount = data.count + 1;
      t.update(shardRef, { count: newCount });
    });
  });
}
// [END increment_counter]

function createCounter(ref: any, nb: number): Promise<void> {
  return ref.get()
    .then((snap: any) => {
      if (snap.exists) return Promise.resolve()
      // console.log("creating counter ......", ref.id)
      let doc: any
      //this is a dirty hack for a poor local implementation of firestore
      if (snap.ref === undefined) {
        doc = snap
      } else {
        doc = snap.ref
      }
      var batch = db.batch();
      batch.set(doc, { num_shards: nb })
      for (let i = 0; i < nb; i++) {
        let shardRef = doc.collection("shards").doc(i.toString())
        batch.set(shardRef, { count: 0 })
      }
      return batch.commit()
    })
}

function _nextIndex(ref: any, shards?: number) {
  const numShards = shards || DEFAULT_SHARDS
  return createCounter(ref, numShards)
    .then(() => incrementCounter(db, ref, numShards))
    .then(() => {
      return getCount(ref);
    });
}

function nextIndex(_db: FirestoreType, recType: string, nb?: number) {
  db = _db
  var rf = counterReference(recType);
  return _nextIndex(rf, nb);
};

export const Counter = {
  nextIndex: nextIndex
};
