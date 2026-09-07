import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { Colors } from '../constants/theme';
import { getFlaggedMessages, resolveFlaggedMessage } from '../lib/supabase';

/** Host safety-review queue: flagged Wayzyy chat messages awaiting decision. */
export function SafetyQueue({ hostId }: { hostId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setItems(await getFlaggedMessages(hostId));
  };

  useEffect(() => {
    load();
  }, [hostId]);

  if (items.length === 0) return null;

  const resolve = async (id: string, action: 'dismiss' | 'remove') => {
    setBusy(id);
    try {
      await resolveFlaggedMessage(id, action);
      setItems((prev) => prev.filter((m) => m.id !== id));
    } catch (e: any) {
      Alert.alert('Action failed', e.message || 'Try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <ShieldCheck size={16} color="#B91C1C" />
        <Text style={styles.title}>Safety review ({items.length})</Text>
      </View>
      {items.map((m) => (
        <View key={m.id} style={styles.card}>
          <Text style={styles.meta}>
            {m.conversation?.property?.title || 'Chat'} · {m.moderation_action}
          </Text>
          <Text style={styles.text} numberOfLines={3}>
            {m.text}
          </Text>
          <View style={styles.actions}>
            {busy === m.id ? (
              <ActivityIndicator size="small" />
            ) : (
              <>
                <TouchableOpacity style={styles.keepBtn} onPress={() => resolve(m.id, 'dismiss')}>
                  <Text style={styles.keepText}>Keep</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.removeBtn} onPress={() => resolve(m.id, 'remove')}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  title: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  card: { backgroundColor: '#FEF2F2', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#FECACA' },
  meta: { fontSize: 11, fontWeight: '700', color: '#B91C1C', marginBottom: 4 },
  text: { fontSize: 13, color: Colors.textPrimary, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  keepBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 9999, paddingVertical: 9, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  keepText: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  removeBtn: { flex: 1, backgroundColor: '#B91C1C', borderRadius: 9999, paddingVertical: 9, alignItems: 'center' },
  removeText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
