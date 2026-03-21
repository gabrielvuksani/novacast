// ---------------------------------------------------------------------------
// NovaCast Platform Workspace Definitions
// ---------------------------------------------------------------------------

export type PlatformId = 'web' | 'mobile' | 'tv' | 'roku';
export type PlatformRuntime = 'react-web' | 'expo' | 'react-native-tv' | 'scenegraph';

export interface PlatformWorkspace {
  id: PlatformId;
  name: string;
  workspacePath: string;
  runtime: PlatformRuntime;
  description: string;
  features: string[];
}

export const platformWorkspaces: PlatformWorkspace[] = [
  {
    id: 'web',
    name: 'Web / Samsung TV',
    workspacePath: 'apps/web',
    runtime: 'react-web',
    description: 'Primary NovaCast experience with the advanced multi-format player and full feature set.',
    features: ['Multi-format player', 'Keyboard shortcuts', 'Picture-in-picture', 'Chromecast'],
  },
  {
    id: 'mobile',
    name: 'Mobile',
    workspacePath: 'apps/mobile',
    runtime: 'expo',
    description: 'Expo-powered shell for iOS and Android with native gestures and offline support.',
    features: ['Native gestures', 'Background playback', 'Downloads', 'AirPlay'],
  },
  {
    id: 'tv',
    name: 'Android TV / Fire TV',
    workspacePath: 'apps/tv',
    runtime: 'react-native-tv',
    description: 'Focus-driven 10-foot interface optimized for remote navigation and living-room playback.',
    features: ['D-pad navigation', 'Voice search', 'Leanback UI', 'HDR passthrough'],
  },
  {
    id: 'roku',
    name: 'Roku',
    workspacePath: 'apps/roku',
    runtime: 'scenegraph',
    description: 'BrightScript + SceneGraph channel with NovaCast branding and addon workflow support.',
    features: ['SceneGraph components', 'Roku voice', 'Deep linking', 'Instant resume'],
  },
];
