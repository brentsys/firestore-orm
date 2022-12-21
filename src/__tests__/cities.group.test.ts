import '../fixtures/repositories/firebase'
import { LandmarkRepository } from '../fixtures/repositories/landmark.repository'
import debug from "debug"
import { deleteCities, makeCities } from '../fixtures/data/cities'
import { deleteLandmarks, makeLandmarks } from '../fixtures/data/landmarks'

const dLog = debug("test:test:landmark-repository")

const repo = new LandmarkRepository()

async function makeAll() {
  await makeCities()
  await makeLandmarks()
}

async function deleteAll() {
  await deleteCities()
  await deleteLandmarks()
}

describe('Cities group Repository', () => {

  beforeAll((done) => {
    makeAll()
      .then(done)
      .catch(done)
  })

  afterAll((done) => {
    deleteAll()
      .then(done)
      .catch(done)
  })


  it("should show group", async () => {
    const snap = await repo.getGroup({ queries: [["type", "==", "museum"]] })
    const landmards = snap.docs.map(doc => doc.data())
    dLog("landmars: ", landmards)
    expect(landmards.length).toEqual(5)
  })
})

