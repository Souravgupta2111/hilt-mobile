import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, ActivityIndicator } from 'react-native';
import { MapPin, Clock, Share2, Bookmark, Check } from 'lucide-react-native';
import type { GeneratedItinerary } from '../lib/ai-concierge';
import { Colors } from '../constants/theme';

interface ItineraryResultViewProps {
  plan: GeneratedItinerary;
  showSave?: boolean;
  saved?: boolean;
  saving?: boolean;
  onSave?: () => void;
  onNewPlan?: () => void;
}

export function ItineraryResultView({
  plan,
  showSave,
  saved,
  saving,
  onSave,
  onNewPlan,
}: ItineraryResultViewProps) {
  const dayNumbers = plan.days.map((d) => d.dayNumber);
  const [activeDay, setActiveDay] = useState(dayNumbers[0] ?? 1);
  const day = plan.days.find((d) => d.dayNumber === activeDay) ?? plan.days[0];

  const handleShare = () => {
    Share.share({ message: `${plan.title} — ${plan.valley} (${plan.days.length}-day plan via Hilt)` });
  };

  return (
    <View>
      <Text style={styles.title}>{plan.title}</Text>
      <View style={styles.metaRow}>
        <MapPin size={12} color={Colors.textSecondary} />
        <Text style={styles.meta}>{plan.valley}</Text>
        <Clock size={12} color={Colors.textSecondary} />
        <Text style={styles.meta}>
          {plan.days.length} day{plan.days.length === 1 ? '' : 's'}
        </Text>
        {plan.estimatedCostInr > 0 && (
          <Text style={styles.cost}>· ~₹{plan.estimatedCostInr.toLocaleString('en-IN')}</Text>
        )}
      </View>
      {plan.summary ? <Text style={styles.summary}>{plan.summary}</Text> : null}

      {plan.roadAdvisory ? (
        <View style={styles.roadBanner}>
          <Text style={styles.roadText}>{plan.roadAdvisory}</Text>
        </View>
      ) : null}

      {(showSave || onNewPlan) && (
        <View style={styles.actionsRow}>
          {showSave &&
            (saved ? (
              <View style={styles.savedPill}>
                <Check size={13} color="#15803D" />
                <Text style={styles.savedText}>Saved</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.textWhite} />
                ) : (
                  <>
                    <Bookmark size={13} color={Colors.textWhite} />
                    <Text style={styles.saveTextOnDark}>Save trip</Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
          <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
            <Share2 size={15} color={Colors.textPrimary} />
          </TouchableOpacity>
          {onNewPlan && (
            <TouchableOpacity onPress={onNewPlan}>
              <Text style={styles.newPlanLink}>New plan</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {plan.days.length > 1 && (
        <View style={styles.dayRow}>
          {dayNumbers.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.dayPill, activeDay === d && styles.dayPillActive]}
              onPress={() => setActiveDay(d)}
            >
              <Text style={[styles.dayText, activeDay === d && styles.dayTextActive]}>
                Day {d}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {day && (
        <View>
          <Text style={styles.dayTheme}>{day.theme}</Text>
          {day.activities.map((act, idx) => (
            <View key={idx} style={styles.item}>
              <Text style={styles.time}>{act.time}</Text>
              <Text style={styles.actTitle}>{act.title}</Text>
              {act.description ? <Text style={styles.actDesc}>{act.description}</Text> : null}
              {act.insiderTip ? (
                <View style={styles.tipBox}>
                  <Text style={styles.tipText}>{act.insiderTip}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, flexWrap: 'wrap' },
  meta: { fontSize: 12, color: Colors.textSecondary, marginRight: 8 },
  cost: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  summary: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginTop: 8 },
  roadBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  roadText: { fontSize: 12, color: '#92400E', lineHeight: 17 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryBlack,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  saveTextOnDark: { fontSize: 13, fontWeight: '700', color: Colors.textWhite },
  savedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  savedText: { fontSize: 13, fontWeight: '700', color: '#15803D' },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.pillInactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newPlanLink: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    textDecorationLine: 'underline',
  },
  dayRow: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 4 },
  dayPill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9999,
    backgroundColor: Colors.pillInactive,
  },
  dayPillActive: { backgroundColor: Colors.primaryBlack },
  dayText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  dayTextActive: { color: Colors.textWhite },
  dayTheme: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginTop: 12, marginBottom: 4 },
  item: {
    borderLeftWidth: 2,
    borderLeftColor: '#E5E7EB',
    paddingLeft: 12,
    marginTop: 12,
  },
  time: { fontSize: 10, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.5 },
  actTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  actDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginTop: 3 },
  tipBox: { backgroundColor: Colors.backgroundApp, borderRadius: 10, padding: 8, marginTop: 6 },
  tipText: { fontSize: 12, color: Colors.textPrimary, fontStyle: 'italic', lineHeight: 17 },
});
