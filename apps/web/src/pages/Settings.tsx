import type { ReactNode } from 'react';
import {
  Bookmark,
  Clock,
  Info,
  Monitor,
  Play,
  RotateCcw,
  Search,
  Shield,
  Trash2,
} from 'lucide-react';
import { appBrand, themeOptions } from '@novacast/ui';
import {
  useAddonStore,
  useRecentSearchStore,
  useSettingsStore,
  useStores,
  useWatchHistoryStore,
  useWatchlistStore,
} from '../providers/storeHooks';
import { NOVACAST_STORAGE_KEYS } from '../providers/storeContext';
import { useToast } from '../components/Toast';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings);
  const addonCount = useAddonStore((s) => s.addons.length);
  const watchlistCount = useWatchlistStore((s) => s.items.length);
  const historyCount = useWatchHistoryStore((s) => s.entries.length);
  const recentSearchCount = useRecentSearchStore((s) => s.items.length);
  const { settingsStore, watchlistStore, historyStore, recentSearchStore } = useStores();
  const toast = useToast();

  useDocumentTitle('Settings');

  const handleClearData = () => {
    if (window.confirm('This will clear all local data including installed sources, settings, and history. Continue?')) {
      for (const key of NOVACAST_STORAGE_KEYS) {
        localStorage.removeItem(key);
      }
      window.location.reload();
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear all watch history?')) {
      historyStore.getState().clear();
      toast.info('Watch history cleared');
    }
  };

  const handleClearWatchlist = () => {
    if (window.confirm('Clear your entire watchlist?')) {
      watchlistStore.getState().clear();
      toast.info('Watchlist cleared');
    }
  };

  const handleClearRecentSearches = () => {
    if (window.confirm('Clear recent searches?')) {
      recentSearchStore.getState().clear();
      toast.info('Recent searches cleared');
    }
  };

  const resetDefaults = () => {
    settingsStore.getState().updateSettings({
      posterSize: 'md',
      autoplay: true,
      autoSourceFailover: true,
      defaultSubtitleLang: '',
      playbackRate: 1,
      hardwareAcceleration: true,
      autoNextEpisode: true,
      skipIntroOutro: false,
      defaultQuality: 'auto',
      keepScreenAwake: true,
      showPlaybackDiagnostics: false,
      liveLatencyMode: 'auto',
      rememberRecentSearches: true,
      defaultCaptionScale: 1,
      theme: 'dark',
    });
    toast.info('Settings restored to defaults');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-3xl font-bold tracking-tight text-white font-display sm:text-4xl">
          Settings
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Customize your NovaCast experience.
        </p>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Playback */}
        <SettingsSection
          icon={<Play className="h-4 w-4" />}
          iconColor="bg-accent/12 text-accent"
          title="Playback"
          description="Video player behavior and quality preferences."
        >
          <ToggleSetting
            label="Autoplay"
            description="Start playback automatically when a stream is selected."
            value={settings.autoplay}
            onChange={(v) => settingsStore.getState().updateSettings({ autoplay: v })}
          />
          <ToggleSetting
            label="Auto source failover"
            description="Try the next available source if the current one fails."
            value={settings.autoSourceFailover}
            onChange={(v) => settingsStore.getState().updateSettings({ autoSourceFailover: v })}
          />
          <ToggleSetting
            label="Auto-play next episode"
            description="Automatically play the next episode when one ends."
            value={settings.autoNextEpisode}
            onChange={(v) => settingsStore.getState().updateSettings({ autoNextEpisode: v })}
          />
          <ToggleSetting
            label="Keep screen awake"
            description="Prevent the screen from sleeping during playback."
            value={settings.keepScreenAwake}
            onChange={(v) => settingsStore.getState().updateSettings({ keepScreenAwake: v })}
          />
          <ToggleSetting
            label="Show diagnostics"
            description="Display technical info in the player (bandwidth, format)."
            value={settings.showPlaybackDiagnostics}
            onChange={(v) => settingsStore.getState().updateSettings({ showPlaybackDiagnostics: v })}
          />
          <SelectSetting
            label="Default quality"
            description="Preferred video quality."
            value={settings.defaultQuality}
            options={[
              { value: 'auto', label: 'Auto (Adaptive)' },
              { value: '4k', label: '4K' },
              { value: '1080p', label: '1080p' },
              { value: '720p', label: '720p' },
              { value: '480p', label: '480p' },
            ]}
            onChange={(v) => settingsStore.getState().updateSettings({ defaultQuality: v as typeof settings.defaultQuality })}
          />
          <SelectSetting
            label="Live latency"
            description="Latency preference for live streams."
            value={settings.liveLatencyMode}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'low', label: 'Low latency' },
              { value: 'balanced', label: 'Balanced' },
            ]}
            onChange={(v) => settingsStore.getState().updateSettings({ liveLatencyMode: v as typeof settings.liveLatencyMode })}
          />
          <SelectSetting
            label="Subtitle language"
            description="Default subtitle language."
            value={settings.defaultSubtitleLang}
            options={[
              { value: '', label: 'None' },
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Spanish' },
              { value: 'fr', label: 'French' },
              { value: 'de', label: 'German' },
              { value: 'pt', label: 'Portuguese' },
              { value: 'it', label: 'Italian' },
              { value: 'ja', label: 'Japanese' },
              { value: 'ko', label: 'Korean' },
              { value: 'zh', label: 'Chinese' },
              { value: 'ar', label: 'Arabic' },
              { value: 'hi', label: 'Hindi' },
            ]}
            onChange={(v) => settingsStore.getState().updateSettings({ defaultSubtitleLang: v })}
          />
          <SelectSetting
            label="Caption size"
            description="Default caption text scale."
            value={String(settings.defaultCaptionScale)}
            options={[
              { value: '0.85', label: '85%' },
              { value: '1', label: '100%' },
              { value: '1.15', label: '115%' },
              { value: '1.3', label: '130%' },
            ]}
            onChange={(v) => settingsStore.getState().updateSettings({ defaultCaptionScale: Number(v) })}
          />
        </SettingsSection>

        {/* Appearance */}
        <SettingsSection
          icon={<Monitor className="h-4 w-4" />}
          iconColor="bg-secondary-accent/12 text-secondary-accent"
          title="Appearance"
          description="Theme and display preferences."
        >
          <SelectSetting
            label="Theme"
            description="Choose your preferred look."
            value={settings.theme}
            options={themeOptions.map((o) => ({ value: o.id, label: o.label }))}
            onChange={(v) => settingsStore.getState().updateSettings({ theme: v as typeof settings.theme })}
          />
          <SelectSetting
            label="Poster size"
            description="Default content card size."
            value={settings.posterSize}
            options={[
              { value: 'sm', label: 'Small' },
              { value: 'md', label: 'Medium' },
              { value: 'lg', label: 'Large' },
            ]}
            onChange={(v) => settingsStore.getState().updateSettings({ posterSize: v as typeof settings.posterSize })}
          />
          <div className="grid gap-2 pt-2 sm:grid-cols-3">
            {themeOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => settingsStore.getState().updateSettings({ theme: option.id as typeof settings.theme })}
                className={`cursor-pointer rounded-xl border p-3 text-left transition-all ${
                  settings.theme === option.id
                    ? 'border-accent/30 bg-accent/8 ring-1 ring-accent/20'
                    : 'border-white/6 bg-white/[0.02] hover:border-white/12'
                }`}
              >
                <p className="text-sm font-semibold text-white">{option.label}</p>
                <p className="mt-1 text-xs text-text-tertiary">{option.description}</p>
              </button>
            ))}
          </div>
        </SettingsSection>

        {/* Privacy */}
        <SettingsSection
          icon={<Search className="h-4 w-4" />}
          iconColor="bg-amber/12 text-amber"
          title="Search & Privacy"
          description="Search history and browsing preferences."
        >
          <ToggleSetting
            label="Remember recent searches"
            description="Store recent queries locally for quick access."
            value={settings.rememberRecentSearches}
            onChange={(v) => settingsStore.getState().updateSettings({ rememberRecentSearches: v })}
          />
        </SettingsSection>

        {/* Data & Storage */}
        <SettingsSection
          icon={<Shield className="h-4 w-4" />}
          iconColor="bg-error/12 text-error"
          title="Data & Storage"
          description="Manage your local data."
        >
          <StorageRow label="Installed sources" description={`${addonCount} source${addonCount !== 1 ? 's' : ''}`} />
          <StorageRow
            label="Watchlist"
            description={`${watchlistCount} item${watchlistCount !== 1 ? 's' : ''}`}
            icon={<Bookmark className="h-4 w-4 text-text-tertiary" />}
            action={watchlistCount > 0 ? <ClearButton onClick={handleClearWatchlist} /> : undefined}
          />
          <StorageRow
            label="Watch history"
            description={`${historyCount} item${historyCount !== 1 ? 's' : ''}`}
            icon={<Clock className="h-4 w-4 text-text-tertiary" />}
            action={historyCount > 0 ? <ClearButton onClick={handleClearHistory} /> : undefined}
          />
          <StorageRow
            label="Recent searches"
            description={`${recentSearchCount} quer${recentSearchCount !== 1 ? 'ies' : 'y'}`}
            icon={<Search className="h-4 w-4 text-text-tertiary" />}
            action={recentSearchCount > 0 ? <ClearButton onClick={handleClearRecentSearches} /> : undefined}
          />
          <div className="flex flex-wrap gap-2 pt-3">
            <button onClick={resetDefaults} className="btn-secondary text-sm">
              <RotateCcw className="h-3.5 w-3.5" /> Reset settings
            </button>
            <button onClick={handleClearData} className="btn-danger text-sm">
              <Trash2 className="h-3.5 w-3.5" /> Clear all data
            </button>
          </div>
        </SettingsSection>

        {/* About */}
        <SettingsSection
          icon={<Info className="h-4 w-4" />}
          iconColor="bg-accent/12 text-accent"
          title="About NovaCast"
          description="App info and legal."
        >
          <div className="space-y-2 text-sm text-text-secondary">
            <p className="font-medium text-white">{appBrand.tagline}</p>
            <p>{appBrand.description}</p>
            <p className="text-xs text-text-tertiary pt-2">{appBrand.legalBoundary}</p>
            <p className="text-xs text-text-tertiary">
              Built with React 19, TypeScript, Zustand, HLS.js, dash.js, and Tailwind CSS.
            </p>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}

function SettingsSection({ icon, iconColor, title, description, children }: {
  icon: ReactNode;
  iconColor: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/6 bg-white/[0.02] p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconColor}`}>
          {icon}
        </div>
        <div>
          <h2 className="text-base font-semibold text-white font-display">{title}</h2>
          <p className="text-xs text-text-tertiary">{description}</p>
        </div>
      </div>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function ClearButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="cursor-pointer rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-white/14 hover:text-white">
      Clear
    </button>
  );
}

function StorageRow({ label, description, icon, action }: {
  label: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/6 py-3 last:border-0">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-text-tertiary">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function ToggleSetting({ label, description, value, onChange }: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/6 py-3 last:border-0">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-text-tertiary">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        aria-label={label}
        className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${value ? 'bg-accent' : 'bg-white/10'}`}
      >
        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${value ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function SelectSetting({ label, description, value, options, onChange }: {
  label: string;
  description: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/6 py-3 last:border-0">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-text-tertiary">{description}</p>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-[140px] cursor-pointer rounded-lg border border-white/8 bg-white/[0.04] px-3 py-1.5 text-sm text-text-primary transition-all focus:outline-none focus:border-accent/40"
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
