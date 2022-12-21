import { Dummy } from './models/dummy';
import dotenv from "dotenv"
import admin from "firebase-admin"
import { ProjectId } from './constants';
import debug from "debug"
const dLog = debug("fixtures")

dotenv.config()

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const collPath = "dummies"

let app: admin.app.App
export let fb: admin.firestore.Firestore

if (admin.apps.length === 0) {
  app = admin.initializeApp({ projectId: ProjectId })
  fb = app.firestore()
}

export const deleteAll = async () => {
  const collRef = fb.collection(collPath)
  const list = await collRef.get();
  const promises = list.docs.map((doc) => doc.ref.delete());
  return Promise.all(promises);
};

export const sample: Dummy = {
  id: 'java',
  name: 'java',
  platform: 'Java',
  weight: 240,
};

const data: Dummy[] = [
  {
    name: 'ios',
    platform: 'ios13',
    weight: 112,
  },
  {
    name: 'android',
    platform: 'Android12',
    weight: 80,
  },
  {
    name: 'androidK',
    platform: 'Android11',
    weight: 62,
  },
  {
    name: 'chr',
    platform: 'ChromeBook',
    weight: 160,
  },
  sample,
];

export async function addFixtures() {
  await deleteAll();
  const promises = data.map((rec) => {
    return fb.collection(collPath).doc(rec.name).set(rec, { merge: false })
  });
  await Promise.all(promises);
  const list = await fb.collection(collPath).get()
  list.docs.forEach(doc => {
    dLog(doc.id, "=>", doc.data())
  })
}
