import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  Umbrella,
  LifeBuoy,
  Clock,
  Landmark,
  CheckCircle2,
  PhoneCall,
  Lock,
} from 'lucide-react-native';
import { Colors } from '../constants/theme';

interface HillCoverModalProps {
  visible: boolean;
  onClose: () => void;
}

export function HillCoverModal({ visible, onClose }: HillCoverModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleRow}>
            <ShieldCheck size={18} color="#15803D" />
            <Text style={styles.headerTitle}>Hilt HillCover™ Protection</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Hero Banner */}
          <View style={styles.heroCard}>
            <View style={styles.kickerRow}>
              <Umbrella size={14} color={Colors.textWhite} />
              <Text style={styles.kickerText}>ZERO-ANXIETY MOUNTAIN TRAVEL</Text>
            </View>
            <Text style={styles.heroTitle}>
              Built specifically for the rugged realities of the Himalayas.
            </Text>
            <Text style={styles.heroSub}>
              Unlike standard city platforms, Hilt automatically protects both guests and hosts against mountain natural events, blocked passes, and timber heritage care.
            </Text>
          </View>

          {/* Core Pillar 1: Landslide & Roadblock Guarantee */}
          <View style={styles.pillarCard}>
            <View style={styles.pillarIconCircle}>
              <AlertTriangle size={22} color="#DC2626" />
            </View>
            <View style={styles.pillarContent}>
              <View style={styles.pillarHeaderRow}>
                <Text style={styles.pillarTitle}>100% Landslide & Roadblock Refund</Text>
                <View style={styles.tagActive}>
                  <Text style={styles.tagActiveText}>Included Free</Text>
                </View>
              </View>
              <Text style={styles.pillarDesc}>
                If highway NH-3, NH-305, Jalori Pass, or the direct link road to your homestay is closed due to active landslides, flash floods, or heavy snowfall verified by HP/UK Disaster Management (SDMA), you receive an <Text style={{ fontWeight: '700', color: Colors.textPrimary }}>instant 100% refund</Text> with zero cancellation penalty.
              </Text>
              <View style={styles.reliefStrip}>
                <CheckCircle2 size={14} color="#15803D" />
                <Text style={styles.reliefText}>
                  Hosts receive ₹2,000 contingency relief from the Hilt HillCover Fund for prepared meals.
                </Text>
              </View>
            </View>
          </View>

          {/* Core Pillar 2: 24h Post Check-In Escrow Release */}
          <View style={styles.pillarCard}>
            <View style={[styles.pillarIconCircle, { backgroundColor: 'rgba(37, 99, 235, 0.12)' }]}>
              <Lock size={22} color="#2563EB" />
            </View>
            <View style={styles.pillarContent}>
              <View style={styles.pillarHeaderRow}>
                <Text style={styles.pillarTitle}>Automated Smart Escrow</Text>
                <View style={[styles.tagActive, { backgroundColor: '#DBEAFE' }]}>
                  <Text style={[styles.tagActiveText, { color: '#1E40AF' }]}>Escrow Vault</Text>
                </View>
              </View>
              <Text style={styles.pillarDesc}>
                Your money does not sit with an unverified third party. It is locked in Razorpay Smart Escrow and only disbursed to the host 24 hours after your successful physical check-in and Wi-Fi/room verification.
              </Text>
              <View style={styles.bulletRow}>
                <Clock size={13} color={Colors.textSecondary} />
                <Text style={styles.bulletText}>
                  98% released to host UPI within 24h. Hilt takes only a transparent 2% platform fee.
                </Text>
              </View>
            </View>
          </View>

          {/* Core Pillar 3: ₹5 Lakh Heritage Kath-Kuni Timber Protection */}
          <View style={styles.pillarCard}>
            <View style={[styles.pillarIconCircle, { backgroundColor: Colors.pillInactive }]}>
              <Landmark size={22} color={Colors.primaryBlack} />
            </View>
            <View style={styles.pillarContent}>
              <View style={styles.pillarHeaderRow}>
                <Text style={styles.pillarTitle}>₹5,00,000 Heritage Protection</Text>
                <View style={[styles.tagActive, { backgroundColor: Colors.pillInactive }]}>
                  <Text style={[styles.tagActiveText, { color: Colors.primaryBlack }]}>For Hosts</Text>
                </View>
              </View>
              <Text style={styles.pillarDesc}>
                Handcrafted Deodar cedar wood carvings, stone roofs, antique brass bukharis, and Himalayan structural architecture are covered against accidental guest damage up to ₹5 Lakh.
              </Text>
            </View>
          </View>

          {/* Core Pillar 4: 24/7 Mountain SOS Assist */}
          <View style={styles.pillarCard}>
            <View style={[styles.pillarIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <LifeBuoy size={22} color="#059669" />
            </View>
            <View style={styles.pillarContent}>
              <View style={styles.pillarHeaderRow}>
                <Text style={styles.pillarTitle}>24/7 4x4 Mountain Rescue Dispatch</Text>
              </View>
              <Text style={styles.pillarDesc}>
                Stuck in snow or stranded on an unpaved forest trail? Tap the SOS button in your Hilt Active Trip boarding pass to dispatch a local 4x4 recovery vehicle and coordinate with the local taxi union.
              </Text>
            </View>
          </View>

          {/* Hotline CTA */}
          <TouchableOpacity
            style={styles.hotlineButton}
            onPress={() =>
              Alert.alert(
                'Hilt Mountain Emergency Hotline',
                'Dial +91 1902 294020 for 24/7 Kullu & Shimla Valley Emergency Response Dispatch.'
              )
            }
            activeOpacity={0.88}
          >
            <PhoneCall size={18} color={Colors.textWhite} />
            <Text style={styles.hotlineButtonText}>24/7 Mountain SOS Hotline</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
  },
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#0F1419',
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  kickerText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textWhite,
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textWhite,
    lineHeight: 26,
  },
  heroSub: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 19,
    marginTop: 8,
  },
  pillarCard: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundApp,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },
  pillarIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  pillarContent: {
    flex: 1,
  },
  pillarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  pillarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  tagActive: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagActiveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  pillarDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  reliefStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  reliefText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '500',
    flex: 1,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  bulletText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  hotlineButton: {
    backgroundColor: Colors.primaryBlack,
    height: 52,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  hotlineButtonText: {
    color: Colors.textWhite,
    fontSize: 15,
    fontWeight: '700',
  },
});
