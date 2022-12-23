import supertest from 'supertest';
import server from '../fixtures/app';
import { addFixtures } from '../fixtures/fixture_data';
import { QueryFilter } from '../types/query.types';
import debug from "debug"
import { DeviceRepository } from '../fixtures/repositories/device.repository';
import { Device } from '../fixtures/models/device';
import { WID } from '../repository/base_repository';
import { waitRemote } from '../fixtures/fixture.tools';
import { DummyController } from '../fixtures/controllers/dummy_controller';
import { Request as AppRequest } from '../types/request';

const dLog = debug("test:orm-controller")
const requestWithSupertest = supertest(server);

describe("Controller tools", () => {
  it("Should get ParentPath from url", async () => {
    const controller = new DummyController()
    const url = '/model/modelId/dummies/dummyId/devices/deviceId'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const req = { originalUrl: url } as AppRequest
    const _parentPath = controller.getParentPath(req)
    expect(_parentPath).toEqual('model/modelId/dummies/dummyId')
  })
})

describe('Dummy Endpoints', () => {
  beforeAll((done) => {
    addFixtures().then(done)
      .catch(done)
  });

  it('GET /dummies should show all dummies', async () => {
    const res = await requestWithSupertest.get('/dummies');
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    const list = res.body;
    expect(list).toBeInstanceOf(Array);
    expect(list.length).toEqual(5);
  });

  it('GET /dummies/:id should get single record', async () => {
    const res = await requestWithSupertest.get('/dummies/java');
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).not.toHaveProperty("_parentPath")
    expect(res.body).toHaveProperty("url")
  });

  it('GET /dummies should fetch filtered list', async () => {
    const filter: QueryFilter = {
      limit: 2,
      sort: [['weight', 'asc']],
      where: {
        weight: ['gt', 80],
      },
    };
    const url = `/dummies?filter=${JSON.stringify(filter)}`;
    const res = await requestWithSupertest.get(url);
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    const list = res.body;
    expect(list).toBeInstanceOf(Array);
    expect(list.length).toEqual(2);
    expect(list[0].name).toEqual('ios');
  });
});

describe('Devices endpoints', () => {

  const repo = new DeviceRepository()
  const _parentPath = "dummies/dummyPath"
  const devices: WID<Device>[] = []

  beforeAll((done) => {
    repo.add({ model: "Redmi note 10", size: 5.5, _parentPath })
      .then(res => {
        devices.push(res)
        return repo.add({ model: "Hwawei Mate pro", size: 7.0, _parentPath })
      })
      .then(res => {
        devices.push(res)
        done()
      })
      .catch(done)
  })

  afterAll((done) => {
    waitRemote()
      .then(() => repo.getList({ parentPath: 'dummies/dummyPath' }))
      .then(devs => {
        dLog("devides to delete: ", devs.map(dv => dv.id))
        return Promise.all(devs.map(dev => {
          dLog("deleting", repo.documentReference(dev).path)
          return repo.deleteRecord(dev)
        }))
      })
      .then(() => {
        dLog("...deleted devices ")
        done()
      })
      .catch(done)
  })

  it("should get correct parent path", async () => {
    expect(devices.length).toEqual(2)
    const id = devices[0].id
    const path = [_parentPath, "devices"].join("/")
    const res = await requestWithSupertest.get(["", path, id].join("/"));
    expect(res.status).toEqual(200);
    expect(res.body._parentPath).toEqual(_parentPath);
  })

  it("should get devices", async () => {
    const url = ["", _parentPath, "devices"].join("/")
    const res = await requestWithSupertest.get(url);
    expect(res.status).toEqual(200);
    expect(res.body).toBeInstanceOf(Array)
    const list: WID<Device>[] = res.body
    expect(list.length).toBeGreaterThanOrEqual(2)
  })
  it("should delete device", async () => {
    const dev = devices[0]
    await repo.deleteRecord(dev)
    //const res = await repo.getById(dev.id, _parentPath)
    //expect(res).toBeUndefined()
    expect(repo.getById(dev.id, dev._parentPath)).rejects.toThrow("Record not found")
  })
})