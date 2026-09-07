import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase, getAuthUser } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Registers this device for push. Safe to call on every launch; no-ops on failure. */
export async function registerPushToken(): Promise<void> {
  try {
    const user = await getAuthUser();
    if (!user) return;
    const { status: existing } = await Notifications.getPermissionsAsync();
    const { status } =
      existing === 'granted' ? { status: existing } : await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    if (!token) return;
    await supabase.from('push_tokens').upsert(
      { user_id: user.id, token, platform: Platform.OS, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  } catch (err) {
    console.error('Push registration failed:', err);
  }
}

/** Asks the send-push edge function to notify. Fire-and-forget from UI flows. */
export async function requestPush(action: string, payload: Record<string, any>): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.functions.invoke('send-push', {
      body: { action, ...payload },
    });
  } catch (err) {
    console.error('Push request failed:', err);
  }
}
