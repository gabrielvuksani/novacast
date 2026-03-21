import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Play,
  User,
  UserPlus,
} from 'lucide-react';
import { appBrand } from '@novacast/ui';
import { BrandMark } from '../components/BrandMark';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAuth } from '../providers/useAuth';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useDocumentTitle(mode === 'login' ? 'Sign In' : 'Create Account');

  const {
    user,
    loading,
    firebaseEnabled,
    firebaseMissingKeys,
    signInWithEmail,
    signUpWithEmail,
    signInWithGooglePopup,
    signOutUser,
  } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!firebaseEnabled) {
      navigate('/');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, name || undefined);
      }
      navigate('/');
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGooglePopup();
      navigate('/');
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Google sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center p-6">
        <div className="flex items-center gap-3 text-text-secondary">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>Checking your session…</span>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center p-6">
        <div className="card w-full max-w-xl p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/[0.06]">
            <User className="h-7 w-7 text-text-accent" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold text-white font-display">You're already signed in</h1>
          <p className="mt-3 text-sm text-text-secondary">
            {user.displayName || user.email || 'Authenticated NovaCast user'}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={() => navigate('/')} className="btn-primary">
              <Play className="h-4 w-4" aria-hidden="true" /> Continue browsing
            </button>
            <button onClick={() => void signOutUser()} className="btn-secondary">
              <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-[80vh] gap-6 lg:grid-cols-[minmax(0,1fr)_520px]">
      <section className="card relative overflow-hidden p-8 sm:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(139,124,255,0.18),transparent_30%),radial-gradient(circle_at_center,rgba(255,139,209,0.08),transparent_34%)]" />
        <div className="relative flex h-full flex-col justify-between gap-8">
          <div>
            <BrandMark showTagline />
            <div className="mt-8 max-w-xl space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-accent/80">
                Account & sync
              </p>
              <h1 className="text-4xl font-bold leading-tight text-white font-display">
                Save your watchlist, history, and preferences across devices.
              </h1>
              <p className="text-sm leading-7 text-text-secondary sm:text-base">
                {firebaseEnabled
                  ? 'Sign in to sync the NovaCast experience across your supported runtimes.'
                  : "Firebase isn't configured yet, so you can still continue in guest mode and use NovaCast locally on this device."}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {appBrand.heroHighlights.map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                <p className="text-sm font-semibold text-white">{item}</p>
                <p className="mt-2 text-xs leading-5 text-text-secondary">
                  {item === 'Adaptive playback engine'
                    ? 'Quality switching and live-aware streaming controls.'
                    : item === 'Bring your own sources'
                      ? 'Use manifests you trust without changing the product flow.'
                      : item === 'Cross-device sync'
                        ? 'Keep your setup portable when auth and sync are enabled.'
                        : 'A premium streaming experience designed to feel like home.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card flex items-center p-6 sm:p-8">
        <div className="w-full">
          <h2 className="text-2xl font-bold text-white font-display">
            {mode === 'login' ? 'Welcome back' : 'Create your NovaCast account'}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            {firebaseEnabled
              ? mode === 'login'
                ? 'Sign in to resume your watchlist and synced preferences.'
                : 'Create an account to carry your NovaCast setup across devices.'
              : 'Guest mode is available because Firebase is not configured for this workspace yet.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === 'register' && (
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Display name"
                  className="input-field pl-10"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                className="input-field pl-10"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                className="input-field pl-10 pr-10"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-tertiary transition-colors hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {error && (
              <div className="rounded-2xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {mode === 'login' ? (
                <>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  Sign in
                </>
              ) : (
                <>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Create account
                </>
              )}
            </button>

            {firebaseEnabled ? (
              <button
                type="button"
                onClick={() => void handleGoogleSignIn()}
                className="btn-secondary w-full"
                disabled={submitting}
              >
                Continue with Google
              </button>
            ) : (
              <button type="button" onClick={() => navigate('/')} className="btn-secondary w-full">
                Continue in guest mode
              </button>
            )}
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-text-secondary">
              {mode === 'login' ? 'Need an account? ' : 'Already have an account? '}
            </span>
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="font-semibold text-text-accent hover:text-white"
            >
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </div>

          <p className="mt-6 text-xs leading-5 text-text-tertiary">
            {firebaseEnabled
              ? 'Email/password and Google auth are enabled for this build.'
              : `Missing Firebase keys: ${firebaseMissingKeys.join(', ')}`}
          </p>
        </div>
      </section>
    </div>
  );
}
