export interface RazorpayOrderPayload {
  amount: number; // in INR
  currency?: string;
  receipt: string;
  propertyId: string;
  travelerId: string;
  roomId?: string;
  bookingType: 'entire_villa' | 'single_room';
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  totalNights: number;
  nightlyRate: number;
  subtotal: number;
  cleaningFee?: number;
  platformFee: number;
  gstAmount?: number;
  /** 'confirmed' for instant-book, 'pending' for request-to-book. */
  initialStatus?: 'pending' | 'confirmed';
  guestEmail?: string;
}

export interface PaymentSuccessResponse {
  razorpay_payment_id: string | null;
  razorpay_order_id: string;
  razorpay_signature: string | null;
  escrow_status: 'held_in_escrow' | 'order_created';
  escrow_release_time: string | null;
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '';

function requireSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase is not configured. Cannot create payment order.');
  }
}

/**
 * Creates a Razorpay order through the live Edge Function, carrying the full
 * booking intent in notes so the signature-verified webhook confirms exactly.
 * Throws on failure — no local fake orders.
 */
export async function createRazorpayOrder(
  payload: RazorpayOrderPayload
): Promise<{ id: string; amount: number; currency: string }> {
  requireSupabaseConfig();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/razorpay-create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY as string,
    },
    body: JSON.stringify({
      amount: payload.amount,
      currency: payload.currency || 'INR',
      property_id: payload.propertyId,
      traveler_id: payload.travelerId,
      room_id: payload.roomId,
      booking_type: payload.bookingType,
      check_in: payload.checkIn,
      check_out: payload.checkOut,
      guests_count: payload.guestsCount,
      total_nights: payload.totalNights,
      nightly_rate: payload.nightlyRate,
      subtotal: payload.subtotal,
      cleaning_fee: payload.cleaningFee ?? 0,
      platform_fee: payload.platformFee,
      gst_amount: payload.gstAmount ?? 0,
      initial_status: payload.initialStatus ?? 'confirmed',
      guest_email: payload.guestEmail,
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Order creation failed (${res.status})`);
  }
  if (!data?.order?.id) {
    throw new Error(data?.error || 'Payment provider did not return an order.');
  }
  return {
    id: data.order.id,
    amount: data.order.amount,
    currency: data.order.currency || 'INR',
  };
}
