import { FIREBASE_CUSTOM } from '../constants';
import _ from 'lodash';
import { QueryFilter, QueryGroup, toQueryGroup } from '../types/query.types';
import { AuthError } from '../errors/auth_error';
import { Timestamp } from '../types/firestore';
import debug from 'debug'
import { Request } from '../types/request';
import Firebase from 'firebase/compat/app'
import { BaseRepository } from '../repository/base_repository';
import { ID, ModelType } from '../types/model.types';

const dLog = debug("test:record-controller")

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = { [key: string]: any };


export abstract class RecordModelController<Q extends ModelType> {
  abstract repo: BaseRepository<Q>;

  postRequired: string[] = [];

  protected getProtectedFields(): string[] {
    return [];
  }

  protected getPrivateFields(): string[] {
    return [];
  }

  protected getFloatFields(): string[] {
    return [];
  }

  protected getIntegerFields(): string[] {
    return [];
  }

  hasFirebaseToken(req: Request): boolean {
    return req.headers.from === FIREBASE_CUSTOM;
  }

  protected sanitizeTime(obj: Body | Body[]): Body | Body[] {
    function timeString(time: Timestamp): string {
      return time.toDate().toLocaleString();
    }
    if (obj instanceof Array) {
      return obj.map((x) => this.sanitizeTime(x));
    } else {
      const timeKeys = _.keys(obj).filter((k) => obj[k] instanceof Firebase.firestore.Timestamp);
      timeKeys.forEach((k) => (obj[k] = timeString(obj[k])));
      return obj;
    }
  }

  getFilters(req: Request): Promise<QueryGroup> {
    const json = req.query?.filter as string | undefined;
    if (!json) return Promise.resolve({});
    const filter = JSON.parse(json) as QueryFilter;
    return Promise.resolve(toQueryGroup(filter));
  }

  setSt: (req: Request) => void = () => {
    return;
  };

  notFound(error?: [number, string]) {
    if (error === undefined) error = [404, 'Not found'];
    return Promise.reject(new AuthError(error[0], error[1]));
  }

  async process(req: Request) {
    return this.preProcess(req)
      .then(() => {
        this.setSt(req);
        switch (req.method) {
          case 'POST':
            return this.post(req)
          case 'GET':
            return this.get(req)
          case 'PUT':
            return this.put(req)
          case 'DELETE':
            return this.del(req);
          default:
            return AuthError.reject('Not found', 404);
        }
      })
  }

  preProcess: (req: Request) => Promise<void> = () => {
    return Promise.resolve();
  };

  getCollectionPath = (req: Request) => {
    return [this.getParentPath(req), this.repo.definition.name].join("/")
  }

  getParentPath = (req: Request) => {
    const split = req.originalUrl.split("/")
    const idx = split.length % 2 === 0 ? -1 : -2
    return split.slice(1, idx).join("/")
  }

  get(req: Request): Promise<Q | Q[]> {
    dLog("request path ==>", req.originalUrl)
    if (req.params.id === undefined) return this.getList(req);
    return this.getSingle(req.params.id, req);
  }

  getSingle: (id: string, req: Request) => Promise<Q> = async (id, req) => {
    return this.repo.getById(id, this.getParentPath(req))
  };

  getList: (req: Request) => Promise<Q[]> = async (req) => {
    const qg: QueryGroup = await this.getFilters(req);
    qg.parentPath = this.getParentPath(req)
    return this.repo.getList(qg)
  };

  protected getData(req: Request): Q {
    return req.body as Q;
  }

  protected getUpdatableData(req: Request): Partial<Q> {
    return _.omit(this.getData(req), this.getProtectedFields());
  }

  protected getPostData(req: Request): Promise<Partial<Q>> {
    const data = this.getData(req);
    data.parentPath = this.getParentPath(req)
    const res = this.postRequired.reduce((acc: string[], key: string) => {
      if (_.get(data, key) === undefined) acc.push(key);
      return acc;
    }, []);
    if (res.length > 0) return AuthError.reject(`Params: ${res.join(', ')} required`, 400);
    return Promise.resolve(data);
  }

  protected async post(req: Request): Promise<Q> {
    const data = await this.getPostData(req);
    return this.repo.add(data as Q)
  }

  protected async put(req: Request): Promise<Q> {
    const query: QueryGroup = await this.getFilters(req);
    const data = this.getUpdatableData(req);
    const id = req.params.id
    if (id) return Promise.reject(new Error("Id cannot be undefined for set"))
    const record: Partial<Q> & { id: ID } = { ...data, id, parentPath: query.parentPath }
    return this.repo.set(record, { merge: true })
  }

  protected del: (req: Request) => Promise<unknown> = async (req) => {
    const query: QueryGroup = await this.getFilters(req);
    return this.repo.delete(req.params.id, query.parentPath ?? undefined)
  };

}
