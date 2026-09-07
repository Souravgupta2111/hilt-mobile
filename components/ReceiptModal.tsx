import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Share,
  ActivityIndicator,
} from 'react-native';
import { X, Share2, FileText, CheckCircle2 } from 'lucide-react-native';
import { Colors } from '../constants/theme';
import type { Booking } from '../types/database';
import { generateBookingInvoice } from '../lib/supabase';

interface ReceiptModalProps {
  visible: boolean;
  booking: Booking | null;
  onClose: () => void;
}

export function ReceiptModal({ visible, booking, onClose }: ReceiptModalProps) {
  if (!booking) return null;

  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(booking.invoice_number || null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  useEffect(() => {
    if (booking.invoice_number) {
      setInvoiceNumber(booking.invoice_number);
    } else if (booking.id && visible) {
      setLoadingInvoice(true);
      generateBookingInvoice(booking.id)
        .then((num) => setInvoiceNumber(num))
        .catch((err) => console.log('Invoice generation note:', err.message))
        .finally(() => setLoadingInvoice(false));
    }
  }, [booking.id, booking.invoice_number, visible]);

  const gst = booking.gst_amount ?? 0;
  const halfGst = (gst / 2).toFixed(2);
  const lines: Array<[string, number]> = [
    [`Stay (${booking.total_nights} night${booking.total_nights === 1 ? '' : 's'} @ ₹${booking.nightly_rate.toLocaleString('en-IN')})`, booking.nightly_rate * booking.total_nights],
  ];
  if ((booking.cleaning_fee ?? 0) > 0) lines.push(['Cleaning & prep fee', booking.cleaning_fee]);
  lines.push(['Hilt facilitation fee (2%)', booking.platform_fee]);
  if (gst > 0) lines.push(['GST on facilitation fee (18%)', gst]);

  const share = () => {
    Share.share({
      message: [
        `Hilt Tax Invoice & Trip Receipt`,
        `Invoice: ${invoiceNumber || 'HILT-RECEIPT'}`,
        `SAC Code: 998552 (Hotel Booking / Facilitation Service)`,
        `${booking.property?.title || 'Mountain Stay'}`,
        `${booking.check_in} → ${booking.check_out} · ${booking.guests_count} guest(s)`,
        ...lines.map(([label, amount]) => `${label}: ₹${amount.toLocaleString('en-IN')}`),
        `Total Paid: ₹${booking.total_amount.toLocaleString('en-IN')}`,
        booking.razorpay_payment_id ? `Payment ID: ${booking.razorpay_payment_id}` : '',
        `Issued by: Hilt Technologies Pvt Ltd`,
      ]
        .filter(Boolean)
        .join('\n'),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Tax Invoice & Receipt</Text>
            <Text style={styles.headerSub}>SAC 998552 · CGST Rules</Text>
          </View>
          <TouchableOpacity onPress={share} style={styles.closeBtn}>
            <Share2 size={18} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Invoice Banner */}
          <View style={styles.invoiceBadge}>
            <View style={styles.invoiceBadgeLeft}>
              <FileText size={16} color="#059669" />
              <Text style={styles.invoiceSeries}>
                {invoiceNumber ? `Invoice: ${invoiceNumber}` : loadingInvoice ? 'Assigning invoice series...' : 'Hilt Facilitation Receipt'}
              </Text>
            </View>
            {invoiceNumber ? (
              <View style={styles.verifiedTag}>
                <CheckCircle2 size={12} color="#059669" />
                <Text style={styles.verifiedText}>GST Tax Invoice</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.title}>{booking.property?.title || 'Stay'}</Text>
          <Text style={styles.sub}>
            {booking.check_in} → {booking.check_out} · {booking.guests_count} guest
            {booking.guests_count === 1 ? '' : 's'} · {booking.status.toUpperCase()}
          </Text>

          <View style={styles.card}>
            {lines.map(([label, amount]) => (
              <View key={label} style={styles.row}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>₹{amount.toLocaleString('en-IN')}</Text>
              </View>
            ))}

            {gst > 0 ? (
              <View style={styles.taxSplitBox}>
                <Text style={styles.taxSplitTitle}>Tax Breakdown (18% on Hilt Fee):</Text>
                <View style={styles.taxSplitRow}>
                  <Text style={styles.taxSplitLabel}>• CGST (9%): ₹{halfGst}</Text>
                  <Text style={styles.taxSplitLabel}>• SGST (9%): ₹{halfGst}</Text>
                </View>
                <Text style={styles.taxSplitSub}>SAC 998552 — Travel accommodation facilitation</Text>
              </View>
            ) : null}

            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.totalLabel}>Total paid</Text>
              <Text style={styles.totalValue}>₹{booking.total_amount.toLocaleString('en-IN')}</Text>
            </View>
          </View>

          <View style={styles.metaContainer}>
            {invoiceNumber ? (
              <Text style={styles.meta}>Invoice No: {invoiceNumber}</Text>
            ) : null}
            {booking.razorpay_payment_id ? (
              <Text style={styles.meta}>Payment ID: {booking.razorpay_payment_id}</Text>
            ) : null}
            {booking.razorpay_order_id ? (
              <Text style={styles.meta}>Order ID: {booking.razorpay_order_id}</Text>
            ) : null}
          </View>

          <View style={styles.legalNoticeBox}>
            <Text style={styles.legalNoticeTitle}>GST Compliance & Supplier Note</Text>
            <Text style={styles.legalNoticeText}>
              • Supplier: Hilt Technologies Private Limited (Marketplace Facilitator)
            </Text>
            <Text style={styles.legalNoticeText}>
              • SAC Code: 998552 (Accommodation reservation services by travel agents)
            </Text>
            <Text style={styles.legalNoticeText}>
              • GST applies strictly to Hilt's 2% marketplace facilitation commission. The accommodation balance is disbursed to the independent host.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surfaceLight },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.pillInactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  headerSub: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, marginTop: 1 },
  content: { paddingHorizontal: 20, paddingVertical: 18, paddingBottom: 40 },
  invoiceBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  invoiceBadgeLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  invoiceSeries: { fontSize: 13, fontWeight: '700', color: '#065F46' },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedText: { fontSize: 11, fontWeight: '700', color: '#065F46' },
  title: { fontSize: 19, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  card: { backgroundColor: Colors.backgroundApp, borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 5 },
  label: { fontSize: 13, color: Colors.textSecondary, flex: 1, marginRight: 8 },
  value: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  taxSplitBox: {
    backgroundColor: Colors.pillInactive,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  taxSplitTitle: { fontSize: 11, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  taxSplitRow: { flexDirection: 'row', justifyContent: 'space-between' },
  taxSplitLabel: { fontSize: 11, color: Colors.textSecondary },
  taxSplitSub: { fontSize: 10, color: Colors.textMuted, marginTop: 4 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 10 },
  totalLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  totalValue: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  metaContainer: { marginTop: 14 },
  meta: { fontSize: 11, color: Colors.textMuted, marginTop: 3 },
  legalNoticeBox: {
    marginTop: 18,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
  },
  legalNoticeTitle: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  legalNoticeText: { fontSize: 11, color: Colors.textSecondary, lineHeight: 16, marginBottom: 3 },
  note: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18, marginTop: 14 },
});
