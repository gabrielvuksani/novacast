import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HomePage } from './pages/Home';

// Lazy-load non-critical pages for code splitting
const DiscoverPage = lazy(() => import('./pages/Discover').then(m => ({ default: m.DiscoverPage })));
const LivePage = lazy(() => import('./pages/Live').then(m => ({ default: m.LivePage })));
const SearchPage = lazy(() => import('./pages/Search').then(m => ({ default: m.SearchPage })));
const DetailPage = lazy(() => import('./pages/Detail').then(m => ({ default: m.DetailPage })));
const PlayerPage = lazy(() => import('./pages/Player').then(m => ({ default: m.PlayerPage })));
const AddonsPage = lazy(() => import('./pages/Addons').then(m => ({ default: m.AddonsPage })));
const SettingsPage = lazy(() => import('./pages/Settings').then(m => ({ default: m.SettingsPage })));
const AuthPage = lazy(() => import('./pages/Auth').then(m => ({ default: m.AuthPage })));
const NotFoundPage = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFoundPage })));

function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
      <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-text-tertiary">Loading...</span>
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/discover/:type?" element={<DiscoverPage />} />
            <Route path="/live" element={<LivePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/detail/:type/:id" element={<DetailPage />} />
            <Route path="/addons" element={<AddonsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="/player" element={<PlayerPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
