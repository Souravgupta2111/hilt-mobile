import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { KeyRound, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/theme';

function parseUrlParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  try {
    const hashIndex = url.indexOf('#');
    const queryIndex = url.indexOf('?');
    const targetString =
      hashIndex !== -1 ? url.slice(hashIndex + 1) : queryIndex !== -1 ? url.slice(queryIndex + 1) : '';
    if (!targetString) return params;

    targetString.split('&').forEach((part) => {
      const [k, v] = part.split('=');
      if (k && v) {
        params[decodeURIComponent(k)] = decodeURIComponent(v);
      }
    });
  } catch (e) {
    console.error('Error parsing reset URL parameters:', e);
  }
  return params;
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function initRecovery() {
      try {
        const url = await Linking.getInitialURL();
        if (url) {
          const params = parseUrlParams(url);
          if (params.access_token && params.refresh_token) {
            await supabase.auth.setSession({
              access_token: params.access_token,
              refresh_token: params.refresh_token,
            });
          } else if (params.code) {
            await supabase.auth.exchangeCodeForSession(params.code);
          }
        }
      } catch (e) {
        console.error('Recovery session error:', e);
      } finally {
        setReady(true);
      }
    }
    initRecovery();
  }, []);

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primaryBlack} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {success ? (
            <View style={styles.successBox}>
              <CheckCircle2 size={48} color="#15803D" />
              <Text style={styles.successTitle}>Password Updated</Text>
              <Text style={styles.successSubtitle}>
                Your account password has been changed. You can now use your new password to sign in.
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.replace('/(tabs)/profile')}
                activeOpacity={0.88}
              >
                <Text style={styles.primaryBtnText}>Continue to Profile</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formBox}>
              <View style={styles.iconCircle}>
                <KeyRound size={28} color={Colors.primaryBlack} />
              </View>
              <Text style={styles.title}>Create new password</Text>
              <Text style={styles.subtitle}>
                Choose a strong password with at least 6 characters.
              </Text>

              <Text style={styles.label}>New password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />

              <Text style={styles.label}>Confirm new password</Text>
              <TextInput
                style={styles.input}
                placeholder="Re-enter new password"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleUpdatePassword}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.textWhite} />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Update Password</Text>
                    <ArrowRight size={18} color={Colors.textWhite} />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => router.replace('/(tabs)/profile')}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  keyboardView: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  formBox: {
    width: '100%',
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: Colors.primaryBlack,
    borderRadius: 9999,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  primaryBtnText: {
    color: Colors.textWhite,
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    marginTop: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  successBox: {
    alignItems: 'center',
    textAlign: 'center',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
});
