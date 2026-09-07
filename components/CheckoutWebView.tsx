import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { X } from 'lucide-react-native';
import { Colors } from '../constants/theme';
import { RAZORPAY_KEY_ID } from '../lib/razorpay';

interface CheckoutWebViewProps {
  visible: boolean;
  orderId: string;
  amountPaise: number;
  prefill?: { name?: string; email?: string; phone?: string };
  onPaid: (paymentId: string) => void;
  onFailed: (message: string) => void;
  onClose: () => void;
}

/**
 * Real Razorpay standard checkout inside a WebView (works in Expo Go).
 * Capture is confirmed server-side by the signature-verified webhook —
 * the app then polls the booking by order id.
 */
export function CheckoutWebView({
  visible,
  orderId,
  amountPaise,
  prefill,
  onPaid,
  onFailed,
  onClose,
}: CheckoutWebViewProps) {
  const [loading, setLoading] = useState(true);

  if (!visible) return null;

  const html = `
    <html><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
    <body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#555">
      <p>Loading secure checkout…</p>
      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      <script>
        var options = {
          key: ${JSON.stringify(RAZORPAY_KEY_ID)},
          order_id: ${JSON.stringify(orderId)},
          amount: ${amountPaise},
          currency: "INR",
          name: "Hilt Stays",
          description: "Mountain stay booking",
          prefill: {
            name: ${JSON.stringify(prefill?.name || '')},
            email: ${JSON.stringify(prefill?.email || '')},
            contact: ${JSON.stringify(prefill?.phone || '')}
          },
          theme: { color: "#111827" },
          handler: function (resp) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: "paid", paymentId: resp.razorpay_payment_id }));
          },
          modal: {
            ondismiss: function () {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: "dismissed" }));
            }
          }
        };
        try {
          var rzp = new Razorpay(options);
          rzp.on("payment.failed", function (resp) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: "failed", message: resp.error && resp.error.description || "Payment failed" }));
          });
          rzp.open();
        } catch (e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: "failed", message: "Checkout could not start" }));
        }
      </script>
    </body></html>
  `;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Secure payment</Text>
          <View style={{ width: 36 }} />
        </View>
        {loading && (
          <View style={styles.loading}>
            <ActivityIndicator color={Colors.primaryBlack} />
          </View>
        )}
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          onLoadEnd={() => setLoading(false)}
          onMessage={(e) => {
            try {
              const msg = JSON.parse(e.nativeEvent.data);
              if (msg.type === 'paid') onPaid(msg.paymentId);
              else if (msg.type === 'failed') onFailed(msg.message || 'Payment failed.');
              else if (msg.type === 'dismissed') onClose();
            } catch {
              onFailed('Payment response unreadable.');
            }
          }}
        />
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  loading: { padding: 16, alignItems: 'center' },
});
