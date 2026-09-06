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
import {
  Bed,
  Home,
  Bath,
  Armchair,
  Hotel,
  Minus,
  Plus,
  Zap,
  Wifi,
  Flame,
  Sun,
  CloudRain,
  Snowflake,
  Sparkles,
  MapPin,
  Compass,
  Check,
} from 'lucide-react-native';
import { HistogramSlider } from './HistogramSlider';
import { Colors } from '../constants/theme';

export interface FilterState {
  selectedTypes: string[];
  bedCount: number;
  bathCount: number;
  powerBackup: boolean;
  highSpeedWifi: boolean;
  fireplace: boolean;
  selectedSeason: string | null;
  selectedLandmark: string | null;
  radiusMinutes: number;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
}

export function FilterModal({ visible, onClose, onApply }: FilterModalProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['Beds', 'Baths']);
  const [bedCount, setBedCount] = useState(3);
  const [bathCount, setBathCount] = useState(2);
  const [powerBackup, setPowerBackup] = useState(true);
  const [highSpeedWifi, setHighSpeedWifi] = useState(true);
  const [fireplace, setFireplace] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [selectedLandmark, setSelectedLandmark] = useState<string | null>(null);
  const [radiusMinutes, setRadiusMinutes] = useState<number>(30);

  const homeTypes = [
    { id: 'Beds', label: 'Beds', icon: Bed },
    { id: 'Home', label: 'Home', icon: Home },
    { id: 'Baths', label: 'Baths', icon: Bath },
    { id: 'Chair', label: 'Chair', icon: Armchair },
    { id: 'Hotel', label: 'Hotel', icon: Hotel },
  ];

  const toggleType = (id: string) => {
    if (selectedTypes.includes(id)) {
      setSelectedTypes(selectedTypes.filter((t) => t !== id));
    } else {
      setSelectedTypes([...selectedTypes, id]);
    }
  };

  const seasons = [
    { id: 'spring', title: 'Spring Blossom', period: 'Apr – May', icon: Sparkles, color: '#EC4899', desc: 'Wild apple blossoms & crisp sunshine' },
    { id: 'summer', title: 'Summer Escape', period: 'Jun – Jul', icon: Sun, color: '#EAB308', desc: 'Lush 20°C pine heights vs 45°C plains' },
    { id: 'monsoon', title: 'Monsoon Mist', period: 'Aug – Sep', icon: CloudRain, color: '#3B82F6', desc: 'Gushing waterfalls, hot siddu & slow clouds' },
    { id: 'harvest', title: 'Apple Harvest', period: 'Oct – Nov', icon: Sparkles, color: '#EA580C', desc: 'Tree-ripened red apples & clear azure peaks' },
    { id: 'winter', title: 'Winter Snow', period: 'Dec – Feb', icon: Snowflake, color: '#06B6D4', desc: 'Snowdrifts, Bukhari stoves & freeze' },
  ];

  const landmarks = [
    { id: 'jalori', name: 'Jalori Pass & Serolsar Lake', valley: 'Tirthan / Jibhi' },
    { id: 'solang', name: 'Solang Valley & Rohtang Pass', valley: 'Upper Manali' },
    { id: 'old_manali', name: 'Old Manali Timber Bridge', valley: 'Manali' },
    { id: 'chauli', name: 'Chauli Ki Jali Cliff', valley: 'Mukteshwar (UK)' },
    { id: 'kasol', name: 'Parvati River Trail', valley: 'Kasol Valley' },
  ];

  const handleReset = () => {
    setSelectedTypes(['Beds']);
    setBedCount(1);
    setBathCount(1);
    setPowerBackup(false);
    setHighSpeedWifi(false);
    setFireplace(false);
    setSelectedSeason(null);
    setSelectedLandmark(null);
    setRadiusMinutes(30);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safeArea}>
        {/* Top Navigation */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.headerAction}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Filter</Text>
          <TouchableOpacity onPress={handleReset} activeOpacity={0.7}>
            <Text style={styles.headerAction}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Flexible Season Filters */}
          <View style={styles.seasonHeaderRow}>
            <Text style={styles.sectionTitle}>Flexible Season Planning</Text>
            {selectedSeason && (
              <TouchableOpacity onPress={() => setSelectedSeason(null)}>
                <Text style={styles.clearLink}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.sectionSubtitle}>
            Filter homestays optimized for each Himalayan season
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.seasonScroll}>
            {seasons.map((s) => {
              const isSelected = selectedSeason === s.id;
              const IconComp = s.icon;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.seasonCard, isSelected && styles.seasonCardActive]}
                  onPress={() => setSelectedSeason(isSelected ? null : s.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.seasonCardTop}>
                    <View style={[styles.seasonIconWrap, { backgroundColor: `${s.color}20` }]}>
                      <IconComp size={16} color={s.color} />
                    </View>
                    {isSelected && <Check size={14} color={Colors.textWhite} />}
                  </View>
                  <Text style={[styles.seasonTitle, isSelected && styles.seasonTitleActive]}>
                    {s.title}
                  </Text>
                  <Text style={[styles.seasonPeriod, isSelected && styles.seasonPeriodActive]}>
                    {s.period}
                  </Text>
                  <Text style={[styles.seasonDesc, isSelected && styles.seasonDescActive]} numberOfLines={2}>
                    {s.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Landmark-Based Radius Search */}
          <View style={[styles.seasonHeaderRow, { marginTop: 22 }]}>
            <Text style={styles.sectionTitle}>Landmark Proximity Search</Text>
            {selectedLandmark && (
              <TouchableOpacity onPress={() => setSelectedLandmark(null)}>
                <Text style={styles.clearLink}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.sectionSubtitle}>
            Find stays within minutes of iconic mountain passes & trails
          </Text>

          {/* Landmark Chips */}
          <View style={styles.landmarksGrid}>
            {landmarks.map((lm) => {
              const isSelected = selectedLandmark === lm.id;
              return (
                <TouchableOpacity
                  key={lm.id}
                  style={[styles.landmarkChip, isSelected && styles.landmarkChipActive]}
                  onPress={() => setSelectedLandmark(isSelected ? null : lm.id)}
                  activeOpacity={0.85}
                >
                  <MapPin size={13} color={isSelected ? Colors.textWhite : Colors.textPrimary} />
                  <View>
                    <Text style={[styles.landmarkName, isSelected && styles.landmarkNameActive]}>
                      {lm.name}
                    </Text>
                    <Text style={[styles.landmarkValley, isSelected && styles.landmarkValleyActive]}>
                      {lm.valley}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Radius Selector Pills */}
          {selectedLandmark && (
            <View style={styles.radiusContainer}>
              <Text style={styles.radiusLabel}>Maximum Distance from Landmark:</Text>
              <View style={styles.radiusPillRow}>
                {[15, 30, 60].map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    style={[
                      styles.radiusPill,
                      radiusMinutes === mins && styles.radiusPillActive,
                    ]}
                    onPress={() => setRadiusMinutes(mins)}
                  >
                    <Text
                      style={[
                        styles.radiusPillText,
                        radiusMinutes === mins && styles.radiusPillTextActive,
                      ]}
                    >
                      {mins === 15 ? '≤ 15 mins (Walk/Drive)' : mins === 30 ? '≤ 30 mins' : '≤ 1 Hour'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Home Type Section */}
          <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Home type</Text>
          <View style={styles.typeChipsRow}>
            {homeTypes.map((item) => {
              const isSelected = selectedTypes.includes(item.id);
              const IconComp = item.icon;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.typeChip, isSelected && styles.typeChipSelected]}
                  onPress={() => toggleType(item.id)}
                  activeOpacity={0.8}
                >
                  <IconComp
                    size={16}
                    color={isSelected ? Colors.textWhite : Colors.textPrimary}
                  />
                  <Text style={[styles.typeChipText, isSelected && styles.typeChipTextSelected]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Price Range Histogram */}
          <HistogramSlider
            title="Price Range"
            minLabel="₹0"
            maxLabel="₹50,000+"
            bars={[10, 20, 40, 75, 95, 100, 85, 60, 45, 70, 85, 65, 40, 30, 20, 15]}
          />

          {/* Square Footage Histogram */}
          <HistogramSlider
            title="Square footage"
            minLabel="0 sqft"
            maxLabel="10000+ sqft"
            bars={[15, 30, 60, 90, 80, 50, 70, 85, 100, 60, 40, 30, 25, 15, 10]}
          />

          {/* Home Details Steppers */}
          <Text style={styles.sectionTitle}>Home Details</Text>
          
          <View style={styles.stepperRow}>
            <Text style={styles.stepperLabel}>Beds</Text>
            <View style={styles.stepperControls}>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => setBedCount(Math.max(1, bedCount - 1))}
              >
                <Minus size={14} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.stepValue}>{bedCount}</Text>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => setBedCount(bedCount + 1)}
              >
                <Plus size={14} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.stepperRow}>
            <Text style={styles.stepperLabel}>Baths</Text>
            <View style={styles.stepperControls}>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => setBathCount(Math.max(1, bathCount - 1))}
              >
                <Minus size={14} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.stepValue}>{bathCount}</Text>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => setBathCount(bathCount + 1)}
              >
                <Plus size={14} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Mountain Specific Essentials (Hilt Features) */}
          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Mountain Essentials</Text>
          <View style={styles.mountainGrid}>
            <TouchableOpacity
              style={[styles.mountainChip, powerBackup && styles.mountainChipActive]}
              onPress={() => setPowerBackup(!powerBackup)}
            >
              <Zap size={15} color={powerBackup ? Colors.textWhite : Colors.textPrimary} />
              <Text style={[styles.mountainText, powerBackup && styles.mountainTextActive]}>
                100% Power Backup
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mountainChip, highSpeedWifi && styles.mountainChipActive]}
              onPress={() => setHighSpeedWifi(!highSpeedWifi)}
            >
              <Wifi size={15} color={highSpeedWifi ? Colors.textWhite : Colors.textPrimary} />
              <Text style={[styles.mountainText, highSpeedWifi && styles.mountainTextActive]}>
                Fiber Wi-Fi (&gt;50 Mbps)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mountainChip, fireplace && styles.mountainChipActive]}
              onPress={() => setFireplace(!fireplace)}
            >
              <Flame size={15} color={fireplace ? Colors.textWhite : Colors.textPrimary} />
              <Text style={[styles.mountainText, fireplace && styles.mountainTextActive]}>
                Bukhari / Fireplace
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Floating Apply Filters Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => {
              onApply({
                selectedTypes,
                bedCount,
                bathCount,
                powerBackup,
                highSpeedWifi,
                fireplace,
                selectedSeason,
                selectedLandmark,
                radiusMinutes,
              });
              onClose();
            }}
            activeOpacity={0.88}
          >
            <Text style={styles.applyButtonText}>Apply filters</Text>
          </TouchableOpacity>
        </View>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerAction: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 90,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 20,
    marginBottom: 14,
  },
  typeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    backgroundColor: Colors.pillInactive,
  },
  typeChipSelected: {
    backgroundColor: Colors.primaryBlack,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  typeChipTextSelected: {
    color: Colors.textWhite,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  stepperLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLight,
  },
  stepValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  mountainGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  mountainChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9999,
    backgroundColor: Colors.pillInactive,
  },
  mountainChipActive: {
    backgroundColor: Colors.primaryBlack,
  },
  mountainText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  mountainTextActive: {
    color: Colors.textWhite,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  applyButton: {
    backgroundColor: Colors.primaryBlack,
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  applyButtonText: {
    color: Colors.textWhite,
    fontSize: 15,
    fontWeight: '700',
  },
  seasonHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 18,
    marginBottom: 2,
  },
  clearLink: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  seasonScroll: {
    gap: 12,
    paddingRight: 20,
    paddingBottom: 4,
  },
  seasonCard: {
    width: 160,
    backgroundColor: Colors.pillInactive,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  seasonCardActive: {
    backgroundColor: Colors.primaryBlack,
    borderColor: Colors.primaryBlack,
  },
  seasonCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  seasonIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seasonTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  seasonTitleActive: {
    color: Colors.textWhite,
  },
  seasonPeriod: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: 6,
  },
  seasonPeriodActive: {
    color: Colors.textWhite,
  },
  seasonDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 15,
  },
  seasonDescActive: {
    color: '#9CA3AF',
  },
  landmarksGrid: {
    gap: 8,
  },
  landmarkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.pillInactive,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  landmarkChipActive: {
    backgroundColor: Colors.primaryBlack,
    borderColor: Colors.primaryBlack,
  },
  landmarkName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  landmarkNameActive: {
    color: Colors.textWhite,
  },
  landmarkValley: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  landmarkValleyActive: {
    color: '#9CA3AF',
  },
  radiusContainer: {
    marginTop: 12,
    backgroundColor: Colors.backgroundApp,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  radiusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  radiusPillRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  radiusPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  radiusPillActive: {
    backgroundColor: Colors.primaryBlack,
    borderColor: Colors.primaryBlack,
  },
  radiusPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  radiusPillTextActive: {
    color: Colors.textWhite,
  },
});
