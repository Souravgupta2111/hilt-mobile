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
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { X, ShieldCheck, KeyRound, CheckCircle2, AlertCircle, Building2 } from 'lucide-react-native';
import { Colors } from '../constants/theme';
import { generateAadhaarOtp, verifyAadhaarOtp, AadhaarVerifyResult } from '../lib/sandbox-kyc';

interface AadhaarKycModalProps {
  visible: boolean;
  onClose: () => void;
  onVerified: (result: AadhaarVerifyResult) => void;
  userType?: 'host' | 'guest';
}

export function AadhaarKycModal({
  visible,
  onClose,
  onVerified,
  userType = 'host',
}: AadhaarKycModalProps) {
  const [step, setStep] = useState<'aadhaar' | 'otp' | 'success'>('aadhaar');
  const [aadhaarInput, setAadhaarInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kycResult, setKycResult] = useState<AadhaarVerifyResult | null>(null);

  const resetState = () => {
    setStep('aadhaar');
    setAadhaarInput('');
    setOtpInput('');
    setReferenceId('');
    setLoading(false);
    setError(null);
    setKycResult(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const formatAadhaar = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 12);
    const parts: string[] = [];
    for (let i = 0; i < digits.length; i += 4) {
      parts.push(digits.substring(i, i + 4));
    }
    return parts.join(' ');
  };

  const handleSendOtp = async () => {
    setError(null);
    const cleanNumber = aadhaarInput.replace(/\s+/g, '');
    if (cleanNumber.length !== 12) {
      setError('Enter a valid 12-digit Aadhaar number.');
      return;
    }

    setLoading(true);
    const res = await generateAadhaarOtp(cleanNumber);
    setLoading(false);

    if (res.success && res.referenceId) {
      setReferenceId(res.referenceId);
      setStep('otp');
    } else {
      setError(res.message);
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    if (!otpInput.trim() || otpInput.trim().length < 6) {
      setError('Enter the 6-digit OTP sent to your UIDAI-linked mobile.');
      return;
    }

    setLoading(true);
    const res = await verifyAadhaarOtp(referenceId, otpInput);
    setLoading(false);

    if (res.success) {
      setKycResult(res);
      setStep('success');
      onVerified(res);
    } else {
      setError(res.error || 'Invalid OTP. Try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <View style={styles.sheetContainer}>
            <SafeAreaView>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <ShieldCheck size={20} color="#15803D" />
                  <Text style={styles.headerTitle}>
                    {userType === 'host' ? 'Host Aadhaar & DigiLocker KYC' : 'Guest Identity Verification'}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                  <X size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                {/* Government & Legal Compliance Banner */}
                <View style={styles.govBadgeBanner}>
                  <Building2 size={16} color="#1E40AF" />
                  <Text style={styles.govBadgeText}>UIDAI verification</Text>
                </View>

                {error && (
                  <View style={styles.errorBox}>
                    <AlertCircle size={16} color="#B91C1C" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {step === 'aadhaar' && (
                  <View>
                    <Text style={styles.sectionHeading}>Aadhaar number</Text>
                    <Text style={styles.sectionDesc}>
                      OTP goes to your UIDAI-linked mobile number.
                    </Text>

                    <Text style={styles.fieldLabel}>12-Digit Aadhaar</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="1234 5678 9012"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="number-pad"
                      maxLength={14}
                      value={formatAadhaar(aadhaarInput)}
                      onChangeText={(val) => setAadhaarInput(val.replace(/\s+/g, ''))}
                    />

                    <View style={styles.privacyGuarantee}>
                      <ShieldCheck size={14} color="#059669" />
                      <Text style={styles.privacyText}>
                        Raw numbers are never stored.
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.primaryBtn, loading && styles.btnDisabled]}
                      onPress={handleSendOtp}
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.primaryBtnText}>Get OTP from UIDAI</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {step === 'otp' && (
                  <View>
                    <Text style={styles.sectionHeading}>Enter Verification Code</Text>
                    <Text style={styles.sectionDesc}>
                      Enter the 6-digit code sent to your UIDAI registered mobile number.
                    </Text>

                    <Text style={styles.fieldLabel}>One-Time Password (OTP)</Text>
                    <View style={styles.otpInputWrap}>
                      <KeyRound size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.otpInput}
                        placeholder="123456"
                        placeholderTextColor={Colors.textMuted}
                        keyboardType="number-pad"
                        maxLength={6}
                        value={otpInput}
                        onChangeText={setOtpInput}
                        autoFocus
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.primaryBtn, loading && styles.btnDisabled]}
                      onPress={handleVerifyOtp}
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.primaryBtnText}>Verify & Complete KYC</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.backLink}
                      onPress={() => setStep('aadhaar')}
                      disabled={loading}
                    >
                      <Text style={styles.backLinkText}>Change Aadhaar Number</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {step === 'success' && kycResult && (
                  <View style={styles.successContainer}>
                    <View style={styles.successIconCircle}>
                      <CheckCircle2 size={40} color="#15803D" />
                    </View>
                    <Text style={styles.successTitle}>Identity Verified</Text>
                    <Text style={styles.successSubtitle}>
                      DigiLocker KYC authenticated directly with UIDAI records.
                    </Text>

                    <View style={styles.cardDetails}>
                      <View style={styles.cardRow}>
                        <Text style={styles.cardLabel}>Legal Name</Text>
                        <Text style={styles.cardValue}>{kycResult.name || 'Verified Resident'}</Text>
                      </View>
                      <View style={styles.cardRow}>
                        <Text style={styles.cardLabel}>Aadhaar</Text>
                        <Text style={styles.cardValue}>{kycResult.maskedAadhaar}</Text>
                      </View>
                      <View style={styles.cardRow}>
                        <Text style={styles.cardLabel}>Status</Text>
                        <View style={styles.verifiedPill}>
                          <ShieldCheck size={12} color="#15803D" />
                          <Text style={styles.verifiedPillText}>HP Police Form-C Ready</Text>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.primaryBtn}
                      onPress={handleClose}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.primaryBtnText}>Continue</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </SafeAreaView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  keyboardContainer: {
    width: '100%',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  scrollContent: {
    paddingVertical: 16,
  },
  govBadgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  govBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
    flex: 1,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  sectionDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    letterSpacing: 1.5,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  otpInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 18,
  },
  otpInput: {
    flex: 1,
    fontSize: 18,
    letterSpacing: 6,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  privacyGuarantee: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  privacyText: {
    fontSize: 11,
    color: '#059669',
    flex: 1,
    lineHeight: 15,
  },
  primaryBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  backLink: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 6,
  },
  backLinkText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    flex: 1,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  cardDetails: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 22,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  cardLabel: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
});
