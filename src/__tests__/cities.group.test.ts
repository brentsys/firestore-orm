import '../fixtures/repositories/firebase'
import { LandmarkRepository } from '../fixtures/repositories/landmark.repository'
import debug from "debug"
import { deleteCities, makeCities } from '../fixtures/data/cities'
import { deleteLandmarks, makeLandmarks } from '../fixtures/data/landmarks'
import { QueryGroup } from '../types'
import { Landmark } from '../fixtures/models/landmark'

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
    const landmards = await repo.getGroupModel({ queries: [["type", "==", "museum"]] })
    dLog("landmars: ", landmards)
    expect(landmards.length).toEqual(6)
  })

  it("should show only children", async () => {
    const qg: QueryGroup<Landmark> = { parentPath: 'cities/LA' }
    const list = await repo.getList(qg)
    expect(list.length).toEqual(2)
    const orphans = await repo.getList({})
    expect(orphans.length).toEqual(1)
  })
})

