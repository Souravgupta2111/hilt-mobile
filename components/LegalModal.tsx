import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Colors } from '../constants/theme';

export type LegalDoc = 'terms' | 'cancellation' | 'hillcover' | 'privacy';

const DOCS: Record<LegalDoc, { title: string; body: string[] }> = {
  terms: {
    title: 'Terms of Service',
    body: [
      '1. Hilt is a marketplace connecting travelers with independent hosts. Hilt is not a party to the stay contract, which is between guest and host.',
      '2. Guests pay the stay price plus a 2% Hilt service fee. The 98% balance is held in escrow and released to the host about 24 hours after check-in.',
      '3. Hosts must provide the stay as listed, keep availability honest, and hold a valid payout destination. Payouts require completed identity verification.',
      '4. Guests must respect house rules, occupancy limits, and check-in times. Damage beyond normal wear may be charged with evidence.',
      '5. Content you upload (photos, reviews, messages) must be yours and lawful. Chat is moderated; contact details, links, and off-platform payments are blocked.',
      '6. Either party may cancel per the listing cancellation policy shown before payment. Refunds follow that policy automatically.',
      '7. Accounts involved in fraud, fake listings, review manipulation, or safety violations may be suspended.',
      '8. To the extent permitted by law, Hilt’s liability is limited to the booking amount in dispute.',
    ],
  },
  cancellation: {
    title: 'Cancellation Policy',
    body: [
      'Each listing shows one tier, applied automatically on cancel:',
      '• Flexible — full refund until 24 hours before check-in.',
      '• Moderate — full refund 7+ days before check-in; 50% of the stay amount 2–6 days before; no refund within 2 days.',
      '• Strict — full refund 14+ days before; 50% of the stay amount 7–13 days before; no refund within 7 days.',
      'Requests the host never confirmed are always refunded in full.',
      'If the host cancels, the guest is refunded in full regardless of tier.',
      'Refunds go to the original payment method and typically arrive in 5–7 business days.',
    ],
  },
  hillcover: {
    title: '24-Hour Payout Escrow Hold',
    body: [
      'Every booking on Hilt is secured by an automated 24-hour payment escrow hold:',
      '• Escrow protection — your funds are held in secure escrow and disbursed to the host only 24 hours after successful check-in.',
      '• Guest protection — allows travelers to arrive and verify that the stay exists and matches the listing before host payout is released.',
      '• Host protection — hosts are guaranteed that the guest has paid in full before arrival, eliminating cash disputes or unpaid stays.',
      '• Direct resolution — any disputes regarding stay rules or property damage are resolved directly between host and guest. Hilt acts solely as a payment facilitator and does not underwrite third-party insurance or damage guarantees.',
    ],
  },
  privacy: {
    title: 'Privacy Policy (DPDP Act, 2023)',
    body: [
      'We collect only what hosting and booking need: identity, contact, stay, payment, and message metadata. Aadhaar numbers are never stored — only masked references and verification status.',
      'Data is used to operate bookings, payouts, safety moderation, and support. We do not sell personal data.',
      'Chat content is scanned for contact details, links, payments, and abuse to keep transactions on-platform and users safe.',
      'You may request access, correction, or deletion of your data, and withdraw consent, via the support address on our store listing. Withdrawal may limit account functionality.',
      'Data is retained while your account is active and as required by tax and financial law, then deleted or anonymized.',
      'A grievance officer is designated as required by Indian law; contact details are published on our store listing.',
    ],
  },
};

export const LEGAL_TABS: Array<{ id: LegalDoc; label: string }> = [
  { id: 'terms', label: 'Terms' },
  { id: 'cancellation', label: 'Cancellation' },
  { id: 'hillcover', label: 'HillCover' },
  { id: 'privacy', label: 'Privacy' },
];

interface LegalModalProps {
  visible: boolean;
  initialDoc?: LegalDoc;
  onClose: () => void;
}

export function LegalModal({ visible, initialDoc = 'terms', onClose }: LegalModalProps) {
  const [doc, setDoc] = useState<LegalDoc>(initialDoc);
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Legal</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.tabs}>
          {LEGAL_TABS.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.tab, doc === t.id && styles.tabActive]}
              onPress={() => setDoc(t.id)}
            >
              <Text style={[styles.tabText, doc === t.id && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{DOCS[doc].title}</Text>
          {DOCS[doc].body.map((p, i) => (
            <Text key={i} style={styles.para}>
              {p}
            </Text>
          ))}
        </ScrollView>
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
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  tab: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 9999, backgroundColor: Colors.pillInactive },
  tabActive: { backgroundColor: Colors.primaryBlack },
  tabText: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  tabTextActive: { color: Colors.textWhite },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  title: { fontSize: 19, fontWeight: '800', color: Colors.textPrimary, marginBottom: 12 },
  para: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginBottom: 10 },
});
