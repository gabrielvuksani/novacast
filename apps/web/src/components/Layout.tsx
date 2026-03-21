import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Bookmark,
  Compass,
  Download,
  Home,
  Puzzle,
  Radio,
  Search,
  Settings,
  User,
} from 'lucide-react';
import { summarizeAddonCoverage } from '@novacast/core';
import { appBrand, mobileNavItems, primaryNavItems, type NavItem } from '@novacast/ui';
import { useAuth } from '../providers/useAuth';
import { useAddonStore } from '../providers/storeHooks';
import { BrandMark } from './BrandMark';

const iconMap: Record<NavItem['icon'], typeof Home> = {
  home: Home,
  discover: Compass,
  live: Radio,
  search: Search,
  addons: Puzzle,
  settings: Settings,
  account: User,
  watchlist: Bookmark,
  downloads: Download,
};

export function Layout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const addons = useAddonStore((s) => s.addons);
  // Keep addon coverage available for downstream consumers
  summarizeAddonCoverage(addons);

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(103,232,249,0.08),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(139,124,255,0.10),transparent_50%)]" />

      {/* ── Sidebar ── */}
      <aside className="hidden sm:flex fixed left-0 top-0 bottom-0 w-[72px] border-r border-white/[0.06] bg-white/[0.02] backdrop-blur-xl flex-col items-center py-5 z-50 lg:w-[240px]">
        {/* Brand */}
        <button
          onClick={() => navigate('/')}
          className="mb-6 w-full px-4 cursor-pointer"
          aria-label="Go to home"
        >
          <BrandMark compact={false} showTagline={false} className="hidden lg:flex" />
          <BrandMark compact className="justify-center lg:hidden" />
        </button>

        {/* Search shortcut – large sidebar */}
        <div className="hidden lg:block w-full px-3 mb-5">
          <button
            onClick={() => navigate('/search')}
            className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5 text-sm text-text-tertiary transition-colors hover:border-white/[0.10] hover:bg-white/[0.05] hover:text-text-secondary cursor-pointer"
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Search</span>
            <kbd className="ml-auto rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary">
              /
            </kbd>
          </button>
        </div>

        {/* Search shortcut – collapsed sidebar */}
        <div className="lg:hidden w-full px-2 mb-4">
          <button
            onClick={() => navigate('/search')}
            className="flex w-full items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5 text-text-tertiary transition-colors hover:border-white/[0.10] hover:bg-white/[0.05] hover:text-text-secondary cursor-pointer"
            aria-label="Search"
          >
            <Search className="h-4.5 w-4.5" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-0.5 w-full px-2 lg:px-3" aria-label="Main navigation">
          {primaryNavItems.map(({ to, icon, label }) => {
            const Icon = iconMap[icon];

            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-all duration-150 ${
                    isActive
                      ? 'bg-white/[0.08] text-white'
                      : 'text-text-secondary hover:bg-white/[0.04] hover:text-white'
                  }`
                }
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors lg:h-8 lg:w-8">
                  <Icon className="w-[1.15rem] h-[1.15rem] shrink-0" aria-hidden="true" />
                </div>
                <span className="hidden lg:block text-sm font-medium">{label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom area – user account */}
        <div className="mt-auto w-full px-2 lg:px-3 space-y-2">
          <div className="hidden lg:block px-1 pb-2 text-[11px] leading-4 text-text-tertiary/60">
            {appBrand.legalBoundary}
          </div>

          <NavLink
            to="/auth"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-all duration-150 ${
                isActive
                  ? 'bg-white/[0.08] text-white'
                  : 'text-text-secondary hover:bg-white/[0.04] hover:text-white'
              }`
            }
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="w-9 h-9 rounded-full shrink-0 object-cover ring-2 ring-white/[0.08] lg:w-8 lg:h-8"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] lg:h-8 lg:w-8">
                <User className="w-[1.1rem] h-[1.1rem] shrink-0" aria-hidden="true" />
              </div>
            )}
            <span className="hidden lg:block truncate text-sm font-medium">
              {user?.displayName || user?.email || 'Sign in'}
            </span>
          </NavLink>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="relative min-h-screen pb-16 sm:pb-0 sm:ml-[72px] lg:ml-[240px]">
        <div className="mx-auto min-h-screen max-w-[1680px] px-3 pb-10 pt-3 sm:px-5 lg:px-6 lg:pt-5">
          <Outlet />
        </div>
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 border-t border-white/[0.06] bg-black/70 backdrop-blur-xl z-50"
        aria-label="Mobile navigation"
      >
        <div className="flex items-stretch">
          {mobileNavItems.map(({ to, icon, label }) => {
            const Icon = iconMap[icon];

            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                    isActive ? 'text-white' : 'text-text-tertiary'
                  }`
                }
              >
                <Icon className="w-[1.2rem] h-[1.2rem]" aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
