import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  type Auth,
  type User,
  type Unsubscribe,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  onSnapshot,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import { getMissingFirebaseConfigKeys, isFirebaseConfigComplete } from './config';
import type { Manifest } from '@novacast/core';

// ── Firebase Config ──

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function initFirebase(config: FirebaseConfig) {
  if (!isFirebaseConfigComplete(config)) {
    const missing = getMissingFirebaseConfigKeys(config).join(', ');
    throw new Error(`Firebase configuration is incomplete: ${missing}`);
  }

  app = getApps()[0] ?? initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
  return { app, auth, db };
}

export function isFirebaseInitialized() {
  return auth !== null && db !== null;
}

export function getFirebaseAuth(): Auth {
  if (!auth) throw new Error('Firebase not initialized. Call initFirebase() first.');
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) throw new Error('Firebase not initialized. Call initFirebase() first.');
  return db;
}

// ── Auth Service ──

export async function signUp(email: string, password: string, displayName?: string) {
  const a = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(a, email, password);
  if (displayName) {
    await updateProfile(credential.user, { displayName });
  }
  return credential.user;
}

export async function signIn(email: string, password: string) {
  const a = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(a, email, password);
  return credential.user;
}

export async function signInWithGoogle() {
  const a = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(a, provider);
  return credential.user;
}

export async function signOut() {
  const a = getFirebaseAuth();
  await firebaseSignOut(a);
}

export function onAuthChange(callback: (user: User | null) => void): Unsubscribe {
  const a = getFirebaseAuth();
  return onAuthStateChanged(a, callback);
}

export function getCurrentUser(): User | null {
  return getFirebaseAuth().currentUser;
}

// ── User Data Sync ──

export interface UserProfile {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WatchlistItem {
  id: string;
  type: string;
  name: string;
  poster?: string;
  addedAt: unknown;
}

export interface WatchHistoryItem {
  id: string;
  type: string;
  videoId: string;
  name: string;
  poster?: string;
  currentTime: number;
  duration: number;
  updatedAt: unknown;
}

export interface InstalledAddonRecord {
  transportUrl: string;
  addonId: string;
  name: string;
  version: string;
  manifest?: Manifest;
  installedAt: unknown;
}

export type UserPreferencesRecord = Record<string, unknown> & {
  updatedAt?: unknown;
};

export function buildWatchlistDocId(type: string, itemId: string) {
  return `${type}_${itemId}`;
}

// ── Profile ──

export async function saveUserProfile(uid: string, profile: Partial<UserProfile>) {
  const d = getFirebaseDb();
  const ref = doc(d, 'users', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { ...profile, updatedAt: serverTimestamp() });
  } else {
    await setDoc(ref, { ...profile, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const d = getFirebaseDb();
  const ref = doc(d, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

// ── Installed Addons ──

export async function saveInstalledAddon(uid: string, addon: InstalledAddonRecord) {
  const d = getFirebaseDb();
  const ref = doc(d, 'users', uid, 'addons', addon.addonId);
  await setDoc(ref, { ...addon, installedAt: serverTimestamp() });
}

export async function removeInstalledAddon(uid: string, addonId: string) {
  const d = getFirebaseDb();
  const ref = doc(d, 'users', uid, 'addons', addonId);
  await deleteDoc(ref);
}

export function onAddonsChange(
  uid: string,
  callback: (addons: InstalledAddonRecord[]) => void,
): Unsubscribe {
  const d = getFirebaseDb();
  const q = query(collection(d, 'users', uid, 'addons'));
  return onSnapshot(q, (snap) => {
    const addons = snap.docs.map((d) => d.data() as InstalledAddonRecord);
    callback(addons);
  });
}

// ── Preferences ──

export async function saveUserPreferences(
  uid: string,
  preferences: Record<string, unknown>,
) {
  const d = getFirebaseDb();
  const ref = doc(d, 'users', uid, 'settings', 'preferences');
  await setDoc(ref, { ...preferences, updatedAt: serverTimestamp() }, { merge: true });
}

export function onUserPreferencesChange(
  uid: string,
  callback: (preferences: UserPreferencesRecord) => void,
): Unsubscribe {
  const d = getFirebaseDb();
  const ref = doc(d, 'users', uid, 'settings', 'preferences');
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? (snap.data() as UserPreferencesRecord) : {});
  });
}

// ── Watchlist ──

export async function addToWatchlist(uid: string, item: Omit<WatchlistItem, 'addedAt'>) {
  const d = getFirebaseDb();
  const ref = doc(d, 'users', uid, 'watchlist', buildWatchlistDocId(item.type, item.id));
  await setDoc(ref, { ...item, addedAt: serverTimestamp() });
}

export async function removeFromWatchlist(uid: string, itemId: string, type?: string) {
  const d = getFirebaseDb();
  const ref = doc(d, 'users', uid, 'watchlist', type ? buildWatchlistDocId(type, itemId) : itemId);
  await deleteDoc(ref);
}

export function onWatchlistChange(
  uid: string,
  callback: (items: WatchlistItem[]) => void,
): Unsubscribe {
  const d = getFirebaseDb();
  const q = query(collection(d, 'users', uid, 'watchlist'));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => d.data() as WatchlistItem);
    callback(items);
  });
}

// ── Watch History ──

export async function updateWatchHistory(
  uid: string,
  item: Omit<WatchHistoryItem, 'updatedAt'>,
) {
  const d = getFirebaseDb();
  const ref = doc(d, 'users', uid, 'history', `${item.type}_${item.videoId}`);
  await setDoc(ref, { ...item, updatedAt: serverTimestamp() }, { merge: true });
}

export function onWatchHistoryChange(
  uid: string,
  callback: (items: WatchHistoryItem[]) => void,
): Unsubscribe {
  const d = getFirebaseDb();
  const q = query(collection(d, 'users', uid, 'history'));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => d.data() as WatchHistoryItem);
    callback(items);
  });
}

export type AuthUser = User;
export * from './config';
