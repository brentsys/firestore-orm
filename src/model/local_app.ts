import { DecodedIdToken } from 'firebase-admin/lib/auth/token-verifier';
import * as jwt from 'jsonwebtoken';
import { notEmpty } from './utils';
import { firestore } from "firebase-admin";
import * as admin from 'firebase-admin';
import { ILocalApp } from '../interface/local_app';
import { LocalAuth } from './local_auth';
import { IDBGroupConfig } from '../interface/idb_group_config';

const DEFAULT = "[DEFAULT]"

const inEmutation = !!process.env.FIREBASE_AUTH_EMULATOR_HOST


export class LocalApp implements ILocalApp {
  private static service: { [key: string]: LocalApp } = {}

  private _db: firestore.Firestore

  private _auth: LocalAuth

  private static appNames(): string[] {
    return admin.apps.map(app => app?.name).filter(notEmpty)
  }

  constructor(private _app: admin.app.App) {
    this._db = _app.firestore()
    this._auth = new LocalAuth(_app)
  }

  static initializeApp(options: admin.AppOptions, name?: string): admin.app.App {
    const app = admin.initializeApp(options, name)
    this.setInstance(new LocalApp(app), name)
    return app
  }

  private static setInstance(inst: LocalApp, name?: string): void {
    if (name === undefined) name = DEFAULT
    LocalApp.service[name] = inst
  }


  static getInstance(name?: string): LocalApp | null {
    if (name === undefined) name = DEFAULT
    let localApp = LocalApp.service[name]
    if (!localApp) {
      let app = admin.apps.find(x => !!x && x.name === name)
      if (!app) {
        if (name !== DEFAULT) return null
        app = admin.initializeApp()
      }
      localApp = new LocalApp(app)
    }
    return localApp
  }

  static getDbGroup(debug?: number, name?: string): IDBGroupConfig | null {
    if (name === undefined) name = DEFAULT
    const localApp = LocalApp.getInstance(name)
    if (!localApp) return null
    return {
      localApp,
      getDatabase: localApp.firestore,
      debug
    }
  }

  private decodeToken(token: string): Promise<DecodedIdToken> {
    const decoded = jwt.decode(token) as any
    decoded.uid = decoded.user_id
    return Promise.resolve(decoded as DecodedIdToken)
  }

  verifyIdToken(token: string, checkRevoked?: boolean): Promise<DecodedIdToken> {
    return inEmutation ? this.decodeToken(token) : this._app.auth().verifyIdToken(token, checkRevoked)
  }

  firestore(): firestore.Firestore {
    return this._db
  }
  auth(): LocalAuth {
    return this._auth
  }

  batch(): firestore.WriteBatch {
    return this._db.batch()
  }
}