import { Linking } from 'react-native';
import { router } from 'expo-router';

// Normalizes https://hilt.travel/stay/<uuid> (and other web paths) into the
// app's native routes so universal links land on real screens. Custom scheme
// links (hilt://...) are handled natively by expo-router already.

const WEB_TO_APP: Array<{ prefix: string; to: (id: string) => string }> = [
  { prefix: '/stay/', to: (id) => `/property/${id}` },
  { prefix: '/trip/', to: () => '/(tabs)/trips' },
  { prefix: '/plan/', to: () => '/(tabs)/itineraries' },
];

export function routeWebUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'hilt.travel') return false;
    const path = parsed.pathname;
    for (const { prefix, to } of WEB_TO_APP) {
      if (path.startsWith(prefix)) {
        const id = path.slice(prefix.length).split('/')[0] || '';
        router.push(to(id) as any);
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/** Call once from the root layout. Returns the unsubscribe function. */
export function initDeepLinks(): () => void {
  const sub = Linking.addEventListener('url', ({ url }) => {
    routeWebUrl(url);
  });
  Linking.getInitialURL().then((url) => {
    if (url) routeWebUrl(url);
  });
  return () => sub.remove();
}
