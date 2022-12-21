import '../fixtures/repositories/firebase'
import { LandmarkRepository } from '../fixtures/repositories/landmark.repository'
import debug from "debug"
import { makeCities } from '../fixtures/data/cities'
import { makeLandmarks } from '../fixtures/data/landmarks'

const dLog = debug("test:test:landmark-repository")

const repo = new LandmarkRepository()

describe('Cities group Repository', () => {

  /*
  beforeAll((done) => {
    makeCities()
      .then(() => {
        makeLandmarks()
      })
      .then(done)
      .catch(done)
  })*/

  it("should show group", async () => {
    const snap = await repo.getGroup({ queries: [["type", "==", "museum"]] })
    const landmards = snap.docs.map(doc => doc.data())
    dLog("landmars: ", landmards)
    expect(landmards.length).toEqual(1)
  })
})

