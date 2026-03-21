import { useEffect, useMemo, useState, type ComponentProps } from 'react';
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
import { appTheme, mobileNavItems } from '@novacast/ui';

type SectionId = 'browse' | 'addons' | 'settings';

interface AddonTile {
  transportUrl: string;
  name: string;
  description: string;
}

export default function App() {
  const [section, setSection] = useState<SectionId>('browse');
  const [addonUrl, setAddonUrl] = useState('');
  const [addons, setAddons] = useState<AddonTile[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadAddons() {
      try {
        const results = await Promise.all(
          DEFAULT_ADDON_URLS.map(async (transportUrl) => {
            const manifest = await addonTransportClient.fetchManifest(transportUrl);
            return {
              transportUrl,
              name: manifest.name,
              description: manifest.description,
            } satisfies AddonTile;
          }),
        );

        if (mounted) {
          setAddons(results);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load TV starter addons.');
        }
      }
    }

    void loadAddons();

    return () => {
      mounted = false;
    };
  }, []);

  const envSource = ((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}) as Record<string, string | undefined>;
  const firebaseConfig = readFirebaseConfigFromRecord(envSource, 'EXPO_PUBLIC_');
  const missingFirebaseKeys = getMissingFirebaseConfigKeys(firebaseConfig);

  const rails = useMemo(
    () => [
      {
        id: 'continue',
        title: 'Continue watching',
        items: addons.map((addon: AddonTile) => ({
          id: `${addon.name}-continue`,
          title: addon.name,
          description: addon.description,
        })),
      },
      {
        id: 'explore',
        title: 'Explore routes',
        items: mobileNavItems.map((item) => ({
          id: `${item.label}-route`,
          title: item.label,
          description: item.to,
        })),
      },
    ],
    [addons],
  );

  const installAddon = async () => {
    if (!addonUrl.trim()) return;

    try {
      const manifest = await addonTransportClient.fetchManifest(addonUrl.trim());
      setAddons((current: AddonTile[]) => [
        {
          transportUrl: addonUrl.trim(),
          name: manifest.name,
          description: manifest.description,
        },
        ...current.filter((item: AddonTile) => item.transportUrl !== addonUrl.trim()),
      ]);
      setAddonUrl('');
      setSection('addons');
      setError(null);
    } catch (installError) {
      setError(installError instanceof Error ? installError.message : 'Failed to install addon.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: appTheme.colors.bgPrimary }}>
      <StatusBar style="light" />
      <LinearGradient colors={['#09090f', '#12121a']} style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 28, paddingTop: 20 }}>
          <Text style={{ color: appTheme.colors.textAccent, fontSize: 14, fontWeight: '700' }}>
            LIVING ROOM
          </Text>
          <Text style={{ color: appTheme.colors.textPrimary, fontSize: 34, fontWeight: '700', marginTop: 6 }}>
            NovaCast Living Room
          </Text>
          <Text style={{ color: appTheme.colors.textSecondary, marginTop: 8, maxWidth: 720 }}>
            Focus-first TV experience for Android TV / Fire TV, aligned with NovaCast playback, source, and settings contracts.
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 28, paddingTop: 20 }}>
          {(['browse', 'addons', 'settings'] as SectionId[]).map((item) => (
            <FocusableChip
              key={item}
              label={item[0].toUpperCase() + item.slice(1)}
              active={section === item}
              onFocus={() => setFocusedId(item)}
              onPress={() => setSection(item)}
              focused={focusedId === item}
            />
          ))}
        </View>

        <ScrollView contentContainerStyle={{ padding: 28, gap: 24 }}>
          {section === 'browse' && rails.map((rail) => (
            <View key={rail.id} style={{ gap: 14 }}>
              <Text style={{ color: appTheme.colors.textPrimary, fontSize: 22, fontWeight: '700' }}>
                {rail.title}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 18 }}>
                  {rail.items.map((item) => (
                    <FocusableTile
                      key={item.id}
                      title={item.title}
                      description={item.description}
                      focused={focusedId === item.id}
                      onFocus={() => setFocusedId(item.id)}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          ))}

          {section === 'addons' && (
            <View style={{ gap: 16 }}>
              <Input value={addonUrl} onChangeText={setAddonUrl} placeholder="Paste addon manifest URL" />
              <FocusableChip
                label="Install addon"
                active
                focused={focusedId === 'install-addon'}
                onFocus={() => setFocusedId('install-addon')}
                onPress={installAddon}
              />
              {addons.map((addon: AddonTile) => (
                <FocusableTile
                  key={addon.transportUrl}
                  title={addon.name}
                  description={addon.description}
                  focused={focusedId === addon.transportUrl}
                  onFocus={() => setFocusedId(addon.transportUrl)}
                />
              ))}
            </View>
          )}

          {section === 'settings' && (
            <View style={{ gap: 16 }}>
              <FocusableTile
                title="Firebase env"
                description={
                  missingFirebaseKeys.length === 0
                    ? 'Configured for Expo TV usage.'
                    : `Missing values: ${missingFirebaseKeys.join(', ')}`
                }
                focused={focusedId === 'firebase'}
                onFocus={() => setFocusedId('firebase')}
              />
              <FocusableTile
                title="Remote guidance"
                description="Use left/right/up/down to move focus and press select to activate actions. Keep back navigation mapped consistently on every screen."
                focused={focusedId === 'remote'}
                onFocus={() => setFocusedId('remote')}
              />
            </View>
          )}

          {error ? (
            <View style={{ backgroundColor: '#3b0d14', borderColor: appTheme.colors.error, borderWidth: 1, borderRadius: appTheme.radius.lg, padding: 16 }}>
              <Text style={{ color: '#ffd7dc', fontWeight: '700' }}>TV shell error</Text>
              <Text style={{ color: '#ffd7dc', marginTop: 6 }}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

function FocusableChip({
  label,
  active,
  focused,
  onFocus,
  onPress,
}: {
  label: string;
  active?: boolean;
  focused?: boolean;
  onFocus?: () => void;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onFocus={onFocus}
      onPress={onPress}
      style={{
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: appTheme.radius.lg,
        backgroundColor: active ? appTheme.colors.accent : appTheme.colors.bgTertiary,
        borderWidth: focused ? 2 : 1,
        borderColor: focused ? '#ffffff' : appTheme.colors.border,
        transform: [{ scale: focused ? 1.05 : 1 }],
      }}
    >
      <Text style={{ color: appTheme.colors.textPrimary, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

function FocusableTile({
  title,
  description,
  focused,
  onFocus,
}: {
  title: string;
  description: string;
  focused?: boolean;
  onFocus?: () => void;
}) {
  return (
    <Pressable
      onFocus={onFocus}
      style={{
        width: 320,
        minHeight: 180,
        borderRadius: appTheme.radius.xl,
        padding: 20,
        backgroundColor: focused ? appTheme.colors.bgElevated : appTheme.colors.bgSecondary,
        borderWidth: focused ? 2 : 1,
        borderColor: focused ? '#ffffff' : appTheme.colors.border,
        transform: [{ scale: focused ? 1.04 : 1 }],
      }}
    >
      <Text style={{ color: appTheme.colors.textPrimary, fontSize: 22, fontWeight: '700' }}>{title}</Text>
      <Text style={{ color: appTheme.colors.textSecondary, marginTop: 10, lineHeight: 22 }}>{description}</Text>
    </Pressable>
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
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 18,
      }}
      {...props}
    />
  );
}
