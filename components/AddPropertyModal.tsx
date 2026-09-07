import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ArrowRight, Camera, X } from 'lucide-react-native';
import { Colors } from '../constants/theme';
import { supabase, getAuthUser, uploadPropertyPhoto, markIdentityVerified } from '../lib/supabase';
import { AadhaarKycModal } from './AadhaarKycModal';

interface AddPropertyModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddPropertyModal({ visible, onClose, onSuccess }: AddPropertyModalProps) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [valley, setValley] = useState('');
  const [town, setTown] = useState('');
  const [price, setPrice] = useState('');
  const [bedrooms, setBedrooms] = useState('2');
  const [bathrooms, setBathrooms] = useState('1');
  const [photos, setPhotos] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [upiId, setUpiId] = useState('');
  const [minNights, setMinNights] = useState('1');
  const [maxNights, setMaxNights] = useState('30');
  const [checkInTime, setCheckInTime] = useState('12:00');
  const [checkOutTime, setCheckOutTime] = useState('11:00');
  const [houseRules, setHouseRules] = useState('');
  const [cleaningFee, setCleaningFee] = useState('');
  const [cancelPolicy, setCancelPolicy] = useState<'flexible' | 'moderate' | 'strict'>('moderate');
  const [instantBook, setInstantBook] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isAadhaarVerified, setIsAadhaarVerified] = useState(false);

  const numericPrice = parseInt(price) || 0;

  const reset = () => {
    setStep(1);
    setTitle('');
    setValley('');
    setTown('');
    setPrice('');
    setBedrooms('2');
    setBathrooms('1');
    setPhotos([]);
    setImageUrl('');
    setUpiId('');
    setMinNights('1');
    setMaxNights('30');
    setCheckInTime('12:00');
    setCheckOutTime('11:00');
    setHouseRules('');
    setCleaningFee('');
    setCancelPolicy('moderate');
    setInstantBook(true);
    setIsAadhaarVerified(false);
  };

  const pickPhotos = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add stay pictures.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 6,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 6));
    }
  };

  const handleNext = async () => {
    if (step === 1 && (!title.trim() || !valley.trim() || !town.trim())) {
      Alert.alert('Add details', 'Enter a title, valley, and town.');
      return;
    }
    if (step === 3) {
      const minN = parseInt(minNights) || 0;
      const maxN = parseInt(maxNights) || 0;
      if (minN < 1 || maxN < 1 || minN > maxN) {
        Alert.alert('Stay length', 'Set a valid min/max nights (min ≤ max).');
        return;
      }
    }
    if (step === 4 && (!numericPrice || numericPrice < 500)) {
      Alert.alert('Set a price', 'Enter a nightly tariff of at least ₹500.');
      return;
    }
    if (step < 5) {
      setStep(step + 1);
      return;
    }

    if (!upiId.trim()) {
      Alert.alert('Add payout', 'Enter your UPI ID for payouts.');
      return;
    }
    if (!isAadhaarVerified) {
      Alert.alert('Verification required', 'Verify your identity with Aadhaar to publish. Payouts only go to verified hosts.', [
        { text: 'Later', style: 'cancel' },
        { text: 'Verify now', onPress: () => setIsKycModalOpen(true) },
      ]);
      return;
    }
    setIsSubmitting(true);
    try {
      const user = await getAuthUser();
      if (!user) throw new Error('Sign in to list a property.');
      const { data: listing, error } = await supabase
        .from('properties')
        .insert({
          host_id: user.id,
          title: title.trim(),
          valley: valley.trim(),
          town: town.trim(),
          state: 'Himachal Pradesh',
          address: `${town.trim()}, ${valley.trim()}`,
          latitude: 31.6372,
          longitude: 77.3481,
          property_type: 'homestay',
          category: 'Home',
          price_entire_villa: numericPrice,
          bedrooms: parseInt(bedrooms) || 2,
          bathrooms: parseInt(bathrooms) || 1,
          max_guests: Math.max(2, (parseInt(bedrooms) || 2) * 2),
          cancellation_policy: cancelPolicy,
          house_rules: houseRules.trim(),
          check_in_time: checkInTime.trim() || '12:00',
          check_out_time: checkOutTime.trim() || '11:00',
          cleaning_fee: parseInt(cleaningFee) || 0,
          min_nights: parseInt(minNights) || 1,
          max_nights: parseInt(maxNights) || 30,
          instant_book: instantBook,
          images: imageUrl.trim() ? [imageUrl.trim()] : [],
          is_active: true,
        })
        .select('id')
        .single();
      if (error) throw error;

      // Upload picked photos to storage, then attach public URLs.
      const uploaded: string[] = [];
      for (const uri of photos) {
        try {
          uploaded.push(await uploadPropertyPhoto(user.id, listing.id, uri));
        } catch (uploadErr) {
          console.warn('Photo upload failed:', uploadErr);
        }
      }
      const finalImages = [...(imageUrl.trim() ? [imageUrl.trim()] : []), ...uploaded];
      if (finalImages.length > 0) {
        await supabase.from('properties').update({ images: finalImages }).eq('id', listing.id);
      }

      await supabase.from('profiles').update({ role: 'host', upi_vpa: upiId.trim() }).eq('id', user.id);

      setIsSubmitting(false);
      Alert.alert('Listing published', `"${title.trim()}" is now live.`, [
        {
          text: 'Done',
          onPress: () => {
            reset();
            onClose();
            onSuccess();
          },
        },
      ]);
    } catch (e: any) {
      setIsSubmitting(false);
      Alert.alert('Publish failed', e.message || 'Try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.headerCancel}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>List property</Text>
          <Text style={styles.stepCounter}>{step}/5</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {step === 1 && (
            <View>
              <Text style={styles.heroTitle}>Where is it?</Text>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Pine Crest Villa" placeholderTextColor={Colors.textMuted} />
              <Text style={styles.inputLabel}>Valley</Text>
              <TextInput style={styles.input} value={valley} onChangeText={setValley} placeholder="e.g. Tirthan Valley" placeholderTextColor={Colors.textMuted} />
              <Text style={styles.inputLabel}>Town</Text>
              <TextInput style={styles.input} value={town} onChangeText={setTown} placeholder="e.g. Jibhi" placeholderTextColor={Colors.textMuted} />
              <Text style={styles.inputLabel}>Cover photo URL</Text>
              <TextInput style={styles.input} value={imageUrl} onChangeText={setImageUrl} placeholder="https://…" autoCapitalize="none" placeholderTextColor={Colors.textMuted} />
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={styles.heroTitle}>Photos</Text>
              <Text style={styles.heroSub}>Add up to 6 photos from your library.</Text>
              <View style={styles.photoGrid}>
                {photos.map((uri) => (
                  <View key={uri} style={styles.photoWrap}>
                    <Image source={{ uri }} style={styles.photo} />
                    <TouchableOpacity
                      style={styles.photoRemove}
                      onPress={() => setPhotos((prev) => prev.filter((p) => p !== uri))}
                    >
                      <X size={13} color={Colors.textWhite} />
                    </TouchableOpacity>
                  </View>
                ))}
                {photos.length < 6 && (
                  <TouchableOpacity style={styles.photoAdd} onPress={pickPhotos}>
                    <Camera size={22} color={Colors.textSecondary} />
                    <Text style={styles.photoAddText}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={styles.heroTitle}>Space & stay rules</Text>
              <Text style={styles.inputLabel}>Bedrooms</Text>
              <TextInput style={styles.input} value={bedrooms} onChangeText={setBedrooms} keyboardType="number-pad" />
              <Text style={styles.inputLabel}>Bathrooms</Text>
              <TextInput style={styles.input} value={bathrooms} onChangeText={setBathrooms} keyboardType="number-pad" />
              <View style={styles.twoCol}>
                <View style={styles.twoColItem}>
                  <Text style={styles.inputLabel}>Min nights</Text>
                  <TextInput style={styles.input} value={minNights} onChangeText={(t) => setMinNights(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
                </View>
                <View style={styles.twoColItem}>
                  <Text style={styles.inputLabel}>Max nights</Text>
                  <TextInput style={styles.input} value={maxNights} onChangeText={(t) => setMaxNights(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
                </View>
              </View>
              <View style={styles.twoCol}>
                <View style={styles.twoColItem}>
                  <Text style={styles.inputLabel}>Check-in</Text>
                  <TextInput style={styles.input} value={checkInTime} onChangeText={setCheckInTime} placeholder="12:00" placeholderTextColor={Colors.textMuted} />
                </View>
                <View style={styles.twoColItem}>
                  <Text style={styles.inputLabel}>Check-out</Text>
                  <TextInput style={styles.input} value={checkOutTime} onChangeText={setCheckOutTime} placeholder="11:00" placeholderTextColor={Colors.textMuted} />
                </View>
              </View>
              <Text style={styles.inputLabel}>House rules</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={houseRules}
                onChangeText={setHouseRules}
                placeholder="Quiet hours, pets, smoking…"
                placeholderTextColor={Colors.textMuted}
                multiline
                maxLength={500}
              />
            </View>
          )}

          {step === 4 && (
            <View>
              <Text style={styles.heroTitle}>Nightly price</Text>
              <Text style={styles.inputLabel}>Tariff (₹)</Text>
              <TextInput style={[styles.input, styles.priceInput]} value={price} onChangeText={setPrice} keyboardType="number-pad" placeholder="5000" placeholderTextColor={Colors.textMuted} />
              {numericPrice > 0 && (
                <Text style={styles.hint}>You receive ≈ ₹{Math.round(numericPrice * 0.98).toLocaleString('en-IN')} after 2% fee.</Text>
              )}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>Cleaning fee (₹, one-time)</Text>
              <TextInput style={styles.input} value={cleaningFee} onChangeText={(t) => setCleaningFee(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="0" placeholderTextColor={Colors.textMuted} />
              <Text style={[styles.inputLabel, { marginTop: 8 }]}>Cancellation policy</Text>
              <View style={styles.chipRow}>
                {(['flexible', 'moderate', 'strict'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.policyChip, cancelPolicy === p && styles.policyChipActive]}
                    onPress={() => setCancelPolicy(p)}
                  >
                    <Text style={[styles.policyText, cancelPolicy === p && styles.policyTextActive]}>
                      {p[0].toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.toggleRow} onPress={() => setInstantBook(!instantBook)}>
                <View>
                  <Text style={styles.toggleTitle}>Instant Book</Text>
                  <Text style={styles.toggleSub}>
                    {instantBook ? 'Guests book immediately' : 'You confirm each request'}
                  </Text>
                </View>
                <View style={[styles.toggle, instantBook && styles.toggleOn]}>
                  <View style={[styles.knob, instantBook && styles.knobOn]} />
                </View>
              </TouchableOpacity>
            </View>
          )}

          {step === 5 && (
            <View>
              <Text style={styles.heroTitle}>Payouts</Text>
              <Text style={styles.inputLabel}>UPI ID</Text>
              <TextInput style={styles.input} value={upiId} onChangeText={setUpiId} placeholder="name@okaxis" autoCapitalize="none" placeholderTextColor={Colors.textMuted} />
              <TouchableOpacity style={styles.kycRow} onPress={() => setIsKycModalOpen(true)}>
                <Text style={styles.kycText}>{isAadhaarVerified ? 'Aadhaar verified' : 'Verify Aadhaar (optional)'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color={Colors.textWhite} />
            ) : (
              <>
                <Text style={styles.nextButtonText}>{step === 5 ? 'Publish' : 'Continue'}</Text>
                {step < 5 && <ArrowRight size={18} color={Colors.textWhite} />}
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <AadhaarKycModal
        visible={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onVerified={async (res) => {
          setIsAadhaarVerified(true);
          await markIdentityVerified(res.maskedAadhaar);
        }}
        userType="host"
      />
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerCancel: { fontSize: 15, color: Colors.textSecondary },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  stepCounter: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  content: { paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 100 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  input: {
    backgroundColor: Colors.pillInactive,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  priceInput: { fontSize: 22, fontWeight: '700' as const },
  hint: { fontSize: 13, color: Colors.textSecondary },
  heroSub: { fontSize: 13, color: Colors.textSecondary, marginBottom: 12 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoWrap: { width: '31%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  photo: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAdd: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: Colors.pillInactive,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoAddText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  kycRow: { backgroundColor: Colors.pillInactive, borderRadius: 14, padding: 14, marginTop: 8 },
  kycText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  bottomBar: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  nextButton: {
    backgroundColor: Colors.primaryBlack,
    borderRadius: 9999,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonText: { color: Colors.textWhite, fontSize: 16, fontWeight: '700' },
  twoCol: { flexDirection: 'row', gap: 12 },
  twoColItem: { flex: 1 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', gap: 8 },
  policyChip: { flex: 1, paddingVertical: 11, borderRadius: 9999, backgroundColor: Colors.pillInactive, alignItems: 'center' },
  policyChipActive: { backgroundColor: Colors.primaryBlack },
  policyText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  policyTextActive: { color: Colors.textWhite },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.pillInactive,
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
  },
  toggleTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  toggleSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  toggle: { width: 46, height: 26, borderRadius: 13, backgroundColor: '#D1D5DB', justifyContent: 'center', paddingHorizontal: 3 },
  toggleOn: { backgroundColor: '#15803D' },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' },
  knobOn: { alignSelf: 'flex-end' },
});
