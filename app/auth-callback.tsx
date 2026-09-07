import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/theme';

function parseUrlParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  try {
    const hashIndex = url.indexOf('#');
    const queryIndex = url.indexOf('?');
    const targetString = hashIndex !== -1 ? url.slice(hashIndex + 1) : queryIndex !== -1 ? url.slice(queryIndex + 1) : '';
    if (!targetString) return params;

    targetString.split('&').forEach((part) => {
      const [k, v] = part.split('=');
      if (k && v) {
        params[decodeURIComponent(k)] = decodeURIComponent(v);
      }
    });
  } catch (e) {
    console.error('Error parsing auth URL parameters:', e);
  }
  return params;
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function processCallback() {
      try {
        const url = await Linking.getInitialURL();
        if (!url) {
          // Check if session already active
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            router.replace('/(tabs)/profile');
          } else {
            router.replace('/(tabs)');
          }
          return;
        }

        const params = parseUrlParams(url);

        if (params.error_description || params.error) {
          if (mounted) {
            setErrorMessage(params.error_description || params.error || 'Authentication was cancelled.');
          }
          return;
        }

        if (params.access_token && params.refresh_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          if (error) throw error;

          if (data.user) {
            // Ensure profile exists
            const { data: profile } = await supabase.from('profiles').select('id').eq('id', data.user.id).single();
            if (!profile) {
              await supabase.from('profiles').insert([
                {
                  id: data.user.id,
                  full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || 'Hilt Traveler',
                  email: data.user.email || null,
                  role: 'traveler',
                  terms_accepted_at: new Date().toISOString(),
                },
              ]);
            }
          }
          router.replace('/(tabs)/profile');
          return;
        }

        if (params.code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
          if (error) throw error;
          if (data.user) {
            const { data: profile } = await supabase.from('profiles').select('id').eq('id', data.user.id).single();
            if (!profile) {
              await supabase.from('profiles').insert([
                {
                  id: data.user.id,
                  full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || 'Hilt Traveler',
                  email: data.user.email || null,
                  role: 'traveler',
                  terms_accepted_at: new Date().toISOString(),
                },
              ]);
            }
          }
          router.replace('/(tabs)/profile');
          return;
        }

        // Fallback: check session or redirect
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.replace('/(tabs)/profile');
        } else {
          router.replace('/(tabs)');
        }
      } catch (err: any) {
        if (mounted) {
          setErrorMessage(err.message || 'Social sign-in failed. Please try again.');
        }
      }
    }

    processCallback();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <View style={styles.container}>
      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Sign-in Issue</Text>
          <Text style={styles.errorDescription}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.replace('/(tabs)/profile')}>
            <Text style={styles.retryBtnText}>Return to Profile</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.primaryBlack} />
          <Text style={styles.loadingText}>Completing authentication...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingBox: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  errorBox: {
    alignItems: 'center',
    maxWidth: 320,
    backgroundColor: '#FEF2F2',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 14,
    color: '#7F1D1D',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: Colors.primaryBlack,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  retryBtnText: {
    color: Colors.textWhite,
    fontSize: 13,
    fontWeight: '700',
  },
});
