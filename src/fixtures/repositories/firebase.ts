// Import the functions you need from the SDKs you need
import 'firebase/compat/firestore'
import 'firebase/compat/auth'
import { ProjectId } from '../constants';
import { RestDefinition } from '../../repository/rest_repository';
import { AppConfig, FirebaseConfig } from '../../config';
import debug from 'debug';

const dLog = debug("test:config")

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {
  apiKey: "dummyKey",
  projectId: ProjectId,
  appId: "dummyId",
};

const appConfig: AppConfig = {
  config: firebaseConfig,
  useEmulator: true
}

export const useEmulator = !!process.env.NEXT_PUBLIC_USE_EMULATOR


// Initialize Firebase
FirebaseConfig.initApp(appConfig)
dLog("Firebase initialized!")

const { getAuth } = FirebaseConfig


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

