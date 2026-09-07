import { Component, type ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/theme';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
const ANALYTICS_URL = process.env.EXPO_PUBLIC_ANALYTICS_URL || '';
const ANALYTICS_KEY = process.env.EXPO_PUBLIC_ANALYTICS_KEY || '';

let sentry: any = null;
if (SENTRY_DSN) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sentry = require('@sentry/react-native');
    sentry.init({ dsn: SENTRY_DSN });
  } catch {
    sentry = null;
  }
}

export function reportError(err: unknown, context?: Record<string, any>) {
  try {
    if (sentry) sentry.captureException(err, context ? { extra: context } : undefined);
    else console.error('[error]', err, context || '');
  } catch {
    // never crash the app from reporting
  }
}

export async function track(event: string, props?: Record<string, any>) {
  try {
    if (!ANALYTICS_URL || !ANALYTICS_KEY) return;
    await fetch(ANALYTICS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANALYTICS_KEY },
      body: JSON.stringify({ event, props: props || {}, at: new Date().toISOString() }),
    }).catch(() => {});
  } catch {
    // analytics must never break flows
  }
}

interface Props { children: ReactNode; }
interface State { crashed: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch(error: unknown) { reportError(error, { where: 'root' }); }
  render() {
    if (!this.state.crashed) return this.props.children as ReactNode;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.sub}>Restart the app to continue. Your trips and bookings are safe.</Text>
        <TouchableOpacity style={styles.button} onPress={() => this.setState({ crashed: false })}>
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#FFFFFF' },
  title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  button: { backgroundColor: Colors.primaryBlack, borderRadius: 9999, paddingHorizontal: 28, paddingVertical: 13, marginTop: 20 },
  buttonText: { color: Colors.textWhite, fontSize: 14, fontWeight: '700' },
});
