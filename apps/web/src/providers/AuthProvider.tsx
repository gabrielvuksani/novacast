import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  type AuthUser,
  onAuthChange,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
} from '@novacast/firebase';
import { ensureFirebaseInitialized, firebaseEnabled, firebaseMissingKeys } from '../lib/firebase';
import { AuthContext, type AuthContextValue } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(firebaseEnabled);

  useEffect(() => {
    if (!firebaseEnabled || !ensureFirebaseInitialized()) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthChange((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      firebaseEnabled,
      firebaseMissingKeys,
      signInWithEmail: async (email: string, password: string) => {
        ensureFirebaseInitialized();
        await signIn(email, password);
      },
      signUpWithEmail: async (email: string, password: string, displayName?: string) => {
        ensureFirebaseInitialized();
        await signUp(email, password, displayName);
      },
      signInWithGooglePopup: async () => {
        ensureFirebaseInitialized();
        await signInWithGoogle();
      },
      signOutUser: async () => {
        ensureFirebaseInitialized();
        await signOut();
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
