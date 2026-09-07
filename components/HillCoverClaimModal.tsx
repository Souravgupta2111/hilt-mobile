import React, { useState } from 'react';
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
  Image,
} from 'react-native';
import { X, ShieldAlert, Camera, CheckCircle2, PhoneCall, Mail } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../constants/theme';
import { submitHillCoverClaim, uploadPropertyPhoto, getAuthUser } from '../lib/supabase';
import type { Booking } from '../types/database';

interface HillCoverClaimModalProps {
  visible: boolean;
  booking: Booking | null;
  side?: 'guest' | 'host';
  onClose: () => void;
  onSubmitted: () => void;
}

const CATEGORIES: Array<{
  id: 'road_closed' | 'stay_different' | 'damage' | 'safety' | 'other';
  label: string;
  desc: string;
}> = [
  {
    id: 'road_closed',
    label: 'Road Closure / Landslide',
    desc: 'Pass blocked or official government advisory prevents reaching the stay.',
  },
  {
    id: 'stay_different',
    label: 'Stay Discrepancy',
    desc: 'Property does not match description, lack of heat/water, or host declined access.',
  },
  {
    id: 'damage',
    label: 'Property Damage',
    desc: 'Accidental structural or amenity damage occurred during the stay.',
  },
  {
    id: 'safety',
    label: 'Safety / Medical Emergency',
    desc: 'Extreme mountain weather, altitude illness, or personal safety emergency.',
  },
  {
    id: 'other',
    label: 'Other Force Majeure',
    desc: 'Unforeseen mountain contingency covered under HillCover guarantee.',
  },
];

export function HillCoverClaimModal({
  visible,
  booking,
  side = 'guest',
  onClose,
  onSubmitted,
}: HillCoverClaimModalProps) {
  if (!booking) return null;

  const [category, setCategory] = useState<'road_closed' | 'stay_different' | 'damage' | 'safety' | 'other'>('road_closed');
  const [description, setDescription] = useState('');
  const [evidenceUris, setEvidenceUris] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets.map((a) => a.uri);
      setEvidenceUris((prev) => [...prev, ...uris]);
    }
  };

  const removeEvidence = (index: number) => {
    setEvidenceUris((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!description.trim() || description.trim().length < 15) {
      Alert.alert('Details Required', 'Please provide at least a couple sentences explaining what happened.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await getAuthUser();
      const uploadedUrls: string[] = [];

      // Upload evidence photos if any
      for (const uri of evidenceUris) {
        if (uri.startsWith('http')) {
          uploadedUrls.push(uri);
        } else if (user) {
          try {
            const url = await uploadPropertyPhoto(user.id, `claims-${booking.id}`, uri);
            uploadedUrls.push(url);
          } catch (e) {
            console.log('Evidence upload note:', e);
          }
        }
      }

      await submitHillCoverClaim({
        booking_id: booking.id,
        side,
        category,
        description: description.trim(),
        evidence: uploadedUrls,
      });

      Alert.alert(
        'Claim Submitted',
        'Your HillCover claim has been received. Our Mountain Support Ops team investigates within 24 hours and will coordinate your refund or relief.',
        [
          {
            text: 'OK',
            onPress: () => {
              onSubmitted();
              onClose();
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Submission Failed', e.message || 'Could not submit claim. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerTitle}>HillCover Claim</Text>
            <Text style={styles.headerSub}>Mountain Protection & Refund</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Guarantee Banner */}
          <View style={styles.guaranteeBox}>
            <ShieldAlert size={20} color="#15803D" />
            <View style={{ flex: 1 }}>
              <Text style={styles.guaranteeTitle}>Every Stay is Protected by HillCover</Text>
              <Text style={styles.guaranteeSub}>
                100% refund for verified road closures or severe property defects. 24-hour review SLA.
              </Text>
            </View>
          </View>

          <Text style={styles.bookingRef}>
            Stay: <Text style={{ fontWeight: '700' }}>{booking.property?.title || 'Mountain Stay'}</Text>
            {'\n'}Dates: {booking.check_in} → {booking.check_out}
          </Text>

          {/* Category Selector */}
          <Text style={styles.sectionTitle}>What happened?</Text>
          <View style={styles.categoryContainer}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catCard, category === cat.id && styles.catCardActive]}
                onPress={() => setCategory(cat.id)}
                activeOpacity={0.8}
              >
                <View style={styles.catHeader}>
                  <Text style={[styles.catLabel, category === cat.id && styles.catLabelActive]}>
                    {cat.label}
                  </Text>
                  {category === cat.id && <CheckCircle2 size={16} color="#059669" />}
                </View>
                <Text style={[styles.catDesc, category === cat.id && styles.catDescActive]}>
                  {cat.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Description */}
          <Text style={styles.sectionTitle}>Explain the situation</Text>
          <TextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the issue in detail (e.g. which road was blocked, police notice number, or what was broken)..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Photo / Document Proof */}
          <Text style={styles.sectionTitle}>Attach Proof (Photos, Road Alerts, FIR)</Text>
          <View style={styles.evidenceRow}>
            {evidenceUris.map((uri, idx) => (
              <View key={idx} style={styles.thumbWrap}>
                <Image source={{ uri }} style={styles.thumb} />
                <TouchableOpacity style={styles.thumbRemove} onPress={() => removeEvidence(idx)}>
                  <X size={12} color="#FFF" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage}>
              <Camera size={20} color={Colors.textSecondary} />
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Ops Contact Info */}
          <View style={styles.opsBox}>
            <Text style={styles.opsTitle}>Need Emergency Assistance Right Now?</Text>
            <View style={styles.opsRow}>
              <PhoneCall size={14} color={Colors.textSecondary} />
              <Text style={styles.opsText}>24/7 Helpline: +91 1800-4458-2273 (1800-HILT-CARE)</Text>
            </View>
            <View style={styles.opsRow}>
              <Mail size={14} color={Colors.textSecondary} />
              <Text style={styles.opsText}>Direct Escrow Ops: claims@hilt.travel</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.textWhite} />
            ) : (
              <Text style={styles.submitText}>Submit HillCover Claim</Text>
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
  headerSub: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  content: { paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 110 },
  guaranteeBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  guaranteeTitle: { fontSize: 13, fontWeight: '800', color: '#166534' },
  guaranteeSub: { fontSize: 11, color: '#15803D', marginTop: 2, lineHeight: 16 },
  bookingRef: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, marginTop: 12, marginBottom: 8 },
  categoryContainer: { gap: 8, marginBottom: 10 },
  catCard: {
    backgroundColor: Colors.backgroundApp,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
  },
  catCardActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  catLabelActive: { color: '#065F46' },
  catDesc: { fontSize: 11, color: Colors.textSecondary, marginTop: 3, lineHeight: 15 },
  catDescActive: { color: '#047857' },
  textArea: {
    backgroundColor: Colors.pillInactive,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 90,
  },
  evidenceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4, marginBottom: 14 },
  thumbWrap: { width: 72, height: 72, borderRadius: 10, position: 'relative' },
  thumb: { width: 72, height: 72, borderRadius: 10 },
  thumbRemove: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#000',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoBtn: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundApp,
  },
  addPhotoText: { fontSize: 10, color: Colors.textSecondary, marginTop: 4 },
  opsBox: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },
  opsTitle: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  opsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 3 },
  opsText: { fontSize: 11, color: Colors.textSecondary },
  bottomBar: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  submitBtn: { backgroundColor: Colors.primaryBlack, borderRadius: 9999, paddingVertical: 16, alignItems: 'center' },
  submitText: { color: Colors.textWhite, fontSize: 15, fontWeight: '700' },
});
