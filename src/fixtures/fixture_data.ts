import admin from 'firebase-admin';
import { Dummy } from './models/dummy';
import { DummyRepository } from './repositories/dummy_repository';
import dotenv from "dotenv"
dotenv.config()

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

admin.initializeApp({
  projectId: 'orm-test-project'
});

const repo = new DummyRepository();

export const deleteAll = async () => {
  const collRef = repo.getCollectionReference(undefined);
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
  const promises = data.map((doc) => {
    return repo.add(doc, undefined);
  });
  await Promise.all(promises);
}
