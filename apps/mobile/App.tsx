import { useEffect, useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { DEFAULT_ADDON_URLS, addonTransportClient } from '@novacast/core';
import {
  getMissingFirebaseConfigKeys,
  readFirebaseConfigFromRecord,
} from '@novacast/firebase';
import { appTheme, primaryNavItems, platformWorkspaces } from '@novacast/ui';

type TabId = 'home' | 'search' | 'addons' | 'settings';

interface InstalledAddonPreview {
  transportUrl: string;
  name: string;
  version: string;
  description: string;
}

const tabIds: TabId[] = ['home', 'search', 'addons', 'settings'];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [query, setQuery] = useState('');
  const [addonUrl, setAddonUrl] = useState('');
  const [addons, setAddons] = useState<InstalledAddonPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      try {
        const manifests = await Promise.all(
          DEFAULT_ADDON_URLS.map(async (transportUrl) => {
            const manifest = await addonTransportClient.fetchManifest(transportUrl);
            return {
              transportUrl,
              name: manifest.name,
              version: manifest.version,
              description: manifest.description,
            } satisfies InstalledAddonPreview;
          }),
        );

        if (!cancelled) {
          setAddons(manifests);
          setError(null);
        }
      } catch (bootstrapError) {
        if (!cancelled) {
          setError(
            bootstrapError instanceof Error
              ? bootstrapError.message
              : 'Failed to load starter addons.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const envSource = ((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}) as Record<string, string | undefined>;
  const firebaseConfig = readFirebaseConfigFromRecord(envSource, 'EXPO_PUBLIC_');
  const missingFirebaseKeys = getMissingFirebaseConfigKeys(firebaseConfig);

  const filteredAddons = useMemo(() => {
    if (!query.trim()) return addons;
    const needle = query.trim().toLowerCase();
    return addons.filter((addon: InstalledAddonPreview) =>
      [addon.name, addon.description, addon.version]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [addons, query]);

  const installAddon = async () => {
    if (!addonUrl.trim()) return;

    setInstalling(true);
    setError(null);
    try {
      const manifest = await addonTransportClient.fetchManifest(addonUrl.trim());
      setAddons((current: InstalledAddonPreview[]) => {
        const next = current.filter((item: InstalledAddonPreview) => item.name !== manifest.name);
        next.unshift({
          transportUrl: addonUrl.trim(),
          name: manifest.name,
          version: manifest.version,
          description: manifest.description,
        });
        return next;
      });
      setAddonUrl('');
      setActiveTab('addons');
    } catch (installError) {
      setError(
        installError instanceof Error ? installError.message : 'Failed to install addon.',
      );
    } finally {
      setInstalling(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: appTheme.colors.bgPrimary }}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[appTheme.colors.bgPrimary, appTheme.colors.bgSecondary]}
        style={{ flex: 1 }}
      >
        <View style={{ paddingHorizontal: appTheme.spacing.xl, paddingTop: appTheme.spacing.lg }}>
          <Text style={{ color: appTheme.colors.textPrimary, fontSize: 30, fontWeight: '700' }}>
            NovaCast Mobile
          </Text>
          <Text style={{ color: appTheme.colors.textSecondary, marginTop: 6 }}>
            Mobile companion for iOS and Android, powered by the shared NovaCast source workflow.
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: appTheme.spacing.xl, paddingVertical: appTheme.spacing.lg }}>
          {tabIds.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: appTheme.radius.lg,
                backgroundColor:
                  activeTab === tab ? appTheme.colors.accent : appTheme.colors.bgTertiary,
              }}
            >
              <Text style={{ color: appTheme.colors.textPrimary, fontWeight: '600' }}>
                {tab[0].toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView contentContainerStyle={{ padding: appTheme.spacing.xl, gap: appTheme.spacing.xl }}>
          {activeTab === 'home' && (
            <View style={{ gap: appTheme.spacing.xl }}>
              <HeroCard />
              <Section title="Workspace map">
                {platformWorkspaces.map((workspace) => (
                  <InfoCard
                    key={workspace.id}
                    title={workspace.name}
                    body={workspace.description}
                    meta={workspace.workspacePath}
                  />
                ))}
              </Section>
            </View>
          )}

          {activeTab === 'search' && (
            <Section title="Search installed addons">
              <Input
                value={query}
                onChangeText={setQuery}
                placeholder="Search by addon name or description"
              />
              {filteredAddons.map((addon: InstalledAddonPreview) => (
                <InfoCard
                  key={addon.transportUrl}
                  title={addon.name}
                  body={addon.description}
                  meta={`v${addon.version}`}
                />
              ))}
              {!loading && filteredAddons.length === 0 && (
                <EmptyState label="No addon results for this search." />
              )}
            </Section>
          )}

          {activeTab === 'addons' && (
            <Section title="Addon manager">
              <Input
                value={addonUrl}
                onChangeText={setAddonUrl}
                placeholder="Paste addon manifest URL"
                autoCapitalize="none"
              />
              <PrimaryButton
                label={installing ? 'Installing…' : 'Install addon'}
                onPress={installAddon}
                disabled={installing || !addonUrl.trim()}
              />
              {loading ? (
                <EmptyState label="Loading starter addons…" />
              ) : (
                addons.map((addon: InstalledAddonPreview) => (
                  <InfoCard
                    key={addon.transportUrl}
                    title={addon.name}
                    body={addon.description}
                    meta={`${addon.transportUrl} · v${addon.version}`}
                  />
                ))
              )}
            </Section>
          )}

          {activeTab === 'settings' && (
            <Section title="Environment readiness">
              <InfoCard
                title="Firebase"
                body={
                  missingFirebaseKeys.length === 0
                    ? 'Expo public Firebase values are configured.'
                    : `Missing values: ${missingFirebaseKeys.join(', ')}`
                }
                meta={missingFirebaseKeys.length === 0 ? 'Ready' : 'Needs setup'}
              />
              <Section title="Primary navigation model">
                {primaryNavItems.map((item) => (
                  <InfoCard
                    key={item.to}
                    title={item.label}
                    body={`Shared route: ${item.to}`}
                    meta={item.icon}
                  />
                ))}
              </Section>
            </Section>
          )}

          {error && <ErrorCard message={error} />}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

function HeroCard() {
  return (
    <LinearGradient
      colors={['#2a1f4d', '#101323']}
      style={{ borderRadius: appTheme.radius.xl, padding: appTheme.spacing.xl, gap: 8 }}
    >
      <Text style={{ color: appTheme.colors.textAccent, fontWeight: '700' }}>MOBILE COMPANION</Text>
      <Text style={{ color: appTheme.colors.textPrimary, fontSize: 24, fontWeight: '700' }}>
        Shared NovaCast logic, native surfaces.
      </Text>
      <Text style={{ color: appTheme.colors.textSecondary }}>
        This app reuses the monorepo core for addon management, settings, and auth wiring while keeping mobile-specific layout and input ergonomics separate.
      </Text>
    </LinearGradient>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: appTheme.colors.textPrimary, fontSize: 18, fontWeight: '600' }}>
        {title}
      </Text>
      <View style={{ gap: 12 }}>{children}</View>
    </View>
  );
}

function InfoCard({ title, body, meta }: { title: string; body: string; meta?: string }) {
  return (
    <View
      style={{
        backgroundColor: appTheme.colors.bgSecondary,
        borderRadius: appTheme.radius.lg,
        borderWidth: 1,
        borderColor: appTheme.colors.border,
        padding: appTheme.spacing.lg,
        gap: 6,
      }}
    >
      <Text style={{ color: appTheme.colors.textPrimary, fontSize: 16, fontWeight: '600' }}>{title}</Text>
      <Text style={{ color: appTheme.colors.textSecondary }}>{body}</Text>
      {meta ? <Text style={{ color: appTheme.colors.textTertiary, fontSize: 12 }}>{meta}</Text> : null}
    </View>
  );
}

function Input(props: ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={appTheme.colors.textTertiary}
      style={{
        backgroundColor: appTheme.colors.bgTertiary,
        color: appTheme.colors.textPrimary,
        borderRadius: appTheme.radius.lg,
        borderWidth: 1,
        borderColor: appTheme.colors.border,
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
      {...props}
    />
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: disabled ? appTheme.colors.bgHover : appTheme.colors.accent,
        borderRadius: appTheme.radius.lg,
        paddingVertical: 12,
        paddingHorizontal: 16,
      }}
    >
      <Text style={{ color: appTheme.colors.textPrimary, textAlign: 'center', fontWeight: '700' }}>
        {label}
      </Text>
    </Pressable>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <View style={{ paddingVertical: 16 }}>
      <Text style={{ color: appTheme.colors.textTertiary }}>{label}</Text>
    </View>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <View
      style={{
        backgroundColor: '#3b0d14',
        borderRadius: appTheme.radius.lg,
        borderWidth: 1,
        borderColor: appTheme.colors.error,
        padding: appTheme.spacing.lg,
      }}
    >
      <Text style={{ color: '#ffd7dc', fontWeight: '600' }}>Action needed</Text>
      <Text style={{ color: '#ffd7dc', marginTop: 4 }}>{message}</Text>
    </View>
  );
}
