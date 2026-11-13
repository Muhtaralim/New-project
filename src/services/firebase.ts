import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  setDoc,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseAppletConfig from '../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  currentAuth?: Auth | null
): never {
  const currentUser = currentAuth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Prefer configuration from firebase-applet-config.json, with fallback to environment variables
const resolvedApiKey =
  firebaseAppletConfig?.apiKey || import.meta.env.VITE_FIREBASE_API_KEY;
const resolvedProjectId =
  firebaseAppletConfig?.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID;
const resolvedAuthDomain =
  firebaseAppletConfig?.authDomain ||
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
  (resolvedProjectId ? `${resolvedProjectId}.firebaseapp.com` : undefined);
const resolvedStorageBucket =
  firebaseAppletConfig?.storageBucket ||
  import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
  (resolvedProjectId ? `${resolvedProjectId}.firebasestorage.app` : undefined);
const resolvedMessagingSenderId =
  firebaseAppletConfig?.messagingSenderId ||
  import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
const resolvedAppId =
  firebaseAppletConfig?.appId || import.meta.env.VITE_FIREBASE_APP_ID;
const resolvedDatabaseId =
  firebaseAppletConfig?.firestoreDatabaseId || '(default)';

export const isFirebaseConfigured = Boolean(
  resolvedApiKey &&
    resolvedProjectId &&
    resolvedApiKey !== '' &&
    resolvedProjectId !== '' &&
    resolvedProjectId !== 'remixed-project-id'
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

const firebaseConfig = {
  apiKey: resolvedApiKey,
  authDomain: resolvedAuthDomain,
  projectId: resolvedProjectId,
  storageBucket: resolvedStorageBucket,
  messagingSenderId: resolvedMessagingSenderId,
  appId: resolvedAppId,
};

if (isFirebaseConfigured) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    // Connect to specific database if custom database ID is provisioned
    db =
      resolvedDatabaseId && resolvedDatabaseId !== '(default)'
        ? getFirestore(app, resolvedDatabaseId)
        : getFirestore(app);

    // Initial connection test as mandated by Firebase integration skill
    (async () => {
      try {
        if (db) {
          await getDocFromServer(doc(db, 'test', 'connection'));
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('the client is offline')) {
          console.warn('Firebase client is offline or network is warming up.');
        }
      }
    })();
  } catch (initErr) {
    console.warn('Firebase SDK init warning (falling back to defensive mode):', initErr);
  }
}

/**
 * Provisions a real Firebase Email/Password account for a newly registered employee
 * using an isolated secondary Firebase App instance so the factory administrator
 * stays logged in. Returns false cleanly if Email/Password auth is disabled or unavailable.
 */
export async function provisionEmployeeAuthAccount(
  email: string,
  password: string
): Promise<boolean> {
  if (!isFirebaseConfigured || !firebaseConfig.apiKey) return false;
  try {
    const existing = getApps().find((a) => a.name === 'employee-provisioner');
    const secondaryApp = existing || initializeApp(firebaseConfig, 'employee-provisioner');
    const secondaryAuth = getAuth(secondaryApp);
    await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await firebaseSignOut(secondaryAuth);
    return true;
  } catch (err) {
    console.warn('Secondary employee auth provisioning skipped:', err);
    return false;
  }
}

export { app, auth, db };
