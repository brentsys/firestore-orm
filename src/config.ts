// Import the functions you need from the SDKs you need
import Firebase from 'firebase/compat/app'
import 'firebase/compat/firestore'
import 'firebase/compat/auth'
import { AnyObject } from './types/common'

let app: Firebase.app.App
let auth: Firebase.auth.Auth
let db: Firebase.firestore.Firestore

export interface EmulatorConfig {
  host?: string | undefined
  authPort?: number | undefined
  firestorePort?: number | undefined
}

export interface AppConfig {
  config: AnyObject,
  useEmulator?: boolean,
  emulator?: EmulatorConfig | undefined
}

const host = "127.0.0.1"
const authPort = 9099
const dbPort = 8080

// Initialize Firebase
const initApp = (config: AppConfig, name?: string | undefined) => {
  if (!Firebase.apps.length) {
    app = Firebase.initializeApp(config.config, name)
    auth = app.auth()
    db = app.firestore()

    if (config.useEmulator) {
      const { emulator } = config
      db.useEmulator(emulator?.host ?? host, emulator?.firestorePort ?? dbPort)
      auth.useEmulator(`http://${emulator?.host ?? host}:${emulator?.authPort ?? authPort}`)
    }
  }
}

export const getApp = () => {

  return app
}


export const getDb = () => {
  return db
}

export const getAuth = () => {
  return auth
}


export async function signIn() {
  return getAuth().signInAnonymously()
}


export const FirebaseConfig = {
  initApp,
  getApp,
  getAuth,
  getDb
}



export default Firebase
