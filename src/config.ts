import admin from 'firebase-admin';

export function initializeApp(options?: admin.AppOptions | undefined, name?: string | undefined) {
  admin.initializeApp(options, name);
}

export function getApp(projectId?: string): admin.app.App {
  return admin.app(projectId);
}

export function getDb(projectId?: string | undefined): admin.firestore.Firestore {
  return admin.app(projectId).firestore();
}
