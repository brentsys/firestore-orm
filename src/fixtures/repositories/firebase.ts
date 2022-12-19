// Import the functions you need from the SDKs you need
import Firebase from 'firebase/compat/app'
import 'firebase/compat/firestore'
import 'firebase/compat/auth'
import { ProjectId } from '../constants';
import { RestDefinition } from '../../repository/rest_repository';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {
  apiKey: "dummyKey",
  projectId: ProjectId,
  appId: "dummyId",
};

export const useEmulator = !!process.env.NEXT_PUBLIC_USE_EMULATOR

let auth: Firebase.auth.Auth
let db: Firebase.firestore.Firestore

const host = "127.0.0.1"
const authPort = 9099
const dbPort = 8080

// Initialize Firebase
const initApp = () => {
  if (!Firebase.apps.length) {
    const app = Firebase.initializeApp(firebaseConfig)
    // auth
    auth = app.auth()
    const authUrl = `http://${host}:${authPort}`
    auth.useEmulator(authUrl)

    // firestore
    db = app.firestore()
    db.useEmulator(host, dbPort)
  }
}


export const getDb = () => {
  initApp()
  return db
}

export const getAuth = () => {
  initApp()
  return auth
}


export async function signIn() {
  return getAuth().signInAnonymously()
}

export function getRestDefinition(name: string): RestDefinition {
  return {
    name,
    settings: {
      restApi: {
        baseUrl: "https://gorest.co.in/public/v2",
        headers: {
          'Accept': "application/json",
          'Content-type': "application/json",
          'Authorization': `Bearer ${process.env.gorest_access_token}`
        }
      }
    }
  }
}



export default Firebase
