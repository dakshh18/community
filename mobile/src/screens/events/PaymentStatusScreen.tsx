import React from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InfoRow } from '@/components/InfoRow';
import { useEvent, useMyPayment } from '@/api/hooks';
import { ApiError } from '@/api/client';
import type { PaymentMode, PaymentStatus } from '@/api/types';
import { colors, radius, shadow, spacing, typography } from '@/theme';
import type { EventsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<EventsStackParamList, 'PaymentStatus'>;

const STATUS_TONE: Record<PaymentStatus, { bg: string; fg: string; label: string }> = {
  PENDING: { bg: colors.dangerSoft, fg: colors.danger, label: 'Pending' },
  PARTIAL: { bg: colors.warningSoft, fg: colors.warning, label: 'Partial' },
  PAID: { bg: colors.successSoft, fg: colors.success, label: 'Paid' },
};

const MODE_LABEL: Record<PaymentMode, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank transfer',
  OTHER: 'Other',
};

function fmtINR(n: number): string { return `₹${n.toLocaleString('en-IN')}`; }
function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function PaymentStatusScreen({ route }: Props) {
  const { eventId } = route.params;
  const event = useEvent(eventId);
  const payment = useMyPayment(eventId);

  if (payment.isLoading || event.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (payment.error) {
    const msg = payment.error instanceof ApiError ? payment.error.message : "Couldn't load payment";
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={36} color={colors.danger} />
          <Text style={styles.errorText}>{msg}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const p = payment.data;
  if (!p) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Ionicons name="cash-outline" size={48} color={colors.textMuted} />
          <Text style={styles.title}>No payment yet</Text>
          <Text style={styles.body}>
            You'll see your payment status here once you've registered your family.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const remaining = Math.max(0, p.amountDue - p.amountPaid);
  const tone = STATUS_TONE[p.status];

  function callCommittee() {
    // We don't have a published number per committee member — for MVP, prompt the user to
    // contact via the directory. Future: pull from /committee endpoint.
    // For now we leave this as an info card.
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={payment.isRefetching}
            onRefresh={() => void payment.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
            <Text style={[styles.statusPillText, { color: tone.fg }]}>{tone.label}</Text>
          </View>
          <Text style={styles.heroAmount}>{fmtINR(remaining)}</Text>
          <Text style={styles.heroLabel}>
            {p.status === 'PAID' ? 'Fully paid' : 'remaining'}
            {p.status !== 'PENDING' && p.amountPaid > 0 ? ` · ${fmtINR(p.amountPaid)} paid` : ''}
          </Text>
          {event.data ? (
            <Text style={styles.heroEventName}>for {event.data.name}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment details</Text>
          <InfoRow label="Amount due" value={fmtINR(p.amountDue)} />
          <InfoRow label="Amount paid" value={fmtINR(p.amountPaid)} />
          <InfoRow label="Payment mode" value={p.mode ? MODE_LABEL[p.mode] : null} hidden={!p.mode} hiddenLabel="Not recorded" />
          <InfoRow label="Reference" value={p.reference} hidden={!p.reference} hiddenLabel="—" />
          <InfoRow label="Paid on" value={fmtDate(p.paidAt)} hidden={!p.paidAt} hiddenLabel="Not paid yet" />
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={colors.info} />
          <Text style={styles.infoText}>
            Payments are verified and recorded by the committee. If your status looks wrong,
            please reach out to a committee member.
          </Text>
        </View>

        <Pressable
          onPress={callCommittee}
          style={({ pressed }) => [styles.contactCard, pressed && styles.cardPressed]}
        >
          <View style={styles.contactIcon}>
            <Ionicons name="call-outline" size={20} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.contactTitle}>Contact committee</Text>
            <Text style={styles.contactBody}>
              Find a committee member from the Directory tab.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  errorText: { ...typography.h3, color: colors.text, textAlign: 'center' },
  title: { ...typography.h2, color: colors.text, marginTop: spacing.md },
  body: { ...typography.body, color: colors.textMuted, textAlign: 'center' },

  heroCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radius.lg,
    alignItems: 'center',
    gap: spacing.xs,
    ...shadow.card,
  },
  statusPill: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill, marginBottom: spacing.sm },
  statusPillText: { ...typography.bodyMedium, fontWeight: '700' },
  heroAmount: { ...typography.display, color: colors.text },
  heroLabel: { ...typography.body, color: colors.textMuted },
  heroEventName: { ...typography.bodyMedium, color: colors.text, marginTop: spacing.sm },

  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  cardTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },

  infoCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: '#E3F2FD',
    borderRadius: radius.md,
    alignItems: 'flex-start',
  },
  infoText: { ...typography.bodySmall, color: colors.text, flex: 1 },

  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  cardPressed: { opacity: 0.85 },
  contactIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  contactTitle: { ...typography.bodyMedium, color: colors.text },
  contactBody: { ...typography.bodySmall, color: colors.textMuted },
});
