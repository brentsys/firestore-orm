import { sample } from '../fixtures/fixture_data';
import debug from "debug"
import { DummyRepository } from '../fixtures/repositories/dummy_repository';
import { Dummy } from '../fixtures/models/dummy';
import { Landmark } from '../fixtures/models/landmark';
import { LandmarkRepository } from '../fixtures/repositories/landmark.repository';
import _, { after } from 'lodash'
import { DocumentData } from '../types/firestore';
import { FirebaseConfig } from '../config';
import '../fixtures/repositories/firebase'
import { deleteLandmarks } from '../fixtures/data/landmarks';

const dLog = debug("test:orm-repository")

const repo = new DummyRepository()
const landmarkRepo = new LandmarkRepository()

const { getDb } = FirebaseConfig

const getSnapData: (expected: Dummy) => Promise<[DocumentData | undefined, Partial<Dummy>]> = async (expected) => {
  const snap = await getDb().collection(repo.definition.name).doc(expected.name).get()
  expect(snap.exists)
  const reference: Partial<Dummy> = _.pick(expected, ["name", "platform", "weight"])
  dLog("snap.data() =>", snap.data())
  return [snap.data(), reference]
}

const _parentPath = 'cities/SF'

async function getLandmarkData(expected: Landmark) {
  const collPath = `${_parentPath}/${landmarkRepo.definition.name}`
  const id = `${expected.id}`
  const snap = await getDb().collection(collPath).doc(id).get()
  return snap.data()
}

describe('Dummy Repository', () => {
  beforeAll((done) => {
    repo.deleteRecord(sample)
      .then(done)
      .catch(error => {
        console.warn(error.message ?? error)
        done()
      })
  })

  it("should save sample", async () => {
    const record = await repo.save(sample)
    dLog("saved", record)
    const [snap, reference] = await getSnapData(record)
    expect(snap).toEqual(reference)
    expect(record).toEqual({
      ...sample,
      id: sample.name,
      url: `http://${record.name}.platform.io`
    })
    const weight = 1000
    record.weight = weight
    await repo.save(record)
    const [actual, expected] = await getSnapData({ ...sample, weight })
    expect(actual).toEqual(expected)
  })

})

describe("Landmark Repository", () => {

  test("should not save _parentPath", async () => {
    const record: Landmark = {
      name: 'Water Nature',
      type: 'aquarius',
      _parentPath
    }
    const landmark = await landmarkRepo.save(record)
    const data = await getLandmarkData(landmark)
    dLog("data =>", data)
    expect(data).not.toHaveProperty("_parentPath")
  })


  afterAll((done) => {
    deleteLandmarks()
      .then(done)
      .catch(done)

  })
})
