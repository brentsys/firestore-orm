import admin from "firebase-admin";
import { DummyRepository } from "./repositories/dummy_repository";

process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080"

admin.initializeApp({
  projectId: "orm-test-project" // "goip-cloud-bsc"
})

const repo = new DummyRepository()

export const deleteAll = async () => {
  const collRef = repo.getCollectionReference(null)
  const list = await collRef.get()
  const promises = list.docs.map(doc => doc.ref.delete())
  return Promise.all(promises)
}

export const sample = {
  id: "sample",
  name: "java", platform: "Java", weight: 240
}

const data = [{
  name: "ios", platform: "ios13", weight: 112
}, {
  name: "android", platform: "Android12", weight: 80
}, {
  name: "androidK", platform: "Android11", weight: 62
}, {
  name: "chr", platform: "ChromeBook", weight: 160
}, sample
]

export async function addFixtures() {
  await deleteAll()
  const promises = data.map((doc) => {
    const obj = repo.make(doc, null)
    return repo.save(obj)
  })
  await Promise.all(promises)

}

