import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Send, Phone, ShieldCheck } from 'lucide-react-native';
import { Colors } from '../constants/theme';
import type { Booking, Conversation, Message, CallSignal } from '../types/database';
import {
  listMessages,
  subscribeMessages,
  sendModeratedMessage,
  sendWarnAccepted,
} from '../lib/chat';
import { canCallBooking, startCall, setCallStatus, subscribeCallSignals } from '../lib/calls';
import { ModAction } from '@wayzyy/moderation-engine';
import { CallModal, IncomingCallBanner, showCallBlocked } from './CallModal';

interface ChatThreadProps {
  conversation: Conversation;
  booking: Booking;
  currentUserId: string;
}

export function ChatThread({ conversation, booking, currentUserId }: ChatThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<CallSignal | null>(null);
  const [isCaller, setIsCaller] = useState(false);
  const [incoming, setIncoming] = useState<CallSignal | null>(null);
  const listRef = useRef<FlatList>(null);

  const otherId = conversation.traveler_id === currentUserId ? conversation.host_id : conversation.traveler_id;
  const otherName = conversation.other_party?.full_name || 'Host';

  useEffect(() => {
    let mounted = true;
    listMessages(conversation.id).then((m) => mounted && setMessages(m));
    const msgSub = subscribeMessages(conversation.id, (m) => {
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    });
    const callSub = subscribeCallSignals(conversation.id, {
      onInsert: (s) => {
        if (s.callee_id === currentUserId && s.status === 'ringing') setIncoming(s);
        if (s.caller_id === currentUserId) {
          setActiveCall(s);
          setIsCaller(true);
        }
      },
      onUpdate: (s) => {
        if (activeCallRef.current?.id === s.id) setActiveCall(s);
        if (s.status === 'accepted' && (s.caller_id === currentUserId || s.callee_id === currentUserId)) {
          setActiveCall(s);
          setIncoming(null);
        }
        if ((s.status === 'declined' || s.status === 'ended' || s.status === 'missed') && s.caller_id === currentUserId) {
          setActiveCall((prev) => (prev?.id === s.id ? s : prev));
        }
        if ((s.status === 'declined' || s.status === 'ended') && s.callee_id === currentUserId) {
          setIncoming(null);
          setActiveCall(null);
        }
      },
    });
    return () => {
      mounted = false;
      msgSub.unsubscribe();
      callSub.unsubscribe();
    };
  }, [conversation.id]);

  const activeCallRef = useRef(activeCall);
  activeCallRef.current = activeCall;

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async (forceText?: string) => {
    const text = (forceText ?? draft).trim();
    if (!text || sending) return;
    setSending(true);
    setNotice(null);
    try {
      const outcome = await sendModeratedMessage(conversation, booking, text);
      if (outcome.sent) {
        setDraft('');
        if (outcome.notice) setNotice(outcome.notice);
      } else if (outcome.action === ModAction.Warn) {
        Alert.alert(
          'Send anyway?',
          'This message looks like it may break chat rules (contact info, links, or payments). The host reports and safety review still apply.',
          [
            { text: 'Edit', style: 'cancel' },
            {
              text: 'Send',
              onPress: async () => {
                const forced = await sendWarnAccepted(conversation, text);
                if (forced.sent) setDraft('');
              },
            },
          ]
        );
      } else {
        setNotice(outcome.notice || 'Not sent.');
      }
    } catch (e: any) {
      setNotice(e.message || 'Could not send.');
    } finally {
      setSending(false);
    }
  };

  const handleCall = async () => {
    const gate = canCallBooking(booking);
    if (!gate.ok) {
      showCallBlocked(gate.reason);
      return;
    }
    try {
      const signal = await startCall(conversation, otherId);
      setActiveCall(signal);
      setIsCaller(true);
    } catch (e: any) {
      Alert.alert('Call failed', e.message || 'Try again.');
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const mine = item.sender_id === currentUserId;
    return (
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        <Text style={[styles.bubbleText, mine ? styles.mineText : styles.theirsText]}>{item.text}</Text>
        {item.flagged && mine && (
          <View style={styles.flagRow}>
            <ShieldCheck size={11} color={mine ? 'rgba(255,255,255,0.7)' : Colors.textMuted} />
            <Text style={[styles.flagText, mine && styles.mineText]}>Safety-checked</Text>
          </View>
        )}
      </View>
    );
  };

  const callOpen = !!activeCall && (activeCall.status === 'ringing' || activeCall.status === 'accepted') && (isCaller || activeCall.callee_id === currentUserId);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={90}
    >
      <View style={styles.threadHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.threadTitle}>{otherName}</Text>
          <Text style={styles.threadSub}>
            {booking.property?.title || 'Trip chat'} · moderated
          </Text>
        </View>
        <TouchableOpacity
          style={styles.callBtn}
          onPress={handleCall}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Call host in app"
        >
          <Phone size={17} color={Colors.textWhite} />
        </TouchableOpacity>
      </View>

      {incoming && (
        <IncomingCallBanner
          callerName={otherName}
          onAccept={async () => {
            await setCallStatus(incoming.id, 'accepted');
            setActiveCall({ ...incoming, status: 'accepted' });
            setIsCaller(false);
            setIncoming(null);
          }}
          onDecline={async () => {
            await setCallStatus(incoming.id, 'declined');
            setIncoming(null);
          }}
        />
      )}

      {activeCall && isCaller && activeCall.status === 'declined' && (
        <View style={styles.callNote}>
          <Text style={styles.callNoteText}>No answer. Try again later.</Text>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Say hello — check-in time, directions, essentials.</Text>
        }
      />

      {notice && (
        <View style={styles.noticeBox}>
          <ShieldCheck size={13} color="#15803D" />
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Message (no phone numbers or links)"
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={1000}
          accessibilityLabel="Chat message"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
          onPress={() => handleSend()}
          disabled={!draft.trim() || sending}
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          {sending ? (
            <ActivityIndicator color={Colors.textWhite} size="small" />
          ) : (
            <Send size={17} color={Colors.textWhite} />
          )}
        </TouchableOpacity>
      </View>

      <CallModal
        visible={callOpen}
        signal={activeCall}
        isCaller={isCaller}
        otherName={otherName}
        onEnd={() => {
          setActiveCall(null);
          setIncoming(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 8,
  },
  threadTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  threadSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingVertical: 8, gap: 8 },
  empty: { textAlign: 'center', color: Colors.textMuted, fontSize: 13, marginTop: 24 },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 9, marginVertical: 3 },
  mine: { alignSelf: 'flex-end', backgroundColor: Colors.primaryBlack },
  theirs: { alignSelf: 'flex-start', backgroundColor: Colors.pillInactive },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  mineText: { color: Colors.textWhite },
  theirsText: { color: Colors.textPrimary },
  flagRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  flagText: { fontSize: 10, color: Colors.textMuted },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 9,
    marginBottom: 8,
  },
  noticeText: { fontSize: 12, color: '#15803D', flex: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingVertical: 8 },
  input: {
    flex: 1,
    backgroundColor: Colors.pillInactive,
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 11,
    fontSize: 14,
    color: Colors.textPrimary,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primaryBlack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  callNote: { backgroundColor: Colors.pillInactive, borderRadius: 10, padding: 9, marginBottom: 8 },
  callNoteText: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center' },
});
