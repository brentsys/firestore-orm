import { FIREBASE_CUSTOM } from '../constants';
import admin from 'firebase-admin';
import _ from 'lodash';
import { QueryFilter, QueryGroup, toQueryGroup } from '../types/query.types';
import { AuthError } from '../errors/auth_error';
import { Repository } from '../repository';
import { ModelType } from '../types/model.types';
import { HttpMethods } from '../model/record_model';
import { DispatchSpecs, RestController } from './rest.controller';
import { DocumentData } from '../types/firestore';
import debug from 'debug'
import { Request } from '../types/request';

const dLog = debug("test:record-controller")
const removedKeys = ['modelType', 'errors', 'collectionPath', 'context'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = { [key: string]: any };


export abstract class RecordModelController<Q extends ModelType, T extends Body = Body> {
  abstract repo: Repository<Q>;

  protected getParent: () => ModelType | undefined = () => undefined;

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

  hasFirebaseToken(req: Request<T>): boolean {
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

  getFilters(req: Request<T>): Promise<QueryGroup> {
    const json = req.query?.filter as string | undefined;
    if (!json) return Promise.resolve({});
    const filter = JSON.parse(json) as QueryFilter;
    return Promise.resolve(toQueryGroup(filter));
  }

  setSt: (req: Request<T>) => void = () => {
    return;
  };

  notFound(error?: [number, string]) {
    if (error === undefined) error = [404, 'Not found'];
    return Promise.reject(new AuthError(error[0], error[1]));
  }

  async process(req: Request<T>) {
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

  preProcess: (req: Request<T>) => Promise<void> = () => {
    return Promise.resolve();
  };

  get(req: Request<T>): Promise<DispatchSpecs> {
    if (req.params.id === undefined) return this.getList(req);
    return this.getSingle(req.params.id, req);
  }

  // req? is kept here for backward compatibility issue
  getSingle: (id: string, req: Request<T>) => Promise<DispatchSpecs> = async (id) => {
    /*
    if (this.isRest("GET")) return this.rest<Q>(req, { url: `/${id}`, method: "GET" })
    return this.repo.getById(id, this.getParent());*/
    return { method: "GET", id, }
  };

  getList: (req: Request<T>) => Promise<DispatchSpecs> = async (req) => {
    const qg: QueryGroup = await this.getFilters(req);
    if (this.getParent()) qg.parent = this.getParent();
    return { method: "GET", query: qg }
    /*
    if (this.isRest("GET")) return this.rest<Q[]>(req, { query: qg, method: "GET" })
    return this.repo.getList(qg);*/
  };

  protected getData(req: Request<T>): DocumentData {
    return req.body;
  }

  protected getUpdatableData(req: Request<T>): DocumentData {
    return _.omit(this.getData(req), this.getProtectedFields());
  }

  protected getPostData(req: Request<T>): Promise<DocumentData> {
    const data = this.getData(req);
    const res = this.postRequired.reduce((acc: string[], key: string) => {
      if (data[key] === undefined) acc.push(key);
      return acc;
    }, []);
    if (res.length > 0) return AuthError.reject(`Params: ${res.join(', ')} required`, 400);
    return Promise.resolve(data);
  }

  protected async post(req: Request<T>): Promise<DispatchSpecs> {
    const data = await this.getPostData(req);
    const specs: DispatchSpecs = {
      method: "POST", data
    }
    return specs
  }

  protected async put(req: Request<T>): Promise<DispatchSpecs> {
    const data = this.getUpdatableData(req);
    return { method: "PUT", data, id: req.params.id }
    /*
    return this.isRest("PUT") ?
      this.rest<Q>(req, { body: data, method: "POST", url }) :
      this.repo.set(id, data, parent, { merge: true });
      */
  }

  protected del: (req: Request<T>) => Promise<DispatchSpecs> = async (req) => {
    return { id: req.params.id, method: "DELETE" }
  };

  private dispatch(specs: DispatchSpecs): Promise<Q | Q[] | void> {
    const { id } = specs
    if (this.isRest(specs.method)) {
      return this.restAccess.process<Q>(specs)
    } else {
      switch (specs.method) {
        case "DELETE":
          return this.repo.delete(specs.id, this.getParent())
        case "PUT":
          if (!id) throw (new Error("invalid null id"))
          return this.repo.set(id, specs.data ?? {}, this.getParent(), { merge: true })
        case "POST":
          return this.repo.add(specs.data ?? {}, this.getParent());
        case "GET":
          if (id) return this.repo.getById(id, this.getParent())
          else return this.repo.getList(specs.query ?? {})
        default:
          throw (new Error(`cannot process method ${specs.method}`))
      }
    }
  }
}
