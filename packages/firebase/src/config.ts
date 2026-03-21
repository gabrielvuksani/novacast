import type { FirebaseConfig } from './index';

const PLACEHOLDER_PATTERN = /(YOUR_|example|changeme|placeholder)/i;

const CONFIG_KEYS: Array<keyof FirebaseConfig> = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

export function getMissingFirebaseConfigKeys(
  config: Partial<FirebaseConfig> | null | undefined,
): Array<keyof FirebaseConfig> {
  if (!config) return [...CONFIG_KEYS];

  return CONFIG_KEYS.filter((key) => {
    const value = config[key];
    return !value || PLACEHOLDER_PATTERN.test(value);
  });
}

export function isFirebaseConfigComplete(
  config: Partial<FirebaseConfig> | null | undefined,
): config is FirebaseConfig {
  return getMissingFirebaseConfigKeys(config).length === 0;
}

export function readFirebaseConfigFromRecord(
  source: Record<string, string | undefined>,
  prefix = '',
): Partial<FirebaseConfig> {
  const withPrefix = (key: string) => `${prefix}${key}`;

  return {
    apiKey: source[withPrefix('FIREBASE_API_KEY')],
    authDomain: source[withPrefix('FIREBASE_AUTH_DOMAIN')],
    projectId: source[withPrefix('FIREBASE_PROJECT_ID')],
    storageBucket: source[withPrefix('FIREBASE_STORAGE_BUCKET')],
    messagingSenderId: source[withPrefix('FIREBASE_MESSAGING_SENDER_ID')],
    appId: source[withPrefix('FIREBASE_APP_ID')],
  };
}