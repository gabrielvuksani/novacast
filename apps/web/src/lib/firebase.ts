import {
  getMissingFirebaseConfigKeys,
  initFirebase,
  isFirebaseConfigComplete,
  readFirebaseConfigFromRecord,
  type FirebaseConfig,
} from '@novacast/firebase';

const envRecord = import.meta.env as Record<string, string | undefined>;
const rawConfig = readFirebaseConfigFromRecord(envRecord, 'VITE_');

export const firebaseConfig = rawConfig;
export const firebaseMissingKeys = getMissingFirebaseConfigKeys(rawConfig);
export const firebaseEnabled = isFirebaseConfigComplete(rawConfig);

let initialized = false;

export function ensureFirebaseInitialized() {
  if (!firebaseEnabled) return false;
  if (!initialized) {
    initFirebase(rawConfig as FirebaseConfig);
    initialized = true;
  }
  return true;
}
