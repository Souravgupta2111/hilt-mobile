import { supabase, getAuthUser } from './supabase';
import type { Booking, CallSignal, Conversation } from '../types/database';

/**
 * In-app calling without phone numbers.
 * Signalling runs over Supabase Realtime. No PSTN, no number exchange —
 * neither party ever sees the other's number.
 * Voice transport requires a relay provider in production (see review).
 */

export function canCallBooking(booking: Booking): { ok: boolean; reason?: string } {
  if (booking.status !== 'confirmed' && booking.status !== 'completed') {
    return { ok: false, reason: 'Calls unlock once the booking is confirmed.' };
  }
  const today = new Date().toISOString().split('T')[0];
  const dayAfter = new Date(new Date(booking.check_out).getTime() + 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  if (today > dayAfter) {
    return { ok: false, reason: 'This trip has ended.' };
  }
  return { ok: true };
}

export async function startCall(conversation: Conversation, calleeId: string): Promise<CallSignal> {
  const user = await getAuthUser();
  if (!user) throw new Error('Sign in to call.');
  const { data, error } = await supabase
    .from('call_signals')
    .insert([
      {
        conversation_id: conversation.id,
        caller_id: user.id,
        callee_id: calleeId,
      },
    ])
    .select('*')
    .single();
  if (error || !data) throw error || new Error('Could not start call.');
  return data as CallSignal;
}

export async function setCallStatus(signalId: string, status: CallSignal['status']) {
  const { error } = await supabase
    .from('call_signals')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', signalId);
  if (error) throw error;
}

export function subscribeCallSignals(
  conversationId: string,
  handlers: { onInsert: (s: CallSignal) => void; onUpdate: (s: CallSignal) => void }
) {
  return supabase
    .channel(`calls:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'call_signals', filter: `conversation_id=eq.${conversationId}` },
      (p) => handlers.onInsert(p.new as CallSignal)
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'call_signals', filter: `conversation_id=eq.${conversationId}` },
      (p) => handlers.onUpdate(p.new as CallSignal)
    )
    .subscribe();
}
