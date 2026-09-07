import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Colors } from '../constants/theme';

interface CalendarRangePickerProps {
  bookedRanges: Array<{ start: string; end: string }>;
  blockedDates: string[];
  checkIn: string | null;
  checkOut: string | null;
  onChange: (checkIn: string | null, checkOut: string | null) => void;
}

function toISO(d: Date) {
  return d.toISOString().split('T')[0];
}

export function CalendarRangePicker({
  bookedRanges,
  blockedDates,
  checkIn,
  checkOut,
  onChange,
}: CalendarRangePickerProps) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const [monthOffset, setMonthOffset] = useState(0);

  const monthBase = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    return d;
  }, [today, monthOffset]);

  const isDisabled = (iso: string) => {
    if (iso < toISO(today)) return true;
    if (blockedDates.includes(iso)) return true;
    return bookedRanges.some((r) => iso >= r.start && iso < r.end);
  };

  const handleDay = (iso: string) => {
    if (isDisabled(iso)) return;
    if (!checkIn || (checkIn && checkOut)) {
      onChange(iso, null);
    } else if (iso > checkIn) {
      // Reject ranges crossing a blocked night.
      let cur = new Date(checkIn);
      const end = new Date(iso);
      let blocked = false;
      while (cur < end) {
        cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
        const c = toISO(cur);
        if (c < iso && isDisabled(c)) {
          blocked = true;
          break;
        }
      }
      if (blocked) {
        onChange(iso, null);
      } else {
        onChange(checkIn, iso);
      }
    } else {
      onChange(iso, null);
    }
  };

  const cells = useMemo(() => {
    const year = monthBase.getFullYear();
    const month = monthBase.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: Array<string | null> = [];
    for (let i = 0; i < firstWeekday; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      arr.push(toISO(new Date(year, month, d)));
    }
    return arr;
  }, [monthBase]);

  const monthLabel = monthBase.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <View>
      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.navBtn, monthOffset === 0 && styles.navBtnDisabled]}
          onPress={() => setMonthOffset(Math.max(0, monthOffset - 1))}
          disabled={monthOffset === 0}
        >
          <ChevronLeft size={18} color={monthOffset === 0 ? '#D1D5DB' : Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setMonthOffset(Math.min(11, monthOffset + 1))}
        >
          <ChevronRight size={18} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <View style={styles.weekRow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <Text key={i} style={styles.weekDay}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((iso, i) => {
          if (!iso) return <View key={`e${i}`} style={styles.cell} />;
          const disabled = isDisabled(iso);
          const isStart = iso === checkIn;
          const isEnd = iso === checkOut;
          const inRange = checkIn && checkOut && iso > checkIn && iso < checkOut;
          return (
            <TouchableOpacity
              key={iso}
              style={[
                styles.cell,
                (isStart || isEnd) && styles.cellSelected,
                inRange && styles.cellRange,
              ]}
              onPress={() => handleDay(iso)}
              disabled={disabled}
            >
              <Text
                style={[
                  styles.cellText,
                  (isStart || isEnd) && styles.cellTextSelected,
                  disabled && styles.cellTextDisabled,
                ]}
              >
                {parseInt(iso.split('-')[2], 10)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  navBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.pillInactive, alignItems: 'center', justifyContent: 'center' },
  navBtnDisabled: { opacity: 0.5 },
  monthLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 9999 },
  cellSelected: { backgroundColor: Colors.primaryBlack },
  cellRange: { backgroundColor: '#E5E7EB' },
  cellText: { fontSize: 14, color: Colors.textPrimary },
  cellTextSelected: { color: Colors.textWhite, fontWeight: '700' },
  cellTextDisabled: { color: '#D1D5DB', textDecorationLine: 'line-through' },
});
