import supertest from 'supertest';
import server from '../fixtures/app';
import _ from 'lodash'
import { makeUser } from '../fixtures/fixture.tools'

import debug from 'debug'
const dLog = debug("test:test:rest-repository")

const requestWithSupertest = supertest(server);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isInstanceOfUser = (obj: any) => {
  const properties = ["id", "name", "email", "gender", "status"]
  const diff = _.difference(Object.keys(obj), properties)
  return diff.length === 0
}

describe('Rest Endpoint Controller', () => {

  let userId = 0


  it('GET /users should fetch all users', async () => {
    const res = await requestWithSupertest.get('/users');
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    const list = res.body;
    expect(list).toBeInstanceOf(Array);
    expect(list.length).toBeGreaterThan(0)
    userId = list[0].id
  });

  it(`GET /users should fetch specific user with id ${userId}`, async () => {
    const res = await requestWithSupertest.get(`/users/${userId}`);
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    const obj = res.body;
    expect(isInstanceOfUser(obj)).toBeTruthy;
  });

  it('POST /users should create a user', async () => {
    const user = makeUser()
    dLog("adding user", user)
    const res = await requestWithSupertest
      .post('/users')
      .send(user)
    expect(res.status).toEqual(200);
    dLog(" body = ", res.body)
    userId = res.body.id
  })
  it('DELETE /users/:id should delete user', async () => {
    expect(userId).not.toBeUndefined()
    const res = await requestWithSupertest.delete(`/users/${userId}`);
    expect(res.status).toEqual(200);
    const failed = await requestWithSupertest.get(`/users/${userId}`)
    const fields = ["status", "statusCode", "text", "info"]
    dLog("failed ==>", _.pick(failed, fields))
    expect(failed.statusCode).toEqual(404)
  })

});
