import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Home, Compass, MapPin, X, ArrowRight, Sparkles } from 'lucide-react-native';
import { Colors } from '../constants/theme';

interface ActionLauncherModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectListProperty: () => void;
  onSelectCreateItinerary: () => void;
  onSelectAiConcierge?: () => void;
}

export function ActionLauncherModal({
  visible,
  onClose,
  onSelectListProperty,
  onSelectCreateItinerary,
  onSelectAiConcierge,
}: ActionLauncherModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <SafeAreaView style={styles.bottomSheetWrapper}>
          <View style={styles.sheetContainer}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <View>
                <View style={styles.kickerRow}>
                  <Sparkles size={13} color={Colors.textSecondary} />
                  <Text style={styles.kickerText}>HILT MOUNTAIN ACTION</Text>
                </View>
                <Text style={styles.sheetTitle}>What would you like to do?</Text>
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
                <X size={18} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Actions List */}
            <View style={styles.actionsList}>
              {/* Action 1: List a Property */}
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => {
                  onClose();
                  onSelectListProperty();
                }}
                activeOpacity={0.88}
              >
                <View style={styles.iconCircle}>
                  <Home size={22} color={Colors.primaryBlack} />
                </View>
                <View style={styles.actionTextCol}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.actionTitle}>List a Homestay or Villa</Text>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>2% Fee</Text>
                    </View>
                  </View>
                  <Text style={styles.actionSubtitle}>
                    Earn up to 98% of tariffs. Fast 4-minute mountain onboarding.
                  </Text>
                </View>
                <ArrowRight size={18} color={Colors.textSecondary} />
              </TouchableOpacity>

              {/* Action 2: Create Itinerary */}
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => {
                  onClose();
                  onSelectCreateItinerary();
                }}
                activeOpacity={0.88}
              >
                <View style={styles.iconCircle}>
                  <Compass size={22} color={Colors.primaryBlack} />
                </View>
                <View style={styles.actionTextCol}>
                  <Text style={styles.actionTitle}>Curate "Ghumna Phirna" Guide</Text>
                  <Text style={styles.actionSubtitle}>
                    Share a day-by-day road trip, local dhabas, and slow living tips.
                  </Text>
                </View>
                <ArrowRight size={18} color={Colors.textSecondary} />
              </TouchableOpacity>

              {/* Action 3: AI Mountain Concierge */}
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => {
                  onClose();
                  if (onSelectAiConcierge) {
                    onSelectAiConcierge();
                  }
                }}
                activeOpacity={0.88}
              >
                <View style={[styles.iconCircle, { backgroundColor: Colors.pillInactive }]}>
                  <Sparkles size={20} color={Colors.primaryBlack} />
                </View>
                <View style={styles.actionTextCol}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.actionTitle}>AI Mountain Concierge</Text>
                    <View style={[styles.tag, { backgroundColor: Colors.primaryBlack }]}>
                      <Text style={[styles.tagText, { color: Colors.textWhite }]}>Gemini AI</Text>
                    </View>
                  </View>
                  <Text style={styles.actionSubtitle}>
                    Instant custom itinerary, road pass advisories & secret dhabas.
                  </Text>
                </View>
                <ArrowRight size={18} color={Colors.textSecondary} />
              </TouchableOpacity>

              {/* Action 4: Pin a Secret Spot */}
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => {
                  onClose();
                  Alert.alert('Pin a Secret Spot', 'Submit your favorite hidden mountain viewpoint or dhaba to the Hilt community map!');
                }}
                activeOpacity={0.88}
              >
                <View style={styles.iconCircle}>
                  <MapPin size={22} color={Colors.primaryBlack} />
                </View>
                <View style={styles.actionTextCol}>
                  <Text style={styles.actionTitle}>Pin a Local Secret Spot</Text>
                  <Text style={styles.actionSubtitle}>
                    Contribute authentic tea stalls, waterfalls, or sunset points.
                  </Text>
                </View>
                <ArrowRight size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
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
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  bottomSheetWrapper: {
    backgroundColor: Colors.surfaceLight,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  sheetContainer: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 32,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  kickerText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.pillInactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsList: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundApp,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  actionTextCol: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  actionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  tag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
  },
});
