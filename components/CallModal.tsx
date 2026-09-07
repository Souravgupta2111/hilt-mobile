import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, Phone, PhoneOff } from 'lucide-react-native';
import { Colors } from '../constants/theme';
import type { CallSignal } from '../types/database';
import { setCallStatus } from '../lib/calls';

interface CallModalProps {
  visible: boolean;
  signal: CallSignal | null;
  isCaller: boolean;
  otherName: string;
  onEnd: () => void;
}

function formatElapsed(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * In-app call screen. Numbers are never shown or exchanged —
 * setup runs over Supabase signalling only.
 */
export function CallModal({ visible, signal, isCaller, otherName, onEnd }: CallModalProps) {
  const [elapsed, setElapsed] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!visible) {
      setElapsed(0);
      setConnected(false);
      return;
    }
    if (signal?.status === 'accepted') setConnected(true);
    const t = setInterval(() => {
      if (signal?.status === 'accepted') {
        setConnected(true);
        setElapsed((e) => e + 1);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [visible, signal?.status, signal?.id]);

  const handleEnd = async () => {
    try {
      if (signal) await setCallStatus(signal.id, 'ended');
    } catch {
      // still close locally
    }
    onEnd();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleEnd} style={styles.closeBtn}>
            <X size={20} color={Colors.textWhite} />
          </TouchableOpacity>
          <Text style={styles.secureLabel}>In-app call · number hidden</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.center}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{otherName.slice(0, 1).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{otherName}</Text>
          <Text style={styles.status}>
            {!connected
              ? isCaller
                ? 'Ringing…'
                : 'Connecting…'
              : formatElapsed(elapsed)}
          </Text>
          {!connected && (
            <ActivityIndicator color={Colors.textWhite} style={{ marginTop: 12 }} />
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.endBtn} onPress={handleEnd} activeOpacity={0.85}>
            <PhoneOff size={24} color={Colors.textWhite} />
          </TouchableOpacity>
          <Text style={styles.endLabel}>End</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export function IncomingCallBanner({
  callerName,
  onAccept,
  onDecline,
}: {
  callerName: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <View style={styles.incoming}>
      <View style={styles.incomingIcon}>
        <Phone size={18} color={Colors.textWhite} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.incomingTitle}>Incoming call</Text>
        <Text style={styles.incomingSub}>{callerName} · via Hilt</Text>
      </View>
      <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
        <Text style={styles.acceptText}>Join</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.declineBtn} onPress={onDecline}>
        <Text style={styles.declineText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
}

export function showCallBlocked(reason?: string) {
  Alert.alert('Calls unavailable', reason || 'Calls unlock once the booking is confirmed.');
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F1419' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secureLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.textWhite, fontSize: 32, fontWeight: '800' },
  name: { color: Colors.textWhite, fontSize: 22, fontWeight: '800', marginTop: 14 },
  status: { color: '#9CA3AF', fontSize: 15, marginTop: 6, fontVariant: ['tabular-nums'] },
  footer: { alignItems: 'center', paddingBottom: 40 },
  endBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endLabel: { color: '#9CA3AF', fontSize: 12, marginTop: 8 },
  incoming: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0F1419',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  incomingIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomingTitle: { color: Colors.textWhite, fontSize: 14, fontWeight: '700' },
  incomingSub: { color: '#9CA3AF', fontSize: 12 },
  acceptBtn: { backgroundColor: '#16A34A', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9999 },
  acceptText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  declineBtn: { paddingHorizontal: 10, paddingVertical: 9 },
  declineText: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
});
