import supertest from "supertest"
import server from "../fixtures/app"
import { addFixtures, sample } from "../fixtures/fixture_data"
import { QueryFilter } from "../types/query.types";

const requestWithSupertest = supertest(server);

describe('Dummy Endpoints', () => {

  beforeAll((done) => {
    addFixtures().then(done)
  })

  it('GET /dummies should show all dummies', async () => {
    const res = await requestWithSupertest.get('/dummies');
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    const list = res.body
    expect(list).toBeInstanceOf(Array)
    expect(list.length).toEqual(5)
  });

  it('GET /dummies/:id should get single record', async () => {
    const res = await requestWithSupertest.get('/dummies/sample');
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).toEqual(sample)
  })

  it('GET /dummies should fetch filtered list', async () => {
    const filter: QueryFilter = {
      limit: 2,
      sort: [["weight", "asc"]],
      where: {
        weight: ["gt", 80]
      }
    }
    const url = `/dummies?filter=${JSON.stringify(filter)}`
    const res = await requestWithSupertest.get(url);
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    const list = res.body
    expect(list).toBeInstanceOf(Array)
    expect(list.length).toEqual(2)
    expect(list[0].name).toEqual("ios")
  });

});