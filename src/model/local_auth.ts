import * as admin from 'firebase-admin';
import { firestore } from 'firebase-admin';
import { FullDecoded } from '../interface/jwt'

export class LocalAuth {
  protected db: firestore.Firestore
  private _auth: admin.auth.Auth

  createCustomToken(uid: string, developerClaims?: object): Promise<string> {
    return this._auth.createCustomToken(uid, developerClaims)
  }

  constructor(app: admin.app.App) {
    this.db = app.firestore()
    this._auth = app.auth()
    // this.createCustomToken = this._auth.createCustomToken
  }

  verifyIdToken(token: string, checkRevoked?: boolean): Promise<FullDecoded> {
    return Promise.reject(new Error("verifyIdToken not implemented"))
  }

  async getUserIdByPhoneNumber(phone: string): Promise<string> {
    const user = await this._auth.getUserByPhoneNumber(phone)
    return user.uid
  }
}





