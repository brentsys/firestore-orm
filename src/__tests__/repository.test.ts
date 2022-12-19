import { sample } from '../fixtures/fixture_data';
import debug from "debug"
import { DummyRepository } from '../fixtures/repositories/dummy_repository';
import { getDb } from '../fixtures/repositories/firebase';
import { Dummy } from '../fixtures/models/dummy';
import _ from 'lodash'
import { DocumentData } from '../types/firestore';

const dLog = debug("test:orm-repository")

const repo = new DummyRepository()

const getSnapData: (expected: Dummy) => Promise<[DocumentData | undefined, Partial<Dummy>]> = async (expected) => {
  const snap = await getDb().collection(repo.definition.name).doc(expected.name).get()
  expect(snap.exists)
  const reference: Partial<Dummy> = _.pick(expected, ["name", "platform", "weight"])
  dLog("snap.data() =>", snap.data())
  return [snap.data(), reference]
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
