import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { X, ShieldCheck, AlertTriangle, Home, Clock, PhoneCall, Mail } from 'lucide-react-native';
import { Colors } from '../constants/theme';

interface HillCoverModalProps {
  visible: boolean;
  onClose: () => void;
}

const POLICIES = [
  {
    icon: AlertTriangle,
    title: '1. Mountain Road Closure & Landslide Protection',
    desc: 'If a landslide, snow blockage, or official police/NHAI/BRO road closure physically prevents reaching your property within 48 hours of scheduled check-in, you receive a 100% immediate refund of all stay fees and taxes.',
  },
  {
    icon: Home,
    title: '2. Stay Quality & Access Guarantee',
    desc: 'If a host cancels, the property lacks essential heating/water, or is materially misrepresented compared to the listing, Hilt issues a 100% refund plus up to ₹5,000 relocation credit towards an alternate verified stay in the valley.',
  },
  {
    icon: ShieldCheck,
    title: '3. Host Property & Accidental Damage Cover',
    desc: 'Every verified booking covers host properties against accidental structural or amenity damage up to ₹50,000, funded directly by the Hilt Platform Reserve escrow without painful deposit deductions.',
  },
  {
    icon: Clock,
    title: '4. 24-Hour Payout Escrow Hold',
    desc: 'Guest payments are held securely in escrow and released to the host 24 hours after successful check-in. This gives travelers time to verify the home while assuring hosts their money is locked.',
  },
];

export function HillCoverModal({ visible, onClose }: HillCoverModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>HillCover Guarantee</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <ShieldCheck size={26} color="#15803D" />
            <Text style={styles.heroTitle}>Comprehensive Mountain Protection</Text>
            <Text style={styles.heroSub}>
              Included automatically with every booking on Hilt at no extra cost.
            </Text>
          </View>

          {POLICIES.map((p) => {
            const IconComp = p.icon;
            return (
              <View key={p.title} style={styles.policyCard}>
                <View style={styles.cardHeader}>
                  <IconComp size={18} color="#059669" />
                  <Text style={styles.cardTitle}>{p.title}</Text>
                </View>
                <Text style={styles.cardDesc}>{p.desc}</Text>
              </View>
            );
          })}

          <View style={styles.claimSection}>
            <Text style={styles.claimTitle}>How to File a Claim</Text>
            <Text style={styles.claimText}>
              1. Open your booking in the <Text style={{ fontWeight: '700' }}>Trips</Text> tab.
            </Text>
            <Text style={styles.claimText}>
              2. Tap <Text style={{ fontWeight: '700' }}>HillCover</Text> to file an incident report.
            </Text>
            <Text style={styles.claimText}>
              3. Attach photos, official advisories, or repair estimates.
            </Text>
            <Text style={styles.claimText}>
              4. Our Mountain Rapid Response team reviews all claims within 24 hours.
            </Text>
          </View>

          <View style={styles.contactBox}>
            <Text style={styles.contactTitle}>Emergency Support & Ops Contact</Text>
            <View style={styles.contactRow}>
              <PhoneCall size={14} color={Colors.textSecondary} />
              <Text style={styles.contactText}>24/7 Helpline: +91 1800-4458-2273 (1800-HILT-CARE)</Text>
            </View>
            <View style={styles.contactRow}>
              <Mail size={14} color={Colors.textSecondary} />
              <Text style={styles.contactText}>Escrow Claims: claims@hilt.travel</Text>
            </View>
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
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  cardDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  claimSection: {
    backgroundColor: Colors.pillInactive,
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    marginBottom: 12,
  },
  claimTitle: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  claimText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 19 },
  contactBox: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },
  contactTitle: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 3 },
  contactText: { fontSize: 11, color: Colors.textSecondary },
});
