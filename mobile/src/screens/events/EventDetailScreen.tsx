import React from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { Button } from '@/components/Button';
import { useCancelRegistration, useEvent, useRemovePerformance } from '@/api/hooks';
import { ApiError } from '@/api/client';
import type { Performance, PerformanceType } from '@/api/types';
import { colors, radius, shadow, spacing, typography } from '@/theme';
import type { EventsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<EventsStackParamList, 'EventDetail'>;

const PERFORMANCE_LABELS: Record<PerformanceType, string> = {
  DANCE: 'Dance',
  ACT: 'Act',
  SPEECH: 'Speech',
  SINGING: 'Singing',
  OTHER: 'Other',
};

const STATUS_TONE: Record<'PENDING' | 'PARTIAL' | 'PAID', { bg: string; fg: string; label: string }> = {
  PENDING: { bg: colors.dangerSoft, fg: colors.danger, label: 'Pending' },
  PARTIAL: { bg: colors.warningSoft, fg: colors.warning, label: 'Partial' },
  PAID: { bg: colors.successSoft, fg: colors.success, label: 'Paid' },
};

function fmtINR(n: number): string { return `₹${n.toLocaleString('en-IN')}`; }
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function EventDetailScreen({ navigation, route }: Props) {
  const { eventId } = route.params;
  const event = useEvent(eventId);
  const cancelMut = useCancelRegistration(eventId);
  const removePerfMut = useRemovePerformance(eventId);

  if (event.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (event.error || !event.data) {
    const msg = event.error instanceof ApiError ? event.error.message : "Couldn't load event";
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={36} color={colors.danger} />
          <Text style={styles.errorText}>{msg}</Text>
          <Pressable onPress={() => void event.refetch()} style={styles.retry}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const e = event.data;
  const reg = e.me.registration;
  const pay = e.me.payment;
  const isPast = new Date(e.dateTime).getTime() < Date.now();

  function handleRegister() {
    navigation.navigate('Register', { eventId });
  }
  function handleAddPerformance() {
    if (!reg) return;
    navigation.navigate('PerformanceForm', { registrationId: reg.id, eventId });
  }
  function handleViewPayment() {
    navigation.navigate('PaymentStatus', { eventId });
  }
  function confirmCancel() {
    Alert.alert(
      'Cancel registration?',
      'This will also remove any kids performances you added. The committee will be notified.',
      [
        { text: 'Keep registration', style: 'cancel' },
        {
          text: 'Cancel registration',
          style: 'destructive',
          onPress: () =>
            cancelMut.mutate(undefined, {
              onError: (err) =>
                Alert.alert(
                  'Could not cancel',
                  err instanceof ApiError ? err.message : 'Please try again',
                ),
            }),
        },
      ],
    );
  }
  function confirmRemovePerformance(perf: Performance) {
    Alert.alert(`Remove ${perf.childName}'s ${PERFORMANCE_LABELS[perf.type].toLowerCase()}?`, undefined, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          removePerfMut.mutate(perf.id, {
            onError: (err) =>
              Alert.alert(
                'Could not remove',
                err instanceof ApiError ? err.message : 'Please try again',
              ),
          }),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={event.isRefetching}
            onRefresh={() => void event.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Ionicons
              name={isPast ? 'time-outline' : 'calendar'}
              size={12}
              color={isPast ? colors.textMuted : colors.primaryDark}
            />
            <Text style={[styles.heroBadgeText, isPast && { color: colors.textMuted }]}>
              {isPast ? 'Past event' : 'Upcoming'}
            </Text>
          </View>
          <Text style={styles.heroTitle}>{e.name}</Text>
          <View style={styles.heroMeta}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text style={styles.heroMetaText}>{fmtDate(e.dateTime)}</Text>
          </View>
          {e.venue ? (
            <View style={styles.heroMeta}>
              <Ionicons name="location-outline" size={14} color={colors.textMuted} />
              <Text style={styles.heroMetaText}>{e.venue}</Text>
            </View>
          ) : null}
          {e.description ? <Text style={styles.description}>{e.description}</Text> : null}
        </View>

        {/* Quick stats */}
        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{e.registrationsCount}</Text>
            <Text style={styles.statLabel}>Families registered</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{fmtINR(e.contributionPerFamily)}</Text>
            <Text style={styles.statLabel}>Per family</Text>
          </View>
        </View>

        {/* My registration */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>My registration</Text>
          {reg ? (
            <View style={{ gap: spacing.md }}>
              <View style={styles.regSummary}>
                <View>
                  <Text style={styles.regAttendeesValue}>{reg.attendeesCount}</Text>
                  <Text style={styles.regAttendeesLabel}>attendees</Text>
                </View>
                <View style={styles.regOnBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={styles.regOnText}>Registered</Text>
                </View>
              </View>

              <View style={styles.perfBlock}>
                <Text style={styles.perfTitle}>
                  Kids performances ({reg.performances.length})
                </Text>
                {reg.performances.map((p) => (
                  <View key={p.id} style={styles.perfRow}>
                    <View style={styles.perfBody}>
                      <Text style={styles.perfChild}>{p.childName}</Text>
                      <Text style={styles.perfMeta}>
                        {PERFORMANCE_LABELS[p.type]}
                        {p.title ? ` · ${p.title}` : ''}
                        {p.durationMin ? ` · ${p.durationMin} min` : ''}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => confirmRemovePerformance(p)}
                      hitSlop={8}
                      disabled={removePerfMut.isPending}
                    >
                      <Ionicons name="close-circle-outline" size={20} color={colors.textMuted} />
                    </Pressable>
                  </View>
                ))}
                {!isPast ? (
                  <Pressable
                    onPress={handleAddPerformance}
                    style={({ pressed }) => [styles.addPerfBtn, pressed && styles.cardPressed]}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                    <Text style={styles.addPerfText}>Add kids performance</Text>
                  </Pressable>
                ) : null}
              </View>

              {!isPast ? (
                <Pressable onPress={confirmCancel} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
                  <Text style={styles.cancelLink}>Cancel registration</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View style={{ gap: spacing.md }}>
              <Text style={styles.noRegText}>
                You haven't registered your family for this event yet.
              </Text>
              <Button
                label={e.registrationOpen && !isPast ? 'Register family' : 'Registration closed'}
                onPress={handleRegister}
                disabled={!e.registrationOpen || isPast}
              />
            </View>
          )}
        </View>

        {/* My payment */}
        {pay ? (
          <Pressable
            onPress={handleViewPayment}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <View style={styles.payHeaderRow}>
              <Text style={styles.cardTitle}>Payment</Text>
              <View style={[styles.statusPill, { backgroundColor: STATUS_TONE[pay.status].bg }]}>
                <Text style={[styles.statusPillText, { color: STATUS_TONE[pay.status].fg }]}>
                  {STATUS_TONE[pay.status].label}
                </Text>
              </View>
            </View>
            <View style={styles.payRow}>
              <View>
                <Text style={styles.payLabel}>Amount due</Text>
                <Text style={styles.payValue}>{fmtINR(pay.amountDue)}</Text>
              </View>
              <View style={styles.payRowRight}>
                <Text style={styles.payLabel}>Paid so far</Text>
                <Text style={styles.payValue}>{fmtINR(pay.amountPaid)}</Text>
              </View>
            </View>
            <View style={styles.payCta}>
              <Text style={styles.payCtaText}>View details</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </View>
          </Pressable>
        ) : null}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  errorText: { ...typography.h3, color: colors.text, textAlign: 'center' },
  retry: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
  },
  retryText: { ...typography.button, color: colors.primaryDark },

  // Hero
  hero: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.xs,
    ...shadow.card,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.xs,
  },
  heroBadgeText: { ...typography.caption, color: colors.primaryDark },
  heroTitle: { ...typography.h1, color: colors.text },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  heroMetaText: { ...typography.body, color: colors.textMuted, flex: 1 },
  description: { ...typography.body, color: colors.text, marginTop: spacing.md },

  // Stat row
  statRow: { flexDirection: 'row', gap: spacing.md },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: 4,
    ...shadow.card,
  },
  statValue: { ...typography.h2, color: colors.text },
  statLabel: { ...typography.bodySmall, color: colors.textMuted },

  // Generic card
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.md,
    ...shadow.card,
  },
  cardPressed: { opacity: 0.85 },
  cardTitle: { ...typography.h3, color: colors.text },

  // Registration block
  regSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  regAttendeesValue: { ...typography.display, color: colors.text },
  regAttendeesLabel: { ...typography.bodySmall, color: colors.textMuted },
  regOnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
  },
  regOnText: { ...typography.caption, color: colors.success, fontWeight: '600' },

  perfBlock: { gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  perfTitle: { ...typography.bodyMedium, color: colors.text },
  perfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  perfBody: { flex: 1, gap: 2 },
  perfChild: { ...typography.bodyMedium, color: colors.text },
  perfMeta: { ...typography.bodySmall, color: colors.textMuted },
  addPerfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  addPerfText: { ...typography.bodyMedium, color: colors.primary },

  cancelLink: { ...typography.bodyMedium, color: colors.danger },

  noRegText: { ...typography.body, color: colors.textMuted },

  // Payment block
  payHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusPill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  statusPillText: { ...typography.caption, fontWeight: '600' },
  payRow: { flexDirection: 'row', justifyContent: 'space-between' },
  payRowRight: { alignItems: 'flex-end' },
  payLabel: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  payValue: { ...typography.h3, color: colors.text },
  payCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  payCtaText: { ...typography.bodyMedium, color: colors.primary },
});
