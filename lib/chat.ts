import { supabase, getAuthUser, getCurrentUserProfile } from './supabase';
import { moderateChatMessage, recordWayzyyBlock, type ChatStage } from './wayzyy';
import { ModAction, TrustTier } from '@wayzyy/moderation-engine';
import { requestPush } from './push';
import type { Booking, Conversation, Message } from '../types/database';

export function bookingToChatStage(booking: Booking): ChatStage {
  const today = new Date().toISOString().split('T')[0];
  if (booking.check_in <= today && today <= booking.check_out) return 'checkedIn';
  if (booking.status === 'confirmed' || booking.status === 'completed') return 'booked';
  return 'inquiry';
}

async function senderTrust(userId: string): Promise<{ trust: TrustTier; priorViolations: number }> {
  try {
    const [profileRes, flaggedRes] = await Promise.all([
      supabase.from('profiles').select('is_identity_verified').eq('id', userId).single(),
      supabase.from('messages').select('id', { count: 'exact', head: true }).eq('sender_id', userId).eq('flagged', true),
    ]);
    const violations = flaggedRes.count ?? 0;
    const verified = profileRes.data?.is_identity_verified;
    const trust = violations > 2 ? TrustTier.Fresh : verified ? TrustTier.Trusted : TrustTier.Standard;
    return { trust, priorViolations: violations };
  } catch {
    return { trust: TrustTier.Standard, priorViolations: 0 };
  }
}

/** Fetch or create the 1:1 conversation for a booking. Caller must be a participant. */
export async function getOrCreateConversation(booking: Booking): Promise<Conversation> {
  const user = await getAuthUser();
  if (!user) throw new Error('Sign in to message.');
  const hostId = booking.property?.host_id;
  if (!hostId) throw new Error('Host not found for this booking.');
  if (user.id !== booking.traveler_id && user.id !== hostId) {
    throw new Error('Only booking participants can message.');
  }
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('booking_id', booking.id)
    .single();
  if (existing) return existing as Conversation;

  const { data, error } = await supabase
    .from('conversations')
    .insert([
      {
        booking_id: booking.id,
        property_id: booking.property_id,
        traveler_id: booking.traveler_id,
        host_id: hostId,
      },
    ])
    .select('*')
    .single();
  if (error || !data) throw error || new Error('Could not start conversation.');
  return data as Conversation;
}

export async function listConversations(): Promise<Conversation[]> {
  const user = await getAuthUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('conversations')
    .select('*, property:properties(*)')
    .or(`traveler_id.eq.${user.id},host_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false });
  if (error || !data) return [];

  const convos = data as Conversation[];
  const otherIds = [...new Set(convos.map((c) => (c.traveler_id === user.id ? c.host_id : c.traveler_id)))];
  const { data: profiles } = otherIds.length
    ? await supabase.from('profiles').select('*').in('id', otherIds)
    : { data: [] };
  const byId = new Map((profiles || []).map((p: any) => [p.id, p]));

  const withLast = await Promise.all(
    convos.map(async (c) => {
      const { data: last } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', c.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      return {
        ...c,
        other_party: byId.get(c.traveler_id === user.id ? c.host_id : c.traveler_id),
        last_message: (last as Message) ?? undefined,
      };
    })
  );
  return withLast;
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  return (data || []) as Message[];
}

export function subscribeMessages(conversationId: string, onInsert: (m: Message) => void) {
  return supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert(payload.new as Message)
    )
    .subscribe();
}

export interface SendOutcome {
  sent: boolean;
  action: ModAction;
  notice?: string;
  message?: Message;
}

/**
 * Moderates with the real Wayzyy engine, then persists.
 * Blocked / under-review text is never stored.
 */
export async function sendModeratedMessage(
  conversation: Conversation,
  booking: Booking,
  rawText: string
): Promise<SendOutcome> {
  const user = await getAuthUser();
  const profile = await getCurrentUserProfile();
  if (!user || !profile) throw new Error('Sign in to message.');
  const text = rawText.trim();
  if (!text) return { sent: false, action: ModAction.Allow };

  const { trust, priorViolations } = await senderTrust(user.id);
  const outcome = await moderateChatMessage(text, {
    conversationId: conversation.id,
    senderId: user.id,
    stage: bookingToChatStage(booking),
    trust,
    priorViolations,
  });

  if (outcome.action === ModAction.Block) {
    recordWayzyyBlock(user.id);
    return {
      sent: false,
      action: outcome.action,
      notice: 'Not sent. Contact details, links, payments, or unsafe content are blocked in chat.',
    };
  }
  if (outcome.action === ModAction.Review) {
    recordWayzyyBlock(user.id);
    return { sent: false, action: outcome.action, notice: 'Held for safety review. The host will see it after review.' };
  }
  if (outcome.action === ModAction.Warn) {
    // Caller shows a confirm dialog; returning unsent lets UI decide.
    return { sent: false, action: outcome.action, notice: outcome.reasonCodes.join(', ') };
  }

  const { data, error } = await supabase
    .from('messages')
    .insert([
      {
        conversation_id: conversation.id,
        sender_id: user.id,
        text: outcome.sendText,
        moderation_action: outcome.action,
        moderation_score: outcome.score,
        flagged: outcome.action !== ModAction.Allow,
      },
    ])
    .select('*')
    .single();
  if (error || !data) throw error || new Error('Could not send.');

  await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation.id);

  // Nudge the other side (fire-and-forget).
  requestPush('message', {
    conversation_id: conversation.id,
    sender_id: user.id,
    preview: outcome.sendText,
  }).catch(() => {});

  const notice =
    outcome.action === ModAction.Mask
      ? 'Contact info was automatically masked.'
      : outcome.action === ModAction.Hint
        ? 'Sent. Keep payments and contact details inside Hilt.'
        : undefined;
  return { sent: true, action: outcome.action, notice, message: data as Message };
}

/** Force-send after the user accepts a Warn dialog. Still never stores Block. */
export async function sendWarnAccepted(
  conversation: Conversation,
  rawText: string
): Promise<SendOutcome> {
  const user = await getAuthUser();
  if (!user) throw new Error('Sign in to message.');
  const { data, error } = await supabase
    .from('messages')
    .insert([
      {
        conversation_id: conversation.id,
        sender_id: user.id,
        text: rawText.trim(),
        moderation_action: ModAction.Warn,
        moderation_score: 0.6,
        flagged: true,
      },
    ])
    .select('*')
    .single();
  if (error || !data) throw error || new Error('Could not send.');
  await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation.id);
  requestPush('message', {
    conversation_id: conversation.id,
    sender_id: user.id,
    preview: rawText.trim(),
  }).catch(() => {});
  return { sent: true, action: ModAction.Warn, message: data as Message };
}
