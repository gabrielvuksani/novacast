import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plus,
  Puzzle,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  addonTransportClient,
  summarizeAddonCapabilities,
  summarizeAddonCoverage,
  type InstalledAddon,
} from '@novacast/core';
import { appBrand } from '@novacast/ui';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAddonStore, useStores } from '../providers/storeHooks';

const STARTER_ADDONS = [
  {
    name: 'Cinemeta',
    url: 'https://v3-cinemeta.strem.io/manifest.json',
    description: 'Metadata for movies and series — titles, posters, ratings, and more.',
    category: 'Discovery',
  },
  {
    name: 'OpenSubtitles',
    url: 'https://opensubtitles-v3.strem.io/manifest.json',
    description: 'Subtitle support for thousands of titles in multiple languages.',
    category: 'Captions',
  },
] as const;

interface AddonPreviewState {
  transportUrl: string;
  manifest: InstalledAddon['manifest'];
  capabilities: ReturnType<typeof summarizeAddonCapabilities>;
  likelyLiveCatalogs: number;
  likelySportsCatalogs: number;
  supportsLivePlayback: boolean;
}

export function AddonsPage() {
  const addons = useAddonStore((s) => s.addons);
  const installing = useAddonStore((s) => s.installing);
  const error = useAddonStore((s) => s.error);
  const { addonStore } = useStores();
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [showInstall, setShowInstall] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<AddonPreviewState | null>(null);

  useDocumentTitle('Sources');

  const coverage = useMemo(() => summarizeAddonCoverage(addons), [addons]);
  const playbackReady = coverage.playback > 0;

  const handleInstall = async () => {
    if (!url.trim()) return;
    await addonStore.getState().installAddon(url.trim());
    if (!addonStore.getState().error) {
      toast.success('Source installed successfully');
      setUrl('');
      setShowInstall(false);
      setPreview(null);
    } else {
      toast.error(addonStore.getState().error || 'Install failed');
    }
  };

  const handlePreview = async () => {
    if (!url.trim()) return;
    setPreviewing(true);
    try {
      const transportUrl = url.trim();
      const manifest = await addonTransportClient.fetchManifest(transportUrl);
      const capabilities = summarizeAddonCapabilities({ transportUrl, manifest });
      const likelyLiveCatalogs = (manifest.catalogs ?? []).filter((catalog) =>
        /live|tv|channel|event|sports/i.test(`${catalog.id} ${catalog.name ?? ''} ${(catalog.genres ?? []).join(' ')}`),
      ).length;
      const likelySportsCatalogs = (manifest.catalogs ?? []).filter((catalog) =>
        /sport|match|league|football|soccer|basketball|baseball|hockey|mma|ufc|cricket|tennis|f1/i.test(
          `${catalog.id} ${catalog.name ?? ''} ${(catalog.genres ?? []).join(' ')}`,
        ),
      ).length;
      setPreview({
        transportUrl,
        manifest,
        capabilities,
        likelyLiveCatalogs,
        likelySportsCatalogs,
        supportsLivePlayback: capabilities.hasStream && (likelyLiveCatalogs > 0 || likelySportsCatalogs > 0),
      });
      toast.success(`Validated "${manifest.name}"`);
    } catch (e) {
      setPreview(null);
      toast.error(e instanceof Error ? e.message : 'Validation failed');
    } finally {
      setPreviewing(false);
    }
  };

  const handleUninstall = (addon: InstalledAddon) => {
    addonStore.getState().uninstallAddon(addon.transportUrl);
    toast.info(`Removed "${addon.manifest.name}"`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-display sm:text-4xl">
            Sources
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">
            Manage the sources that power your NovaCast experience. Add discovery, playback, and subtitle providers.
          </p>
        </div>
        <button
          onClick={() => setShowInstall((v) => !v)}
          className="btn-primary shrink-0"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Add Source
        </button>
      </div>

      {/* Coverage Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <CoverageStat label="Discovery" count={coverage.discovery} active={coverage.discovery > 0} description="Content catalogs" />
        <CoverageStat label="Playback" count={coverage.playback} active={playbackReady} description="Stream providers" />
        <CoverageStat label="Captions" count={coverage.captions} active={coverage.captions > 0} description="Subtitle sources" />
      </div>

      {/* Playback Warning */}
      {!playbackReady && addons.length > 0 && (
        <div className="rounded-xl border border-amber/20 bg-amber/8 px-4 py-3 text-sm">
          <p className="font-medium text-white">Playback source needed</p>
          <p className="mt-1 text-amber/80">
            You have discovery and subtitle sources, but need a playback source that returns HLS, DASH, or video file URLs to stream inside NovaCast.
          </p>
        </div>
      )}

      {/* Install Panel */}
      {showInstall && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 backdrop-blur-xl sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white font-display">Add a Source</h2>
            <button onClick={() => setShowInstall(false)} className="btn-icon" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            Paste a manifest URL to add a new source to NovaCast.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary pointer-events-none" />
              <input
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setPreview(null); }}
                placeholder="https://provider.example/manifest.json"
                className="w-full rounded-xl border border-white/8 bg-white/[0.04] pl-9 pr-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary transition-all focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/15"
                onKeyDown={(e) => e.key === 'Enter' && handleInstall()}
              />
            </div>
            <button
              onClick={() => void handlePreview()}
              disabled={previewing || !url.trim()}
              className="btn-secondary shrink-0 disabled:opacity-50"
            >
              {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Validate'}
            </button>
            <button
              onClick={handleInstall}
              disabled={installing || !url.trim()}
              className="btn-primary shrink-0 disabled:opacity-50"
            >
              {installing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Install'}
            </button>
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-error/20 bg-error/10 px-3 py-2.5 text-sm text-error">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}

          {/* Preview Result */}
          {preview && (
            <div className="mt-4 rounded-xl border border-accent/20 bg-accent/5 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-white">{preview.manifest.name}</p>
                <RoleBadge role={preview.capabilities.role} />
                <span className="text-xs text-text-tertiary">v{preview.manifest.version}</span>
              </div>
              <p className="mt-2 text-sm text-text-secondary">{preview.manifest.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {preview.capabilities.resources.map((r: string) => (
                  <span key={r} className="rounded-full border border-white/8 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">{r}</span>
                ))}
                {preview.capabilities.types.map((t: string) => (
                  <span key={t} className="rounded-full bg-accent/10 border border-accent/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent">{t}</span>
                ))}
              </div>
              {preview.supportsLivePlayback && (
                <p className="mt-3 text-xs text-success">Supports live/sports content</p>
              )}
            </div>
          )}

          {/* Starter Sources */}
          <div className="mt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Quick add
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {STARTER_ADDONS.map((addon) => {
                const isInstalled = addons.some((item) => item.transportUrl === addon.url);
                return (
                  <button
                    key={addon.url}
                    onClick={() => !isInstalled && setUrl(addon.url)}
                    disabled={isInstalled}
                    className={`w-full cursor-pointer rounded-xl border px-4 py-3 text-left transition-all ${
                      isInstalled
                        ? 'border-success/20 bg-success/5'
                        : 'border-white/8 bg-white/[0.02] hover:border-white/14 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white">{addon.name}</span>
                      {isInstalled ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <ExternalLink className="h-3.5 w-3.5 text-text-tertiary" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-text-secondary">{addon.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Installed Sources List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white font-display">
          Installed Sources ({addons.length})
        </h2>
        {addons.length === 0 ? (
          <EmptyState
            icon={<Puzzle className="h-8 w-8" aria-hidden="true" />}
            title="No sources installed"
            description="Add discovery, playback, and subtitle sources to start streaming with NovaCast."
            action={
              <button onClick={() => setShowInstall(true)} className="btn-primary">
                <Plus className="h-4 w-4" /> Add your first source
              </button>
            }
          />
        ) : (
          addons.map((addon) => (
            <AddonCard key={addon.transportUrl} addon={addon} onUninstall={() => handleUninstall(addon)} />
          ))
        )}
      </div>

      {/* Legal Footer */}
      <p className="text-xs leading-5 text-text-tertiary px-1">
        {appBrand.legalBoundary}
      </p>
    </div>
  );
}

function CoverageStat({ label, count, active, description }: { label: string; count: number; active: boolean; description: string }) {
  return (
    <div className={`rounded-xl border p-4 transition-colors ${active ? 'border-success/20 bg-success/5' : 'border-white/6 bg-white/[0.02]'}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">{label}</p>
          <p className="mt-0.5 text-xs text-text-tertiary">{description}</p>
        </div>
        <span className={`text-2xl font-bold tabular-nums ${active ? 'text-success' : 'text-text-tertiary'}`}>{count}</span>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    hybrid: 'bg-accent/10 border-accent/20 text-accent',
    playback: 'bg-success/10 border-success/20 text-success',
    captions: 'bg-amber/10 border-amber/20 text-amber',
    discovery: 'bg-secondary-accent/10 border-secondary-accent/20 text-secondary-accent',
  };
  const cls = colors[role] || 'bg-white/5 border-white/10 text-text-tertiary';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cls}`}>
      {role}
    </span>
  );
}

function AddonCard({ addon, onUninstall }: { addon: InstalledAddon; onUninstall: () => void }) {
  const summary = summarizeAddonCapabilities(addon);

  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.02] p-4 transition-all hover:border-white/10 hover:bg-white/[0.03] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/8 bg-white/[0.04]">
            {addon.manifest.logo ? (
              <img src={addon.manifest.logo} alt="" className="h-full w-full object-cover" />
            ) : (
              <Puzzle className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-white">{addon.manifest.name}</h3>
              <RoleBadge role={summary.role} />
              <span className="text-xs text-text-tertiary">v{addon.manifest.version}</span>
            </div>
            <p className="mt-1 text-sm text-text-secondary line-clamp-2">{addon.manifest.description}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {summary.resources.map((r) => (
                <span key={r} className="rounded-full border border-white/6 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">{r}</span>
              ))}
              {summary.types.map((t) => (
                <span key={t} className="rounded-full bg-accent/8 border border-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-text-accent">{t}</span>
              ))}
              {summary.searchable && (
                <span className="rounded-full border border-white/6 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">search</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onUninstall}
          className="shrink-0 rounded-lg p-2 text-text-tertiary transition-colors hover:bg-error/10 hover:text-error cursor-pointer"
          aria-label={`Remove ${addon.manifest.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
