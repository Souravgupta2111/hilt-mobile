import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Linking,
} from 'react-native';
import { X, Mail, Phone, ArrowRight, ShieldCheck, Check, KeyRound } from 'lucide-react-native';
import { supabase, resetPasswordForEmail } from '../lib/supabase';
import { registerPushToken } from '../lib/push';
import { LegalModal, type LegalDoc } from './LegalModal';
import { Colors } from '../constants/theme';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export function AuthModal({ visible, onClose, onSuccess }: AuthModalProps) {
  const [authMode, setAuthMode] = useState<'options' | 'email' | 'phone' | 'reset'>('options');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null);

  const resetState = () => {
    setAuthMode('options');
    setIsSignUp(false);
    setEmail('');
    setPassword('');
    setPhoneNumber('');
    setOtpCode('');
    setOtpSent(false);
    setLoading(false);
    setAgreed(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const stampConsent = async (userId: string) => {
    await supabase
      .from('profiles')
      .update({ terms_accepted_at: new Date().toISOString() })
      .eq('id', userId);
  };

  const finishAuth = (user: any) => {
    stampConsent(user.id).catch(() => { });
    registerPushToken().catch(() => { });
    onSuccess(user);
    handleClose();
  };

  const requireConsent = () => {
    if (!agreed) {
      Alert.alert('One tap needed', 'Please accept the Terms & Privacy Policy to continue.');
      return false;
    }
    return true;
  };

  const ensureProfile = async (userId: string, fallbackName?: string) => {
    const { data } = await supabase.from('profiles').select('id').eq('id', userId).single();
    if (data) return;
    await supabase.from('profiles').insert([
      {
        id: userId,
        full_name: fallbackName || 'Hilt Traveler',
        email: email || null,
        phone: phoneNumber ? `+91 ${phoneNumber}` : null,
        role: 'traveler',
        terms_accepted_at: new Date().toISOString(),
      },
    ]);
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Enter your email and password.');
      return;
    }
    if (!requireConsent()) return;
    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (data.user) {
          await ensureProfile(data.user.id, email.split('@')[0]);
        }
        Alert.alert('Account created', 'Welcome to Hilt.');
        finishAuth(data.user);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        finishAuth(data.user);
      }
    } catch (e: any) {
      Alert.alert('Sign in failed', e.message || 'Check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length !== 10) {
      Alert.alert('Invalid number', 'Enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: `+91${digits}`,
      });
      if (error) throw error;
      setOtpSent(true);
    } catch (e: any) {
      Alert.alert('Could not send OTP', e.message || 'Try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (otpCode.trim().length !== 6) {
      Alert.alert('Invalid OTP', 'Enter the 6-digit code sent by SMS.');
      return;
    }
    if (!requireConsent()) return;
    setLoading(true);
    try {
      const digits = phoneNumber.replace(/\D/g, '');
      const { data, error } = await supabase.auth.verifyOtp({
        phone: `+91${digits}`,
        token: otpCode.trim(),
        type: 'sms',
      });
      if (error) throw error;
      if (data.user) {
        await ensureProfile(data.user.id, 'Hilt Traveler');
      }
      finishAuth(data.user);
    } catch (e: any) {
      Alert.alert('Verification failed', e.message || 'Check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Enter your account email to receive a password reset link.');
      return;
    }
    setLoading(true);
    try {
      await resetPasswordForEmail(email.trim());
      Alert.alert(
        'Reset Link Sent',
        `A password recovery link has been sent to ${email.trim()}. Follow the instructions in your inbox.`,
        [{ text: 'OK', onPress: () => setAuthMode('email') }]
      );
    } catch (e: any) {
      Alert.alert('Reset Failed', e.message || 'Could not send reset link. Check your email address.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    if (!requireConsent()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: 'hilt://auth-callback',
        },
      });
      if (error) throw error;
      if (data?.url) {
        await Linking.openURL(data.url);
      }
    } catch (e: any) {
      Alert.alert(
        `${provider === 'apple' ? 'Apple' : 'Google'} Sign-in`,
        e.message || 'Could not start social authentication.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {authMode === 'options'
                ? 'Sign in'
                : authMode === 'email'
                  ? isSignUp
                    ? 'Create account'
                    : 'Welcome back'
                  : authMode === 'reset'
                    ? 'Reset password'
                    : 'Mobile login'}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.brandBox}>
              <Text style={styles.brandTitle}>Himalayan stays, direct from hosts</Text>
              <Text style={styles.brandSubtitle}>Sign in to book, host, and manage trips.</Text>
            </View>

            {authMode === 'options' && (
              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={styles.methodButton}
                  onPress={() => setAuthMode('phone')}
                  activeOpacity={0.85}
                >
                  <Phone size={18} color={Colors.textPrimary} />
                  <Text style={styles.methodButtonText}>Continue with mobile OTP</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.methodButton}
                  onPress={() => setAuthMode('email')}
                  activeOpacity={0.85}
                >
                  <Mail size={18} color={Colors.textPrimary} />
                  <Text style={styles.methodButtonText}>Continue with email</Text>
                </TouchableOpacity>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or continue with</Text>
                  <View style={styles.dividerLine} />
                </View>

                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={[styles.methodButton, styles.appleButton]}
                    onPress={() => handleOAuth('apple')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.appleGlyph}></Text>
                    <Text style={styles.appleButtonText}>Continue with Apple</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.methodButton}
                  onPress={() => handleOAuth('google')}
                  activeOpacity={0.85}
                >
                  <View style={styles.googleIconWrap}>
                    <Text style={styles.googleGlyph}>G</Text>
                  </View>
                  <Text style={styles.methodButtonText}>Continue with Google</Text>
                </TouchableOpacity>

                <View style={styles.trustBadgeRow}>
                  <ShieldCheck size={16} color="#15803D" />
                  <Text style={styles.trustBadgeText}>Verified hosts · Secure payments</Text>
                </View>
              </View>
            )}

            {authMode === 'email' && (
              <View style={styles.formContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />

                {!isSignUp && (
                  <TouchableOpacity
                    style={styles.forgotBtn}
                    onPress={() => setAuthMode('reset')}
                  >
                    <Text style={styles.forgotText}>Forgot password?</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.primaryAuthButton}
                  onPress={handleEmailAuth}
                  disabled={loading}
                  activeOpacity={0.88}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.textWhite} />
                  ) : (
                    <>
                      <Text style={styles.primaryAuthButtonText}>
                        {isSignUp ? 'Create account' : 'Sign in'}
                      </Text>
                      <ArrowRight size={18} color={Colors.textWhite} />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.switchModeButton}
                  onPress={() => setIsSignUp(!isSignUp)}
                >
                  <Text style={styles.switchModeText}>
                    {isSignUp ? 'Have an account? Sign in' : 'New here? Create account'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.backLink} onPress={() => setAuthMode('options')}>
                  <Text style={styles.backLinkText}>Back</Text>
                </TouchableOpacity>
              </View>
            )}

            {authMode === 'reset' && (
              <View style={styles.formContainer}>
                <Text style={styles.resetExplanation}>
                  Enter the email associated with your Hilt account and we'll send you a password recovery link.
                </Text>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <TouchableOpacity
                  style={styles.primaryAuthButton}
                  onPress={handleResetPassword}
                  disabled={loading}
                  activeOpacity={0.88}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.textWhite} />
                  ) : (
                    <>
                      <Text style={styles.primaryAuthButtonText}>Send reset link</Text>
                      <ArrowRight size={18} color={Colors.textWhite} />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.backLink} onPress={() => setAuthMode('email')}>
                  <Text style={styles.backLinkText}>Back to sign in</Text>
                </TouchableOpacity>
              </View>
            )}

            {authMode === 'phone' && (
              <View style={styles.formContainer}>
                {!otpSent ? (
                  <>
                    <Text style={styles.inputLabel}>Mobile number</Text>
                    <View style={styles.phoneInputRow}>
                      <View style={styles.countryCodeBadge}>
                        <Text style={styles.countryCodeText}>+91</Text>
                      </View>
                      <TextInput
                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                        placeholder="98160 00000"
                        placeholderTextColor={Colors.textMuted}
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        keyboardType="phone-pad"
                        maxLength={10}
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.primaryAuthButton}
                      onPress={handleSendPhoneOtp}
                      disabled={loading}
                      activeOpacity={0.88}
                    >
                      {loading ? (
                        <ActivityIndicator color={Colors.textWhite} />
                      ) : (
                        <>
                          <Text style={styles.primaryAuthButtonText}>Send OTP</Text>
                          <ArrowRight size={18} color={Colors.textWhite} />
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.inputLabel}>Enter OTP</Text>
                    <TextInput
                      style={[styles.input, styles.otpInput]}
                      placeholder="6-digit code"
                      placeholderTextColor={Colors.textMuted}
                      value={otpCode}
                      onChangeText={setOtpCode}
                      keyboardType="number-pad"
                      maxLength={6}
                    />

                    <TouchableOpacity
                      style={styles.primaryAuthButton}
                      onPress={handleVerifyPhoneOtp}
                      disabled={loading}
                      activeOpacity={0.88}
                    >
                      {loading ? (
                        <ActivityIndicator color={Colors.textWhite} />
                      ) : (
                        <>
                          <Text style={styles.primaryAuthButtonText}>Verify</Text>
                          <ShieldCheck size={18} color={Colors.textWhite} />
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setOtpSent(false)} style={{ marginTop: 12 }}>
                      <Text style={[styles.backLinkText, { textAlign: 'center' }]}>
                        Edit phone number
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity style={styles.backLink} onPress={() => setAuthMode('options')}>
                  <Text style={styles.backLinkText}>Back</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.consentRow} onPress={() => setAgreed(!agreed)}>
              <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
                {agreed && <Check size={14} color={Colors.textWhite} />}
              </View>
              <Text style={styles.consentText}>
                I agree to the{' '}
                <Text style={styles.consentLink} onPress={() => setLegalDoc('terms')}>
                  Terms
                </Text>
                {', '}
                <Text style={styles.consentLink} onPress={() => setLegalDoc('cancellation')}>
                  Cancellation Policy
                </Text>
                {' & '}
                <Text style={styles.consentLink} onPress={() => setLegalDoc('privacy')}>
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
        {legalDoc && (
          <LegalModal visible onClose={() => setLegalDoc(null)} initialDoc={legalDoc} />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surfaceLight },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.pillInactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  content: { paddingHorizontal: 22, paddingVertical: 24 },
  brandBox: { marginBottom: 24 },
  brandTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, lineHeight: 28 },
  brandSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 6 },
  optionsContainer: { gap: 12 },
  methodButton: {
    backgroundColor: Colors.pillInactive,
    height: 52,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  methodButtonText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  trustBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 18,
  },
  trustBadgeText: { fontSize: 12, color: '#15803D', fontWeight: '600' },
  formContainer: { marginTop: 8 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  input: {
    backgroundColor: Colors.pillInactive,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  otpInput: { fontSize: 20, letterSpacing: 4, textAlign: 'center', fontWeight: '700' as const },
  phoneInputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  countryCodeBadge: {
    backgroundColor: Colors.pillInactive,
    borderRadius: 16,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCodeText: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  primaryAuthButton: {
    backgroundColor: Colors.primaryBlack,
    height: 54,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryAuthButtonText: { color: Colors.textWhite, fontSize: 15, fontWeight: '700' },
  switchModeButton: { alignItems: 'center', marginTop: 18 },
  switchModeText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  backLink: { alignItems: 'center', marginTop: 20 },
  backLinkText: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 22, paddingHorizontal: 4 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: Colors.primaryBlack, borderColor: Colors.primaryBlack },
  consentText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  consentLink: { color: Colors.textPrimary, fontWeight: '700', textDecorationLine: 'underline' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 10, fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  appleButton: { backgroundColor: '#000000' },
  appleGlyph: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 2 },
  appleButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  googleIconWrap: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#4285F4', alignItems: 'center', justifyContent: 'center' },
  googleGlyph: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  forgotBtn: { alignItems: 'flex-end', marginTop: -6, marginBottom: 14 },
  forgotText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  resetExplanation: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 14 },
});
