import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, Star } from 'lucide-react-native';
import { Colors } from '../constants/theme';
import { createGuestReview } from '../lib/supabase';
import type { Booking } from '../types/database';

interface ReviewGuestModalProps {
  visible: boolean;
  booking: Booking | null;
  onClose: () => void;
  onDone: () => void;
}

export function ReviewGuestModal({ visible, booking, onClose, onDone }: ReviewGuestModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!booking) return;
    if (!comment.trim()) {
      Alert.alert('Add a few words', 'Tell other hosts how this guest was.');
      return;
    }
    setSubmitting(true);
    try {
      await createGuestReview(booking.id, rating, comment);
      setComment('');
      setRating(5);
      onDone();
      onClose();
    } catch (e: any) {
      Alert.alert('Review failed', e.message || 'Try again.');
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
          <Text style={styles.headerTitle}>Review guest</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.content}>
          <Text style={styles.sub}>How was hosting this guest?</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity key={s} onPress={() => setRating(s)}>
                <Star size={30} color="#F59E0B" fill={s <= rating ? '#F59E0B' : 'none'} />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            value={comment}
            onChangeText={setComment}
            placeholder="Clean, communicative, respectful…"
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={500}
          />
          <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color={Colors.textWhite} />
            ) : (
              <Text style={styles.submitText}>Post review</Text>
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
  content: { paddingHorizontal: 20, paddingVertical: 18 },
  sub: { fontSize: 14, color: Colors.textSecondary, marginBottom: 14 },
  stars: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  input: {
    backgroundColor: Colors.pillInactive,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitBtn: { backgroundColor: Colors.primaryBlack, borderRadius: 9999, paddingVertical: 15, alignItems: 'center' },
  submitText: { color: Colors.textWhite, fontSize: 15, fontWeight: '700' },
});
