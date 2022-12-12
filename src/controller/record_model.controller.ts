import { FIREBASE_CUSTOM } from '../constants';
import admin from 'firebase-admin';
import _ from 'lodash';
import { QueryFilter, QueryGroup, toQueryGroup } from '../types/query.types';
import { AuthError } from '../errors/auth_error';
import { ModelType } from '../types/model.types';
import { HttpMethods } from '../model/record_model';
import { RestController } from './rest.controller';
import { DocumentData } from '../types/firestore';
import debug from 'debug'
import { Request } from '../types/request';
import { BaseRepository } from '../repository/base_repository';
import { DispatchSpecs } from '../types/dispatcher';

const dLog = debug("test:record-controller")
const removedKeys = ['modelType', 'errors', 'collectionPath', 'context'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = { [key: string]: any };


export abstract class RecordModelController<Q extends ModelType, P extends ModelType = ModelType> {
  abstract repo: BaseRepository<Q, P>;

  private restAccess!: RestController

  private isRest(method: HttpMethods) {
    return this.restAccess.canProcess(method)
  }

  postRequired: string[] = [];

  protected getProtectedFields(): string[] {
    return ['id', 'createdAt', 'updatedAt'];
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

  protected sanitize(obj: Body | Body[] | void): Body | Body[] {
    if (!obj) return { result: "Ok" };
    if (obj instanceof Array) {
      return obj.map((x) => this.sanitize(x));
    } else {
      this.getPrivateFields()
        .concat(removedKeys)
        .forEach((x) => delete obj[x]);
      _.keys(obj).forEach((key) => {
        if (obj[key] instanceof Object) {
          obj[key] = this.sanitize(obj[key]);
        } else if (obj[key] instanceof Array) {
          obj[key] = this.sanitize(obj[key]);
        }
      });
      return obj;
    }
  }

  protected sanitizeTime(obj: Body | Body[]): Body | Body[] {
    function timeString(time: admin.firestore.Timestamp): string {
      return time.toDate().toLocaleString();
    }
    if (obj instanceof Array) {
      return obj.map((x) => this.sanitizeTime(x));
    } else {
      const timeKeys = _.keys(obj).filter((k) => obj[k] instanceof admin.firestore.Timestamp);
      timeKeys.forEach((k) => (obj[k] = timeString(obj[k])));
      return obj;
    }
  }

  getFilters(req: Request): Promise<QueryGroup<P>> {
    const json = req.query?.filter as string | undefined;
    if (!json) return Promise.resolve({});
    const filter = JSON.parse(json) as QueryFilter;
    return Promise.resolve(toQueryGroup<P>(filter));
  }

  setSt: (req: Request) => void = () => {
    return;
  };

  notFound(error?: [number, string]) {
    if (error === undefined) error = [404, 'Not found'];
    return Promise.reject(new AuthError(error[0], error[1]));
  }

  async process(req: Request) {
    this.restAccess = new RestController(this.repo.definition.settings?.restApi)
    const specs = await this.preProcess(req)
      .then(() => {
        this.setSt(req);
        switch (req.method) {
          case 'POST':
            return this.post(req);
          case 'GET':
            return this.get(req);
          case 'PUT':
            return this.put(req);
          case 'DELETE':
            return this.del(req);
          default:
            return AuthError.reject('Not found', 404);
        }
      })
    dLog("specs", specs)
    const res = await this.dispatch(specs)
    return this.sanitize(res)
  }

  preProcess: (req: Request) => Promise<void> = () => {
    return Promise.resolve();
  };

  get(req: Request): Promise<DispatchSpecs<P>> {
    if (req.params.id === undefined) return this.getList(req);
    return this.getSingle(req.params.id, req);
  }

  // req? is kept here for backward compatibility issue
  getSingle: (id: string, req: Request) => Promise<DispatchSpecs<P>> = async (id, req) => {
    const query: QueryGroup<P> = await this.getFilters(req);
    /*
    if (this.isRest("GET")) return this.rest<Q>(req, { url: `/${id}`, method: "GET" })
    return this.repo.getById(id, this.getParent());*/
    return { method: "GET", id, query }
  };

  getList: (req: Request) => Promise<DispatchSpecs<P>> = async (req) => {
    const qg: QueryGroup<P> = await this.getFilters(req);
    return { method: "GET", query: qg }
    /*
    if (this.isRest("GET")) return this.rest<Q[]>(req, { query: qg, method: "GET" })
    return this.repo.getList(qg);*/
  };

  protected getData(req: Request): DocumentData {
    return req.body;
  }

  protected getUpdatableData(req: Request): DocumentData {
    return _.omit(this.getData(req), this.getProtectedFields());
  }

  protected getPostData(req: Request): Promise<DocumentData> {
    const data = this.getData(req);
    const res = this.postRequired.reduce((acc: string[], key: string) => {
      if (data[key] === undefined) acc.push(key);
      return acc;
    }, []);
    if (res.length > 0) return AuthError.reject(`Params: ${res.join(', ')} required`, 400);
    return Promise.resolve(data);
  }

  protected async post(req: Request): Promise<DispatchSpecs<P>> {
    const query: QueryGroup<P> = await this.getFilters(req);
    const data = await this.getPostData(req);
    const specs: DispatchSpecs<P> = {
      method: "POST", data, query
    }
    return specs
  }

  protected async put(req: Request): Promise<DispatchSpecs<P>> {
    const query: QueryGroup<P> = await this.getFilters(req);
    const data = this.getUpdatableData(req);
    return { method: "PUT", data, id: req.params.id, query }
    /*
    return this.isRest("PUT") ?
      this.rest<Q>(req, { body: data, method: "POST", url }) :
      this.repo.set(id, data, parent, { merge: true });
      */
  }

  protected del: (req: Request) => Promise<DispatchSpecs<P>> = async (req) => {
    const query: QueryGroup<P> = await this.getFilters(req);

    return { id: req.params.id, method: "DELETE", query }
  };

  private dispatch(specs: DispatchSpecs<P>): Promise<Q | Q[] | void> {
    if (this.isRest(specs.method)) {
      return this.restAccess.process<Q, P>(specs)
    } else {
      return this.repo.execute(specs)
    }
  }
}
