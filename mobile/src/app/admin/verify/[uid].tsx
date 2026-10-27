import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react-native';
import { useAdminVerify } from '@/hooks/mutations/doctorMutations';
import { globalShowToast as showToast } from '@/lib/NotificationContext';
const Toast = { show: (opts: any) => { showToast && showToast(opts.text1, opts.text2, opts.type || 'info'); } };
import { COLORS } from '@/constants/theme';

export default function AdminVerificationScreen() {
  const router = useRouter();
  const { uid, action = 'approve' } = useLocalSearchParams<{ uid: string; action?: string }>();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [reason, setReason] = useState('');

  const verifyMutation = useAdminVerify();

  const handleAction = async () => {
    if (action === 'reject' && !reason.trim()) {
      Toast.show({ type: 'error', text1: 'Please provide a reason for rejection.' });
      return;
    }

    setLoading(true);
    try {
      // No `token`: the API authorises from the Clerk session and checks
      // `users.role = 'admin'`. The emailed link is just a deep link now.
      await verifyMutation.mutateAsync({ uid, action, reason });
      setSuccess(true);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.message || 'Verification failed' });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={[styles.iconCircle, action === 'approve' ? styles.bgEmerald : styles.bgAmber]}>
            {action === 'approve' ? (
              <CheckCircle2 size={32} color="#059669" />
            ) : (
              <XCircle size={32} color="#d97706" />
            )}
          </View>
          <Text style={styles.title}>Profile {action === 'approve' ? 'Approved' : 'Rejected'}</Text>
          <Text style={styles.text}>The doctor has been notified and their profile status has been updated in the system.</Text>
          <Text style={styles.subtext}>You can safely go back or close this app.</Text>
          
          <TouchableOpacity style={[styles.btn, styles.bgSlate]} onPress={() => router.back()}>
            <Text style={styles.btnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={[styles.iconCircle, action === 'approve' ? styles.bgEmerald : styles.bgRed]}>
          {action === 'approve' ? (
            <CheckCircle2 size={32} color="#059669" />
          ) : (
            <AlertCircle size={32} color={COLORS.tertiary} />
          )}
        </View>
        
        <Text style={styles.title}>Confirm {action === 'approve' ? 'Approval' : 'Rejection'}</Text>
        <Text style={styles.text}>
          You are about to {action} the doctor profile for ID:{'\n'}
          <Text style={styles.uidText}>{uid}</Text>
        </Text>

        {action === 'reject' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Reason for Rejection</Text>
            <TextInput
              style={styles.input}
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Please upload a clearer image of your medical license."
              multiline
            />
          </View>
        )}

        <TouchableOpacity 
          style={[styles.btn, action === 'approve' ? styles.btnEmerald : styles.btnRed]} 
          onPress={handleAction} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Confirm {action === 'approve' ? 'Approval' : 'Rejection'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary, justifyContent: 'center', padding: 8 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 8, alignItems: 'center', },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  bgEmerald: { backgroundColor: '#d1fae5' },
  bgAmber: { backgroundColor: COLORS.tertiary },
  bgRed: { backgroundColor: COLORS.tertiary },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  text: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  subtext: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginBottom: 24 },
  uidText: { fontFamily: 'monospace', fontSize: 12, backgroundColor: COLORS.primary, color: '#475569', fontWeight: 'bold' },
  inputGroup: { width: '100%', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#334155', marginBottom: 8 },
  input: { width: '100%', height: 100, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 8, textAlignVertical: 'top', backgroundColor: '#fff' },
  btn: { width: '100%', padding: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnEmerald: { backgroundColor: '#059669' },
  btnRed: { backgroundColor: COLORS.tertiary },
  bgSlate: { backgroundColor: '#64748b' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
