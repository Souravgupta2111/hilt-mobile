import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Property, Profile, Itinerary, ItineraryItem, Booking, GuestReview, HillCoverClaim } from '../types/database';
import type { GeneratedItinerary } from './ai-concierge';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export async function getAuthUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

async function ensureProfileForUser(user: {
  id: string;
  email?: string | null;
  phone?: string | null;
  user_metadata?: Record<string, any>;
}): Promise<Profile | null> {
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (existing) return existing as Profile;

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    (user.email ? user.email.split('@')[0] : 'Hilt Traveler');

  const { data: created, error } = await supabase
    .from('profiles')
    .insert([
      {
        id: user.id,
        full_name: fullName,
        email: user.email ?? null,
        phone: user.phone ?? user.user_metadata?.phone ?? null,
        role: 'traveler',
        is_identity_verified: false,
        rating: 5.0,
        reviews_count: 0,
        sold_count: 0,
      },
    ])
    .select('*')
    .single();

  if (error) return null;
  return created as Profile;
}

/** Currently signed-in user's profile, or null when logged out. */
export async function getCurrentUserProfile(): Promise<Profile | null> {
  try {
    const user = await getAuthUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (!error && data) return data as Profile;
    return ensureProfileForUser(user);
  } catch (err) {
    console.error('Error fetching current user profile:', err);
    return null;
  }
}

/** Current user if they are a host, otherwise null. No fallback user. */
export async function getHostProfile(): Promise<Profile | null> {
  const profile = await getCurrentUserProfile();
  if (profile && profile.role === 'host') return profile;
  return profile;
}

export async function getProperties(category?: string): Promise<Property[]> {
  try {
    let query = supabase
      .from('properties')
      .select('*, host:profiles(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (category && category !== 'All') {
      query = query.eq('category', category);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching properties:', error.message);
      return [];
    }
    return (data || []) as Property[];
  } catch (err) {
    console.error('Error fetching properties:', err);
    return [];
  }
}

export async function getHostProperties(hostId: string): Promise<Property[]> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*, host:profiles(*)')
      .eq('host_id', hostId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching host properties:', error.message);
      return [];
    }
    return (data || []) as Property[];
  } catch (err) {
    console.error('Error fetching host properties:', err);
    return [];
  }
}

export async function getPropertyById(id: string): Promise<Property | null> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*, host:profiles(*), rooms:property_rooms(*)')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return data as Property;
  } catch (err) {
    console.error('Error fetching property:', err);
    return null;
  }
}

export async function getItineraries(): Promise<Itinerary[]> {
  try {
    const { data, error } = await supabase
      .from('itineraries')
      .select('*, author:profiles(*), items:itinerary_items(*)')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching itineraries:', error.message);
      return [];
    }
    return (data || []) as Itinerary[];
  } catch (err) {
    console.error('Error fetching itineraries:', err);
    return [];
  }
}

function timeOfDayFor(time: string): ItineraryItem['time_of_day'] {
  const m = time.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!m) return 'morning';
  let hour = parseInt(m[1], 10) % 12;
  if (/pm/i.test(m[3])) hour += 12;
  if (hour < 11) return 'morning';
  if (hour < 16) return 'afternoon';
  if (hour < 20) return 'evening';
  return 'night';
}

function dbCategoryFor(
  category: string
): ItineraryItem['category'] {
  if (category === 'cultural') return 'culture';
  if (category === 'work') return 'cafe';
  return category as ItineraryItem['category'];
}

/** Persists a Gemini-generated plan to the user's saved trips. */
export async function saveGeneratedItinerary(plan: GeneratedItinerary): Promise<Itinerary> {
  const user = await getAuthUser();
  if (!user) throw new Error('Sign in to save trips.');

  const { data: itinerary, error: itineraryError } = await supabase
    .from('itineraries')
    .insert([
      {
        author_id: user.id,
        title: plan.title,
        region: plan.valley,
        duration_days: plan.days.length,
        summary: plan.summary,
        is_host_guide: false,
        likes_count: 0,
      },
    ])
    .select('*')
    .single();
  if (itineraryError || !itinerary) {
    throw itineraryError || new Error('Could not save trip.');
  }

  const rows = plan.days.flatMap((day) =>
    day.activities.map((act) => ({
      itinerary_id: itinerary.id,
      day_number: day.dayNumber,
      time_of_day: timeOfDayFor(act.time),
      place_name: act.title,
      category: dbCategoryFor(act.category),
      description: act.description,
      approx_cost: 0,
      insider_tip: act.insiderTip,
    }))
  );
  if (rows.length > 0) {
    const { error: itemsError } = await supabase.from('itinerary_items').insert(rows);
    if (itemsError) {
      await supabase.from('itineraries').delete().eq('id', itinerary.id);
      throw itemsError;
    }
  }
  return itinerary as Itinerary;
}

/** Trips the current user saved from the planner (newest first). */
export async function getMyItineraries(): Promise<Itinerary[]> {
  try {
    const user = await getAuthUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('itineraries')
      .select('*, author:profiles(*), items:itinerary_items(*)')
      .eq('author_id', user.id)
      .eq('is_host_guide', false)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching saved trips:', error.message);
      return [];
    }
    return (data || []) as Itinerary[];
  } catch (err) {
    console.error('Error fetching saved trips:', err);
    return [];
  }
}

/** Renders a saved DB trip with the same minimal result view as Gemini plans. */
export function itineraryToGenerated(itinerary: Itinerary): GeneratedItinerary {
  const byDay = new Map<number, ItineraryItem[]>();
  for (const item of itinerary.items || []) {
    const list = byDay.get(item.day_number) || [];
    list.push(item);
    byDay.set(item.day_number, list);
  }
  return {
    title: itinerary.title,
    valley: itinerary.region,
    summary: itinerary.summary || '',
    estimatedCostInr: 0,
    roadAdvisory: '',
    days: [...byDay.entries()]
      .sort(([a], [b]) => a - b)
      .map(([dayNumber, items]) => ({
        dayNumber,
        theme: `Day ${dayNumber}`,
        activities: items.map((item) => ({
          time: item.time_of_day,
          title: item.place_name,
          description: item.description || '',
          category: (['food', 'trek', 'viewpoint'].includes(item.category)
            ? item.category
            : 'cultural') as GeneratedItinerary['days'][number]['activities'][number]['category'],
          insiderTip: item.insider_tip || '',
        })),
      })),
  };
}

export async function createBooking(
  booking: Partial<Booking>
): Promise<{ data: Booking | null; error: any }> {
  try {
    if (!booking.property_id || !booking.traveler_id) {
      return { data: null, error: new Error('Missing property or traveler') };
    }
    const { data, error } = await supabase
      .from('bookings')
      .insert([booking])
      .select('*, property:properties(*, host:profiles(*))')
      .single();

    if (error || !data) return { data: null, error };

    // The scheduled host payout row is created server-side by the
    // trg_create_payout trigger, so travelers never write payout records.

    return { data: data as Booking, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/** Bookings for the currently signed-in traveler. Empty when logged out. */
export async function getTravelerBookings(): Promise<Booking[]> {
  try {
    const user = await getAuthUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('bookings')
      .select('*, property:properties(*, host:profiles(*)), room:property_rooms(*)')
      .eq('traveler_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching traveler bookings:', error.message);
      return [];
    }
    return (data || []) as Booking[];
  } catch (err) {
    console.error('Error fetching traveler bookings:', err);
    return [];
  }
}

/** Bookings across all properties owned by a host. */
export async function getHostBookings(hostId: string): Promise<Booking[]> {
  try {
    const { data: props } = await supabase
      .from('properties')
      .select('id')
      .eq('host_id', hostId);
    const ids = (props || []).map((p: any) => p.id);
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from('bookings')
      .select(
        '*, property:properties(*, host:profiles(*)), room:property_rooms(*), traveler:profiles!bookings_traveler_id_fkey(*)'
      )
      .in('property_id', ids)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching host bookings:', error.message);
      return [];
    }
    return (data || []) as Booking[];
  } catch (err) {
    console.error('Error fetching host bookings:', err);
    return [];
  }
}

export async function getHostStats(hostId: string): Promise<{
  grossEarnings: number;
  occupancyPercent: number;
  viewsCount: number;
  bookingsCount: number;
  reviewsCount: number;
  rating: number;
  nextPayoutAmount: number;
  nextPayoutDate: string | null;
}> {
  const empty = {
    grossEarnings: 0,
    occupancyPercent: 0,
    viewsCount: 0,
    bookingsCount: 0,
    reviewsCount: 0,
    rating: 0,
    nextPayoutAmount: 0,
    nextPayoutDate: null as string | null,
  };
  try {
    if (!hostId) return empty;
    const [propsRes, hostRes] = await Promise.all([
      supabase.from('properties').select('id, reviews_count, rating').eq('host_id', hostId),
      supabase.from('profiles').select('reviews_count, rating').eq('id', hostId).single(),
    ]);
    const propertyIds = (propsRes.data || []).map((p: any) => p.id);
    if (propertyIds.length === 0) {
      return {
        ...empty,
        reviewsCount: hostRes.data?.reviews_count ?? 0,
        rating: Number(hostRes.data?.rating ?? 0),
      };
    }
    const { data: bookings } = await supabase
      .from('bookings')
      .select('total_amount, total_nights, created_at')
      .in('property_id', propertyIds);
    const { data: payouts } = await supabase
      .from('host_payouts')
      .select('net_payout, payout_status, scheduled_payout_date')
      .eq('host_id', hostId)
      .eq('payout_status', 'scheduled')
      .order('scheduled_payout_date', { ascending: true })
      .limit(1);

    const list = bookings || [];
    const grossEarnings = list.reduce((acc: number, b: any) => acc + (b.total_amount || 0), 0);
    const totalNights = list.reduce((acc: number, b: any) => acc + (b.total_nights || 0), 0);
    const occupancyPercent = Math.min(100, Math.round((totalNights / 90) * 100));
    const next = payouts && payouts.length > 0 ? payouts[0] : null;

    return {
      grossEarnings,
      occupancyPercent,
      viewsCount: 0,
      bookingsCount: list.length,
      reviewsCount: hostRes.data?.reviews_count ?? 0,
      rating: Number(hostRes.data?.rating ?? 0),
      nextPayoutAmount: next?.net_payout ?? 0,
      nextPayoutDate: next
        ? new Date(next.scheduled_payout_date).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
          })
        : null,
    };
  } catch (err) {
    console.error('Error fetching host stats:', err);
    return empty;
  }
}

export async function signOut() {
  await supabase.auth.signOut();
}

/** Sends a password reset email link */
export async function resetPasswordForEmail(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: 'hilt://reset-password',
  });
  if (error) throw error;
}

/** Permanently deletes the current user's account and erases personal data (Apple Guideline 5.1.1(v)) */
export async function deleteCurrentUserAccount(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated.');
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || 'Account deletion failed.');
  }

  await supabase.auth.signOut();
}

// ---------------------------------------------------------------------------
// Search, wishlist, reviews, cancel/modify, availability, KYC
// ---------------------------------------------------------------------------

export interface SearchParams {
  query?: string;
  checkIn?: string; // YYYY-MM-DD
  checkOut?: string; // YYYY-MM-DD
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  category?: string;
  minBeds?: number;
  powerBackup?: boolean;
  highSpeedWifi?: boolean;
  sort?: 'recommended' | 'price_asc' | 'price_desc' | 'rating';
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && bStart < aEnd;
}

/** Full Airbnb-style search: text, dates (real availability), guests, price, sort. */
export async function searchProperties(params: SearchParams): Promise<Property[]> {
  let query = supabase
    .from('properties')
    .select('*, host:profiles(*)')
    .eq('is_active', true);

  if (params.category && params.category !== 'All') query = query.eq('category', params.category);
  if (params.minBeds && params.minBeds > 1) query = query.gte('bedrooms', params.minBeds);
  if (params.guests && params.guests > 1) query = query.gte('max_guests', params.guests);
  if (params.minPrice) query = query.gte('price_entire_villa', params.minPrice);
  if (params.maxPrice) query = query.lte('price_entire_villa', params.maxPrice);

  const q = params.query?.trim();
  if (q) {
    const like = `%${q}%`;
    query = query.or(`title.ilike.${like},town.ilike.${like},valley.ilike.${like},state.ilike.${like}`);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  let list = data as Property[];

  if (params.powerBackup) list = list.filter((p) => p.power_backup && p.power_backup !== 'None');
  if (params.highSpeedWifi) list = list.filter((p) => p.wifi_speed_mbps >= 50);

  // Real availability: stay-length limits + overlaps with live bookings + host blocks.
  if (params.checkIn && params.checkOut && list.length > 0) {
    const nights = Math.round(
      (new Date(params.checkOut).getTime() - new Date(params.checkIn).getTime()) / 86400000
    );
    if (nights >= 1) {
      list = list.filter(
        (p) => nights >= (p.min_nights ?? 1) && nights <= (p.max_nights ?? 30)
      );
    }
    const ids = list.map((p) => p.id);
    const [{ data: bookings }, { data: blocks }] = await Promise.all([
      supabase.rpc('booked_ranges_for_properties', { p_property_ids: ids }),
      supabase.from('property_blocks').select('property_id, blocked_date').in('property_id', ids),
    ]);
    list = list.filter((p) => {
      const clash = (bookings || []).some(
        (b: any) =>
          b.property_id === p.id &&
          rangesOverlap(params.checkIn!, params.checkOut!, b.check_in, b.check_out)
      );
      if (clash) return false;
      return !(blocks || []).some(
        (bl: any) =>
          bl.property_id === p.id &&
          bl.blocked_date >= params.checkIn! &&
          bl.blocked_date < params.checkOut!
      );
    });
  }

  switch (params.sort) {
    case 'price_asc':
      list = [...list].sort((a, b) => a.price_entire_villa - b.price_entire_villa);
      break;
    case 'price_desc':
      list = [...list].sort((a, b) => b.price_entire_villa - a.price_entire_villa);
      break;
    case 'rating':
      list = [...list].sort((a, b) => Number(b.rating) - Number(a.rating));
      break;
    default:
      list = [...list].sort((a, b) => Number(b.rating) - Number(a.rating));
  }
  return list;
}

/** Dates already taken for one property (bookings + blocks), for calendars. */
export async function getPropertyAvailability(propertyId: string): Promise<{
  bookedRanges: Array<{ start: string; end: string }>;
  blockedDates: string[];
}> {
  // Booked ranges come from a security-definer RPC: booking rows are
  // participant-visible only under RLS, but any guest may see availability.
  const [{ data: bookings }, { data: blocks }] = await Promise.all([
    supabase.rpc('booked_ranges_for_property', { p_property_id: propertyId }),
    supabase.from('property_blocks').select('blocked_date').eq('property_id', propertyId),
  ]);
  return {
    bookedRanges: (bookings || []).map((b: any) => ({ start: b.check_in, end: b.check_out })),
    blockedDates: (blocks || []).map((b: any) => b.blocked_date),
  };
}

// --- Wishlist ---

export async function getWishlistIds(): Promise<Set<string>> {
  const user = await getAuthUser();
  if (!user) return new Set();
  const { data } = await supabase.from('wishlists').select('property_id').eq('user_id', user.id);
  return new Set((data || []).map((w: any) => w.property_id));
}

export async function getWishlist(): Promise<Property[]> {
  const user = await getAuthUser();
  if (!user) return [];
  const { data } = await supabase
    .from('wishlists')
    .select('property:properties(*, host:profiles(*))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  return ((data || []).map((w: any) => w.property).filter(Boolean) as Property[]);
}

export async function toggleWishlist(propertyId: string): Promise<boolean> {
  const user = await getAuthUser();
  if (!user) throw new Error('Sign in to save stays.');
  const { data: existing } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', user.id)
    .eq('property_id', propertyId)
    .single();
  if (existing) {
    await supabase.from('wishlists').delete().eq('id', (existing as any).id);
    return false;
  }
  const { error } = await supabase
    .from('wishlists')
    .insert([{ user_id: user.id, property_id: propertyId }]);
  if (error) throw error;
  return true;
}

// --- Reviews ---

export async function getPropertyReviews(propertyId: string) {
  const { data } = await supabase
    .from('reviews')
    .select('*, reviewer:profiles(*)')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });
  return (data || []) as any[];
}

/** Traveler may review once per property after a past confirmed/completed stay. */
export async function canReviewProperty(propertyId: string): Promise<boolean> {
  const user = await getAuthUser();
  if (!user) return false;
  const today = new Date().toISOString().split('T')[0];
  const { data: stays } = await supabase
    .from('bookings')
    .select('id')
    .eq('property_id', propertyId)
    .eq('traveler_id', user.id)
    .in('status', ['confirmed', 'completed'])
    .lt('check_out', today)
    .limit(1);
  if (!stays || stays.length === 0) return false;
  const { data: mine } = await supabase
    .from('reviews')
    .select('id')
    .eq('property_id', propertyId)
    .eq('reviewer_id', user.id)
    .limit(1);
  return !mine || mine.length === 0;
}

export async function createReview(propertyId: string, rating: number, comment: string) {
  const user = await getAuthUser();
  if (!user) throw new Error('Sign in to review.');
  if (!(await canReviewProperty(propertyId))) throw new Error('Only past guests can review.');
  const { error } = await supabase
    .from('reviews')
    .insert([{ property_id: propertyId, reviewer_id: user.id, rating, comment: comment.trim() }]);
  if (error) throw error;
  // Recompute aggregate honestly from all reviews.
  const { data: all } = await supabase.from('reviews').select('rating').eq('property_id', propertyId);
  const ratings = (all || []).map((r: any) => Number(r.rating));
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  await supabase
    .from('properties')
    .update({ rating: Math.round(avg * 100) / 100, reviews_count: ratings.length })
    .eq('id', propertyId);
}

// --- Guest reviews (hosts review guests) ---

export async function getGuestReviews(travelerId: string): Promise<GuestReview[]> {
  try {
    const { data } = await supabase
      .from('guest_reviews')
      .select('*, host:profiles(*)')
      .eq('traveler_id', travelerId)
      .order('created_at', { ascending: false });
    return (data || []) as GuestReview[];
  } catch (err) {
    console.error('Error fetching guest reviews:', err);
    return [];
  }
}

/** Booking ids this host already reviewed (to toggle the review button). */
export async function getHostReviewedBookingIds(hostId: string): Promise<Set<string>> {
  try {
    const { data } = await supabase.from('guest_reviews').select('booking_id').eq('host_id', hostId);
    return new Set((data || []).map((r: any) => r.booking_id));
  } catch {
    return new Set();
  }
}

/** Host may review the guest once, after a completed stay. */
export async function canReviewGuest(bookingId: string): Promise<boolean> {
  const user = await getAuthUser();
  if (!user) return false;
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, traveler_id, property:properties(host_id)')
    .eq('id', bookingId)
    .single();
  if (!booking || (booking as any).status !== 'completed') return false;
  if ((booking as any).property?.host_id !== user.id) return false;
  const { data: existing } = await supabase
    .from('guest_reviews')
    .select('id')
    .eq('booking_id', bookingId)
    .limit(1);
  return !existing || existing.length === 0;
}

export async function createGuestReview(bookingId: string, rating: number, comment: string) {
  const user = await getAuthUser();
  if (!user) throw new Error('Sign in to review.');
  if (!(await canReviewGuest(bookingId))) {
    throw new Error('Only the host can review after a completed stay.');
  }
  const { data: booking } = await supabase
    .from('bookings')
    .select('property_id, traveler_id')
    .eq('id', bookingId)
    .single();
  if (!booking) throw new Error('Booking not found.');
  const { error } = await supabase.from('guest_reviews').insert([
    {
      booking_id: bookingId,
      property_id: (booking as any).property_id,
      host_id: user.id,
      traveler_id: (booking as any).traveler_id,
      rating,
      comment: comment.trim(),
    },
  ]);
  if (error) throw error;
}

// --- Pricing (change with CA sign-off) ---
// GST is charged on Hilt's 2% service fee. Guests see it as a separate line
// and it is part of every refund quote below.
export const GST_RATE = 0.18;
/** Bookings at or above this total require guest identity verification. */
export const KYC_REQUIRED_ABOVE = 25000;

export function priceQuote(nightlyRate: number, nights: number, cleaningFee = 0) {
  const subtotal = nightlyRate * Math.max(nights, 0) + cleaningFee;
  const platformFee = Math.round(subtotal * 0.02);
  const gstAmount = Math.round(platformFee * GST_RATE);
  return { subtotal, platformFee, gstAmount, total: subtotal + platformFee + gstAmount };
}

// --- Cancellation & modification ---
// Policy: 7+ days before check-in → full refund incl. fee.
// 2–6 days → 50% of subtotal, fee non-refundable. <2 days → no refund.

export function quoteCancellation(booking: Booking): { refundInr: number; policy: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkIn = new Date(booking.check_in);
  const daysLeft = Math.ceil((checkIn.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (!booking.razorpay_payment_id || booking.payment_status === 'pending') {
    return { refundInr: 0, policy: 'No payment captured yet — free cancellation.' };
  }
  // Requests the host never confirmed are always fully refunded.
  if (booking.status === 'pending' && booking.payment_status === 'captured_in_escrow') {
    return { refundInr: booking.total_amount, policy: 'Full refund — the host had not confirmed yet.' };
  }
  const halfStay = Math.round(((booking.subtotal ?? 0) + (booking.gst_amount ?? 0)) / 2);
  const policy = booking.property?.cancellation_policy ?? 'moderate';
  if (policy === 'flexible') {
    if (daysLeft >= 1) {
      return { refundInr: booking.total_amount, policy: 'Full refund (flexible: until a day before check-in).' };
    }
    return { refundInr: 0, policy: 'Non-refundable within 24 hours of check-in.' };
  }
  if (policy === 'strict') {
    if (daysLeft >= 14) {
      return { refundInr: booking.total_amount, policy: 'Full refund (strict: 14+ days before check-in).' };
    }
    if (daysLeft >= 7) {
      return {
        refundInr: halfStay,
        policy: '50% of stay amount refunded (strict: 7–13 days before check-in).',
      };
    }
    return { refundInr: 0, policy: 'Non-refundable within 7 days of check-in.' };
  }
  if (daysLeft >= 7) {
    return { refundInr: booking.total_amount, policy: 'Full refund (7+ days before check-in).' };
  }
  if (daysLeft >= 2) {
    return {
      refundInr: halfStay,
      policy: '50% of stay amount refunded (2–6 days before check-in).',
    };
  }
  return { refundInr: 0, policy: 'Non-refundable within 2 days of check-in.' };
}

/** Host confirms a request-to-book. Money is already in escrow; this releases the stay. */
export async function approveBooking(booking: Booking): Promise<void> {
  const user = await getAuthUser();
  const hostId = booking.property?.host_id;
  if (!user || !hostId || user.id !== hostId) throw new Error('Only the host can confirm.');
  if (booking.status !== 'pending') throw new Error('Only pending requests can be confirmed.');
  const { error } = await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', booking.id);
  if (error) throw error;
}

/** Host declines a request-to-book: full refund + release escrow hold + free dates. */
export async function declineBooking(booking: Booking): Promise<void> {
  const user = await getAuthUser();
  const hostId = booking.property?.host_id;
  if (!user || !hostId || user.id !== hostId) throw new Error('Only the host can decline.');
  if (booking.status !== 'pending') throw new Error('Only pending requests can be declined.');
  if (booking.razorpay_payment_id && booking.payment_status === 'captured_in_escrow') {
    await callRefundEdge(booking.razorpay_payment_id, booking.total_amount);
  }
  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      payment_status:
        booking.payment_status === 'captured_in_escrow' ? 'refunded' : booking.payment_status,
    })
    .eq('id', booking.id);
  if (error) throw error;
  await supabase.from('host_payouts').update({ payout_status: 'failed' }).eq('booking_id', booking.id);
}

async function callRefundEdge(paymentId: string, amountInr: number) {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Payments not configured.');
  const res = await fetch(`${url}/functions/v1/razorpay-refund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key },
    body: JSON.stringify({ razorpay_payment_id: paymentId, amount_inr: amountInr > 0 ? amountInr : undefined }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'Refund failed.');
  return data;
}

export async function cancelBooking(booking: Booking): Promise<{ refundInr: number }> {
  const user = await getAuthUser();
  if (!user || user.id !== booking.traveler_id) throw new Error('Only the guest can cancel.');
  if (booking.status === 'cancelled') throw new Error('Already cancelled.');
  const { refundInr } = quoteCancellation(booking);

  if (refundInr > 0 && booking.razorpay_payment_id) {
    await callRefundEdge(booking.razorpay_payment_id, refundInr);
  }
  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      payment_status: refundInr > 0 ? 'refunded' : booking.payment_status,
    })
    .eq('id', booking.id);
  if (error) throw error;
  // Release escrow holds + free the dates.
  await supabase.from('host_payouts').update({ payout_status: 'failed' }).eq('booking_id', booking.id);
  return { refundInr };
}

export async function modifyBooking(
  booking: Booking,
  patch: { check_in: string; check_out: string; guests_count: number }
): Promise<{ deltaInr: number }> {
  const user = await getAuthUser();
  if (!user || user.id !== booking.traveler_id) throw new Error('Only the guest can modify.');
  if (booking.status !== 'pending' && booking.status !== 'confirmed') {
    throw new Error('This trip can no longer be modified.');
  }
  // Availability excluding this booking's own hold.
  const { bookedRanges, blockedDates } = await getPropertyAvailability(booking.property_id);
  const clash = bookedRanges.some((r) => {
    if (!r) return false;
    if (r.start === booking.check_in && r.end === booking.check_out) return false;
    return patch.check_in < r.end && r.start < patch.check_out;
  });
  const nights =
    Math.round(
      (new Date(patch.check_out).getTime() - new Date(patch.check_in).getTime()) / (24 * 60 * 60 * 1000)
    );
  if (!patch.check_in || !patch.check_out || nights < 1) throw new Error('Pick valid dates.');
  const { data: prop } = await supabase
    .from('properties')
    .select('min_nights, max_nights, max_guests')
    .eq('id', booking.property_id)
    .single();
  const minN = (prop as any)?.min_nights ?? 1;
  const maxN = (prop as any)?.max_nights ?? 30;
  const cap = (prop as any)?.max_guests ?? booking.property?.max_guests ?? 16;
  if (nights < minN) throw new Error(`This stay needs at least ${minN} night${minN === 1 ? '' : 's'}.`);
  if (nights > maxN) throw new Error(`This stay allows at most ${maxN} nights.`);
  if (clash) throw new Error('Those dates are already booked.');
  const blocked = blockedDates.some((d) => d >= patch.check_in && d < patch.check_out);
  if (blocked) throw new Error('The host blocked those dates.');
  if (patch.guests_count < 1) throw new Error('Add at least 1 guest.');
  if (patch.guests_count > cap) throw new Error(`This stay hosts up to ${cap} guests.`);

  const cleaningFee = booking.cleaning_fee ?? 0;
  const { subtotal, platformFee, gstAmount, total } = priceQuote(booking.nightly_rate, nights, cleaningFee);
  const deltaInr = total - booking.total_amount;

  const { error } = await supabase
    .from('bookings')
    .update({
      check_in: patch.check_in,
      check_out: patch.check_out,
      guests_count: patch.guests_count,
      total_nights: nights,
      subtotal,
      platform_fee: platformFee,
      gst_amount: gstAmount,
      total_amount: total,
    })
    .eq('id', booking.id);
  if (error) throw error;

  // Shrinking a captured trip auto-refunds the difference.
  if (
    deltaInr < 0 &&
    booking.razorpay_payment_id &&
    booking.payment_status === 'captured_in_escrow'
  ) {
    await callRefundEdge(booking.razorpay_payment_id, Math.abs(deltaInr));
  }
  return { deltaInr };
}

// --- Host availability blocks ---

export async function addPropertyBlock(propertyId: string, date: string, hostId: string) {
  const { data: prop } = await supabase.from('properties').select('host_id').eq('id', propertyId).single();
  if (!prop || (prop as any).host_id !== hostId) throw new Error('Only the owner can block dates.');
  const { error } = await supabase
    .from('property_blocks')
    .upsert({ property_id: propertyId, blocked_date: date, source: 'manual' }, { onConflict: 'property_id,blocked_date' });
  if (error) throw error;
}

export async function removePropertyBlock(propertyId: string, date: string) {
  const { error } = await supabase
    .from('property_blocks')
    .delete()
    .eq('property_id', propertyId)
    .eq('blocked_date', date);
  if (error) throw error;
}

// --- Payouts ---

export interface PayoutDetails {
  payout_method: 'bank' | 'upi';
  upi_vpa?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  pan_number?: string | null;
  gstin?: string | null;
}

const UPI_RE = /^[\w.\-]{2,}@[a-zA-Z]{2,}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export interface IfscDetails {
  bank: string;
  branch: string;
  address: string;
  city: string;
  state: string;
  district: string;
  ifsc: string;
  micr?: string;
  rtgs: boolean;
  neft: boolean;
  imps: boolean;
  upi: boolean;
}

/** Free RBI IFSC lookup via open-source registry (no auth/cost required) */
export async function lookupIfsc(ifsc: string): Promise<IfscDetails | null> {
  const clean = ifsc.trim().toUpperCase();
  if (!IFSC_RE.test(clean)) return null;
  try {
    const res = await fetch(`https://ifsc.razorpay.com/${clean}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      bank: data.BANK || '',
      branch: data.BRANCH || '',
      address: data.ADDRESS || '',
      city: data.CITY || '',
      state: data.STATE || '',
      district: data.DISTRICT || '',
      ifsc: clean,
      micr: data.MICR,
      rtgs: !!data.RTGS,
      neft: !!data.NEFT,
      imps: !!data.IMPS,
      upi: !!data.UPI,
    };
  } catch {
    return null;
  }
}

/** Validates + saves where Hilt sends this host's money (98% after the 2% cut) and tax identity. */
export async function updatePayoutDetails(details: PayoutDetails): Promise<void> {
  const user = await getAuthUser();
  if (!user) throw new Error('Sign in to manage payouts.');
  if (details.payout_method === 'upi') {
    if (!details.upi_vpa?.trim() || !UPI_RE.test(details.upi_vpa.trim())) {
      throw new Error('Enter a valid UPI ID (e.g. name@okhdfc).');
    }
  } else {
    const acct = details.bank_account_number?.replace(/\s+/g, '') || '';
    const ifsc = details.bank_ifsc?.trim().toUpperCase() || '';
    if (!/^\d{9,18}$/.test(acct)) throw new Error('Enter a valid bank account number.');
    if (!IFSC_RE.test(ifsc)) throw new Error('Enter a valid IFSC (e.g. HDFC0001234).');
    details = { ...details, bank_account_number: acct, bank_ifsc: ifsc };
  }

  const cleanPan = details.pan_number?.trim().toUpperCase() || null;
  if (cleanPan && !PAN_RE.test(cleanPan)) {
    throw new Error('Enter a valid 10-character PAN (e.g. ABCDE1234F).');
  }

  const cleanGstin = details.gstin?.trim().toUpperCase() || null;
  if (cleanGstin && !GSTIN_RE.test(cleanGstin)) {
    throw new Error('Enter a valid 15-character GSTIN (e.g. 07AAAAA0000A1Z5).');
  }

  const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
  const verifiedName = prof?.full_name || 'Verified Host';
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('profiles')
    .update({
      payout_method: details.payout_method,
      upi_vpa: details.payout_method === 'upi' ? details.upi_vpa!.trim() : null,
      bank_account_number: details.payout_method === 'bank' ? details.bank_account_number : null,
      bank_ifsc: details.payout_method === 'bank' ? details.bank_ifsc : null,
      pan_number: cleanPan,
      gstin: cleanGstin,
      is_payout_verified: true,
      payout_verified_name: verifiedName,
      payout_verified_at: now,
    })
    .eq('id', user.id);
  if (error) throw error;
}

/** Dispatches ₹1 penny-drop validation via RazorpayX backend function */
export async function verifyPayoutAccount(details: {
  payout_method: 'bank' | 'upi';
  bank_account_number?: string;
  bank_ifsc?: string;
  upi_vpa?: string;
  account_holder_name?: string;
}): Promise<{
  success: boolean;
  is_payout_verified: boolean;
  verified_name: string;
  status: string;
  verified_at: string;
}> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Please sign in to verify payout account.');
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/verify-payout-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(details),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || 'Payout account verification failed.');
  }
  return data;
}

/** Obtains or generates sequential GST tax invoice number (series HILT/<FY>/<seq>) */
export async function generateBookingInvoice(bookingId: string): Promise<string> {
  const { data, error } = await supabase.rpc('generate_invoice_number', {
    p_booking_id: bookingId,
  });
  if (error) throw error;
  return data as string;
}

// --- HillCover Claims ---

export async function submitHillCoverClaim(claim: {
  booking_id: string;
  side: 'guest' | 'host';
  category: 'road_closed' | 'stay_different' | 'damage' | 'safety' | 'other';
  description: string;
  evidence?: string[];
}): Promise<HillCoverClaim> {
  const user = await getAuthUser();
  if (!user) throw new Error('Please sign in to submit a claim.');

  const { data, error } = await supabase
    .from('hillcover_claims')
    .insert([
      {
        booking_id: claim.booking_id,
        raised_by: user.id,
        side: claim.side,
        category: claim.category,
        description: claim.description.trim(),
        evidence: claim.evidence || [],
        status: 'submitted',
      },
    ])
    .select('*')
    .single();

  if (error) throw error;
  return data as HillCoverClaim;
}

export async function getBookingClaims(bookingId: string): Promise<HillCoverClaim[]> {
  const { data, error } = await supabase
    .from('hillcover_claims')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data || []) as HillCoverClaim[];
}

export async function getUserClaims(): Promise<HillCoverClaim[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('hillcover_claims')
    .select('*, booking:bookings(*, property:properties(*))')
    .eq('raised_by', user.id)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data || []) as HillCoverClaim[];
}

export interface HostPayoutRow {
  id: string;
  booking_id: string;
  gross_amount: number;
  platform_fee: number;
  net_payout: number;
  payout_destination: string;
  payout_status: string;
  scheduled_payout_date: string;
  settled_at: string | null;
  created_at: string;
  booking?: { check_in: string; check_out: string; property?: { title: string } | null } | null;
}

/** Newest-first ledger of money Hilt owes / paid this host. */
export async function getHostPayouts(hostId: string): Promise<HostPayoutRow[]> {
  try {
    const { data, error } = await supabase
      .from('host_payouts')
      .select('*, booking:bookings(check_in, check_out, property:properties(title))')
      .eq('host_id', hostId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      console.error('Error fetching payouts:', error.message);
      return [];
    }
    return (data || []) as HostPayoutRow[];
  } catch (err) {
    console.error('Error fetching payouts:', err);
    return [];
  }
}

// --- KYC ---

export async function markIdentityVerified(maskedAadhaar?: string) {
  const user = await getAuthUser();
  if (!user) return;
  await supabase
    .from('profiles')
    .update({ is_identity_verified: true, id_masked_number: maskedAadhaar || null })
    .eq('id', user.id);
}

// --- Order polling (WebView checkout → webhook confirms) ---

export async function getBookingByOrderId(orderId: string): Promise<Booking | null> {
  const { data } = await supabase
    .from('bookings')
    .select('*, property:properties(*, host:profiles(*))')
    .eq('razorpay_order_id', orderId)
    .single();
  return (data as Booking) ?? null;
}

// --- Photo uploads ---

export async function uploadPropertyPhoto(userId: string, propertyId: string, localUri: string): Promise<string> {
  const ext = localUri.split('.').pop()?.split('?')[0] || 'jpg';
  const path = `${propertyId}/${Date.now()}.${ext}`;
  const res = await fetch(localUri);
  const blob = await res.blob();
  const { error } = await supabase.storage.from('property-images').upload(path, blob, {
    contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('property-images').getPublicUrl(path);
  return data.publicUrl;
}

// --- Safety review queue (flagged chat messages in the host's conversations) ---

export async function getFlaggedMessages(hostId: string) {
  const { data: convos } = await supabase.from('conversations').select('id').eq('host_id', hostId);
  const ids = (convos || []).map((c: any) => c.id);
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from('messages')
    .select('*, conversation:conversations!inner(id, property:properties(title))')
    .in('conversation_id', ids)
    .eq('flagged', true)
    .order('created_at', { ascending: false })
    .limit(50);
  return data || [];
}

export async function resolveFlaggedMessage(messageId: string, action: 'dismiss' | 'remove') {
  if (action === 'remove') {
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('messages').update({ flagged: false }).eq('id', messageId);
    if (error) throw error;
  }
}
