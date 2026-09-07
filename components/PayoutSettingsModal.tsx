import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, ShieldCheck, CheckCircle2, AlertCircle, Building2, MapPin } from 'lucide-react-native';
import { Colors } from '../constants/theme';
import { updatePayoutDetails, lookupIfsc, type IfscDetails, type PayoutDetails } from '../lib/supabase';
import type { Profile } from '../types/database';

interface PayoutSettingsModalProps {
  visible: boolean;
  profile: Profile;
  onClose: () => void;
  onSaved: () => void;
}

export function PayoutSettingsModal({ visible, profile, onClose, onSaved }: PayoutSettingsModalProps) {
  const [method, setMethod] = useState<'upi' | 'bank'>(profile.payout_method || 'bank');
  const [upi, setUpi] = useState(profile.upi_vpa || '');
  const [account, setAccount] = useState(profile.bank_account_number || '');
  const [confirmAccount, setConfirmAccount] = useState(profile.bank_account_number || '');
  const [ifsc, setIfsc] = useState(profile.bank_ifsc || '');
  const [pan, setPan] = useState(profile.pan_number || '');
  const [gstin, setGstin] = useState(profile.gstin || '');

  const [saving, setSaving] = useState(false);
  const [lookingUpIfsc, setLookingUpIfsc] = useState(false);
  const [bankInfo, setBankInfo] = useState<IfscDetails | null>(null);
  const [ifscError, setIfscError] = useState<string | null>(null);

  const isPanValid = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.trim().toUpperCase());
  const isUpiValid = /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upi.trim());
  const accountsMatch = account.length > 0 && account === confirmAccount;

  // Real-time Free RBI IFSC Lookup
  useEffect(() => {
    const clean = ifsc.trim().toUpperCase();
    if (clean.length === 11) {
      setLookingUpIfsc(true);
      setIfscError(null);
      lookupIfsc(clean)
        .then((info) => {
          if (info) {
            setBankInfo(info);
            setIfscError(null);
          } else {
            setBankInfo(null);
            setIfscError('IFSC code not found in RBI registry. Please check your chequebook.');
          }
        })
        .catch(() => {
          setBankInfo(null);
          setIfscError('Could not verify IFSC. Please check your connection.');
        })
        .finally(() => setLookingUpIfsc(false));
    } else {
      setBankInfo(null);
      setIfscError(null);
    }
  }, [ifsc]);

  const save = async () => {
    if (method === 'bank') {
      if (!account.trim() || account.trim().length < 9) {
        Alert.alert('Invalid Account', 'Enter a valid bank account number (9–18 digits).');
        return;
      }
      if (account.trim() !== confirmAccount.trim()) {
        Alert.alert('Account Mismatch', 'Account numbers do not match. Please re-enter.');
        return;
      }
      if (!ifsc.trim() || ifsc.trim().length !== 11) {
        Alert.alert('Invalid IFSC', 'Enter an 11-character IFSC code (e.g. HDFC0001234).');
        return;
      }
      if (!bankInfo) {
        Alert.alert('Unverified Branch', 'Please enter a valid IFSC code recognized by the RBI.');
        return;
      }
    } else {
      if (!isUpiValid) {
        Alert.alert('Invalid UPI', 'Enter a valid UPI ID (e.g. name@okhdfc).');
        return;
      }
    }

    setSaving(true);
    try {
      const details: PayoutDetails = {
        payout_method: method,
        upi_vpa: method === 'upi' ? upi.trim() : null,
        bank_account_number: method === 'bank' ? account.trim() : null,
        bank_ifsc: method === 'bank' ? ifsc.trim().toUpperCase() : null,
        pan_number: pan.trim().toUpperCase() || null,
        gstin: gstin.trim().toUpperCase() || null,
      };

      await updatePayoutDetails(details);
      Alert.alert(
        'Payout Details Saved',
        method === 'bank' && bankInfo
          ? `Verified with ${bankInfo.bank}, ${bankInfo.branch}. Payouts will land here automatically.`
          : 'Payout details saved. Payouts will arrive via UPI automatically.'
      );
      onSaved();
      onClose();
    } catch (e: any) {
      Alert.alert('Could not save', e.message || 'Check the details and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payout & Bank Settings</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sub}>
            You receive 98% of every booking. Payouts are dispatched 24 hours after guest check-in
            directly to your verified destination.
          </Text>

          {/* Account Holder Badge */}
          <View style={styles.holderBadge}>
            <ShieldCheck size={16} color="#059669" />
            <Text style={styles.holderText}>
              Beneficiary Name: <Text style={{ fontWeight: '700' }}>{profile.full_name || 'Verified Host'}</Text>
            </Text>
          </View>

          {/* Method Selector */}
          <Text style={styles.sectionHeader}>Payout Method</Text>
          <View style={styles.methodRow}>
            {(['bank', 'upi'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.methodChip, method === m && styles.methodChipActive]}
                onPress={() => setMethod(m)}
              >
                <Text style={[styles.methodText, method === m && styles.methodTextActive]}>
                  {m === 'bank' ? 'Bank Account (NEFT / IMPS)' : 'UPI ID'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {method === 'bank' ? (
            <View>
              {/* IFSC Input with Real-time lookup */}
              <Text style={styles.label}>IFSC Code</Text>
              <TextInput
                style={[styles.input, ifscError ? styles.inputError : bankInfo ? styles.inputSuccess : null]}
                value={ifsc}
                onChangeText={(t) => setIfsc(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))}
                placeholder="e.g. HDFC0001234 or SBIN0001234"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
                maxLength={11}
              />

              {lookingUpIfsc && (
                <View style={styles.lookupIndicator}>
                  <ActivityIndicator size="small" color="#059669" />
                  <Text style={styles.lookupText}>Verifying bank branch with RBI registry...</Text>
                </View>
              )}

              {/* Free Real-time Verified Bank Branch Card */}
              {bankInfo && (
                <View style={styles.bankCard}>
                  <View style={styles.bankCardTop}>
                    <Building2 size={16} color="#059669" />
                    <Text style={styles.bankName}>{bankInfo.bank}</Text>
                    <View style={styles.rbiTag}>
                      <CheckCircle2 size={11} color="#059669" />
                      <Text style={styles.rbiTagText}>RBI Verified</Text>
                    </View>
                  </View>
                  <View style={styles.bankCardBottom}>
                    <MapPin size={13} color={Colors.textSecondary} />
                    <Text style={styles.branchText}>
                      {bankInfo.branch}, {bankInfo.city} ({bankInfo.state})
                    </Text>
                  </View>
                </View>
              )}

              {ifscError && (
                <View style={styles.errorBox}>
                  <AlertCircle size={14} color="#DC2626" />
                  <Text style={styles.errorText}>{ifscError}</Text>
                </View>
              )}

              {/* Account Number */}
              <Text style={[styles.label, { marginTop: 10 }]}>Account Number</Text>
              <TextInput
                style={styles.input}
                value={account}
                onChangeText={(t) => setAccount(t.replace(/[^0-9]/g, ''))}
                placeholder="Enter bank account number"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
              />

              {/* Confirm Account Number (Double-Entry to prevent typos) */}
              <Text style={styles.label}>Confirm Account Number</Text>
              <TextInput
                style={[
                  styles.input,
                  confirmAccount.length > 0 && !accountsMatch ? styles.inputError : accountsMatch ? styles.inputSuccess : null,
                ]}
                value={confirmAccount}
                onChangeText={(t) => setConfirmAccount(t.replace(/[^0-9]/g, ''))}
                placeholder="Re-enter bank account number"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
              />

              {confirmAccount.length > 0 && (
                accountsMatch ? (
                  <Text style={styles.successNote}>✓ Account numbers match</Text>
                ) : (
                  <Text style={styles.errorNote}>Account numbers do not match</Text>
                )
              )}
            </View>
          ) : (
            <View>
              <Text style={styles.label}>UPI ID (VPA)</Text>
              <TextInput
                style={[styles.input, upi.length > 0 && !isUpiValid ? styles.inputError : isUpiValid ? styles.inputSuccess : null]}
                value={upi}
                onChangeText={setUpi}
                placeholder="name@okhdfc"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {upi.length > 0 && (
                isUpiValid ? (
                  <Text style={styles.successNote}>✓ Valid UPI handle</Text>
                ) : (
                  <Text style={styles.errorNote}>Enter a valid UPI ID (e.g. name@okhdfc)</Text>
                )
              )}
            </View>
          )}

          {/* Tax Section: PAN & TDS 194-O */}
          <View style={styles.taxSection}>
            <Text style={styles.sectionHeader}>Tax Identity & TDS 194-O</Text>

            <View style={styles.tdsExplainerBox}>
              <ShieldCheck size={16} color="#1E40AF" />
              <View style={{ flex: 1 }}>
                <Text style={styles.tdsExplainerTitle}>TDS Norm (Section 194-O, Finance Act 2024)</Text>
                <Text style={styles.tdsExplainerText}>
                  • <Text style={{ fontWeight: '700' }}>With PAN:</Text> 0% TDS up to ₹5,00,000/FY; 0.1% beyond.
                </Text>
                <Text style={styles.tdsExplainerText}>
                  • <Text style={{ fontWeight: '700' }}>Without PAN:</Text> 5% TDS deducted under Section 206AA.
                </Text>
              </View>
            </View>

            <Text style={styles.label}>Permanent Account Number (PAN)</Text>
            <TextInput
              style={[styles.input, pan.length > 0 && !isPanValid && styles.inputError]}
              value={pan}
              onChangeText={(t) => setPan(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
              placeholder="ABCDE1234F"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              maxLength={10}
            />
            {pan.length > 0 && !isPanValid ? (
              <Text style={styles.errorNote}>PAN must be 10 characters (e.g. ABCDE1234F)</Text>
            ) : isPanValid ? (
              <Text style={styles.successNote}>✓ Valid PAN (0% / 0.1% TDS applies)</Text>
            ) : null}

            <Text style={[styles.label, { marginTop: 10 }]}>GSTIN (Optional, if registered)</Text>
            <TextInput
              style={styles.input}
              value={gstin}
              onChangeText={(t) => setGstin(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15))}
              placeholder="02AAAAA0000A1Z5"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              maxLength={15}
            />
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.saveButton} onPress={save} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={Colors.textWhite} />
            ) : (
              <Text style={styles.saveText}>Save Payout & Bank Details</Text>
            )}
          </TouchableOpacity>
        </View>
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
  content: { paddingHorizontal: 20, paddingVertical: 18, paddingBottom: 110 },
  sub: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginBottom: 14 },
  holderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  holderText: { fontSize: 12, color: '#065F46' },
  sectionHeader: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, marginTop: 10, marginBottom: 10 },
  methodRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  methodChip: { flex: 1, paddingVertical: 12, borderRadius: 9999, backgroundColor: Colors.pillInactive, alignItems: 'center' },
  methodChipActive: { backgroundColor: Colors.primaryBlack },
  methodText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  methodTextActive: { color: Colors.textWhite },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: Colors.pillInactive,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  inputError: { borderWidth: 1, borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  inputSuccess: { borderWidth: 1, borderColor: '#10B981', backgroundColor: '#F0FDF4' },
  lookupIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 6 },
  lookupText: { fontSize: 12, color: '#059669' },
  bankCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
    marginTop: 2,
    marginBottom: 8,
  },
  bankCardTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bankName: { fontSize: 13, fontWeight: '800', color: '#065F46', flex: 1 },
  rbiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rbiTagText: { fontSize: 10, fontWeight: '700', color: '#065F46' },
  bankCardBottom: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  branchText: { fontSize: 11, color: '#047857', flex: 1 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 4 },
  errorText: { fontSize: 11, color: '#DC2626' },
  errorNote: { fontSize: 11, color: '#DC2626', marginTop: -2, marginBottom: 8 },
  successNote: { fontSize: 11, color: '#059669', fontWeight: '600', marginTop: -2, marginBottom: 8 },
  taxSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 14 },
  tdsExplainerBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  tdsExplainerTitle: { fontSize: 12, fontWeight: '700', color: '#1E3A8A' },
  tdsExplainerText: { fontSize: 11, color: '#1E40AF', marginTop: 2, lineHeight: 16 },
  bottomBar: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  saveButton: { backgroundColor: Colors.primaryBlack, borderRadius: 9999, paddingVertical: 16, alignItems: 'center' },
  saveText: { color: Colors.textWhite, fontSize: 15, fontWeight: '700' },
});
