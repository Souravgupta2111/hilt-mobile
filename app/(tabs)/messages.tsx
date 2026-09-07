import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { EmptyState } from '../../components/EmptyState';
import { ChatThread } from '../../components/ChatThread';
import { AuthModal } from '../../components/AuthModal';
import { listConversations } from '../../lib/chat';
import { getTravelerBookings, getHostBookings, getAuthUser } from '../../lib/supabase';
import type { Booking, Conversation } from '../../types/database';

export default function MessagesScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams() as { conversationId?: string };
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [bookingsById, setBookingsById] = useState<Record<string, Booking>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const user = await getAuthUser();
      setCurrentUserId(user?.id ?? null);
      if (!user) {
        setConversations([]);
        return;
      }
      const [convos, mine, hosting] = await Promise.all([
        listConversations(),
        getTravelerBookings(),
        getHostBookings(user.id),
      ]);
      setConversations(convos);
      const map: Record<string, Booking> = {};
      [...mine, ...hosting].forEach((b) => {
        map[b.id] = b;
      });
      setBookingsById(map);
      setSelected((prev) => (prev ? convos.find((c) => c.id === prev.id) ?? null : prev));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  // Deep link from Trips → open a specific thread.
  React.useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const match = conversations.find((c) => c.id === conversationId);
      if (match) setSelected(match);
    }
  }, [conversationId, conversations.length]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!loading && !currentUserId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <EmptyState
          title="Sign in to chat"
          description="Messages with your hosts live here."
          actionText="Sign in"
          onAction={() => setAuthOpen(true)}
        />
        <AuthModal visible={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => load()} />
      </SafeAreaView>
    );
  }

  if (selected && currentUserId) {
    const booking = bookingsById[selected.booking_id];
    if (!booking) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.threadTop}>
            <TouchableOpacity onPress={() => setSelected(null)}>
              <Text style={styles.backLink}>‹ All messages</Text>
            </TouchableOpacity>
          </View>
          <EmptyState title="Booking unavailable" description="This conversation's booking could not be loaded." />
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.threadTop}>
          <TouchableOpacity onPress={() => setSelected(null)}>
            <Text style={styles.backLink}>‹ All messages</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.threadWrap}>
          <ChatThread conversation={selected} booking={booking} currentUserId={currentUserId} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title="No messages yet"
              description="Book a stay and your host chat will appear here."
              actionText="Explore stays"
              onAction={() => router.push('/(tabs)')}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => setSelected(item)} activeOpacity={0.8}>
            <View style={styles.avatar}>
              <MessageCircle size={18} color={Colors.textPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {item.other_party?.full_name || 'Host'}
              </Text>
              <Text style={styles.preview} numberOfLines={1}>
                {item.last_message?.text || item.property?.title || 'New conversation'}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 14 : 8, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  list: { paddingHorizontal: 20, paddingBottom: 140 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.pillInactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  preview: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  chevron: { fontSize: 20, color: Colors.textMuted },
  threadTop: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 14 : 8, paddingBottom: 4 },
  backLink: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  threadWrap: { flex: 1, paddingHorizontal: 20, paddingBottom: 110 },
});
