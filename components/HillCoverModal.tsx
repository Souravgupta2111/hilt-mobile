import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { X, ShieldCheck, Clock, CheckCircle2, Lock } from 'lucide-react-native';
import { Colors } from '../constants/theme';

interface HillCoverModalProps {
  visible: boolean;
  onClose: () => void;
}

export function HillCoverModal({ visible, onClose }: HillCoverModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Protection</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <ShieldCheck size={26} color="#15803D" />
            <Text style={styles.heroTitle}>24-Hour Payout Escrow Hold</Text>
            <Text style={styles.heroSub}>
              Standard safety for every reservation on Hilt.
            </Text>
          </View>

          <View style={styles.policyCard}>
            <View style={styles.cardHeader}>
              <Lock size={18} color="#059669" />
              <Text style={styles.cardTitle}>How Escrow Protects You</Text>
            </View>
            <Text style={styles.cardDesc}>
              When a traveler books a stay, 100% of the booking funds are held securely in an RBI-compliant escrow account. Funds are released to the host strictly 24 hours after check-in.
            </Text>
          </View>

          <View style={styles.policyCard}>
            <View style={styles.cardHeader}>
              <Clock size={18} color="#059669" />
              <Text style={styles.cardTitle}>For Travelers</Text>
            </View>
            <Text style={styles.cardDesc}>
              You arrive, check in, and verify the homestay matches the listing. Because the host is paid 24 hours after you check in, you are protected against fake or non-existent stays.
            </Text>
          </View>

          <View style={styles.policyCard}>
            <View style={styles.cardHeader}>
              <CheckCircle2 size={18} color="#059669" />
              <Text style={styles.cardTitle}>For Hosts</Text>
            </View>
            <Text style={styles.cardDesc}>
              You know the guest has paid in full before they arrive at your property. No cash hassles or unpaid dates. Payouts transfer automatically to your verified bank account or UPI after check-in.
            </Text>
          </View>
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
  content: { paddingHorizontal: 20, paddingVertical: 18, paddingBottom: 40 },
  hero: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    gap: 6,
  },
  heroTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginTop: 4 },
  heroSub: { fontSize: 13, color: '#15803D', lineHeight: 18 },
  policyCard: {
    backgroundColor: Colors.backgroundApp,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  cardDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
});
