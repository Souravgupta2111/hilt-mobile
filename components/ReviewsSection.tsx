import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Star } from 'lucide-react-native';
import { Colors } from '../constants/theme';
import { getPropertyReviews, canReviewProperty, createReview } from '../lib/supabase';

export function ReviewsSection({ propertyId }: { propertyId: string }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [eligible, setEligible] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const [list, can] = await Promise.all([
      getPropertyReviews(propertyId),
      canReviewProperty(propertyId),
    ]);
    setReviews(list);
    setEligible(can);
  };

  useEffect(() => {
    load();
  }, [propertyId]);

  const submit = async () => {
    if (!comment.trim()) {
      Alert.alert('Add a few words', 'Tell future guests what the stay was like.');
      return;
    }
    setSubmitting(true);
    try {
      await createReview(propertyId, rating, comment);
      setComment('');
      setShowForm(false);
      await load();
    } catch (e: any) {
      Alert.alert('Review failed', e.message || 'Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const avg =
    reviews.length > 0
      ? (reviews.reduce((a, r) => a + Number(r.rating), 0) / reviews.length).toFixed(1)
      : null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          Reviews{avg ? ` · ${avg}` : ''}{reviews.length > 0 ? ` (${reviews.length})` : ''}
        </Text>
        {eligible && !showForm && (
          <TouchableOpacity onPress={() => setShowForm(true)}>
            <Text style={styles.writeLink}>Write one</Text>
          </TouchableOpacity>
        )}
      </View>

      {showForm && (
        <View style={styles.form}>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity key={s} onPress={() => setRating(s)}>
                <Star size={26} color="#F59E0B" fill={s <= rating ? '#F59E0B' : 'none'} />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            value={comment}
            onChangeText={setComment}
            placeholder="How was your stay?"
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={500}
          />
          <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color={Colors.textWhite} size="small" />
            ) : (
              <Text style={styles.submitText}>Post review</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {reviews.length === 0 ? (
        <Text style={styles.empty}>No reviews yet.</Text>
      ) : (
        reviews.slice(0, 5).map((r) => (
          <View key={r.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.reviewer}>{r.reviewer?.full_name || 'Guest'}</Text>
              <View style={styles.ratingPill}>
                <Star size={11} color="#F59E0B" fill="#F59E0B" />
                <Text style={styles.ratingText}>{Number(r.rating).toFixed(1)}</Text>
              </View>
            </View>
            <Text style={styles.comment}>{r.comment}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 18 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  writeLink: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, textDecorationLine: 'underline' },
  form: { backgroundColor: Colors.backgroundApp, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  stars: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  submitBtn: { backgroundColor: Colors.primaryBlack, borderRadius: 9999, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  submitText: { color: Colors.textWhite, fontSize: 14, fontWeight: '700' },
  empty: { fontSize: 13, color: Colors.textSecondary },
  card: { backgroundColor: Colors.backgroundApp, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewer: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  comment: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
});
