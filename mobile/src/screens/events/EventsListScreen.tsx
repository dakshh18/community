import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useEventsList } from '@/api/hooks';
import { ApiError } from '@/api/client';
import type { EventListItem } from '@/api/types';
import { colors, radius, shadow, spacing, typography } from '@/theme';
import type { EventsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<EventsStackParamList, 'EventsList'>;

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function daysFromNow(iso: string): number {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return Infinity;
  return Math.ceil((d - Date.now()) / (24 * 60 * 60 * 1000));
}

function fmtINR(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

export function EventsListScreen({ navigation }: Props) {
  // Fetch ALL events; split into upcoming vs past locally so we can show both
  // in one scroll without firing two requests.
  const all = useEventsList(false);

  const { upcoming, past } = useMemo(() => {
    const items = all.data ?? [];
    const now = Date.now();
    return {
      upcoming: items
        .filter((e) => new Date(e.dateTime).getTime() >= now)
        .sort((a, b) => +new Date(a.dateTime) - +new Date(b.dateTime)),
      past: items
        .filter((e) => new Date(e.dateTime).getTime() < now)
        .sort((a, b) => +new Date(b.dateTime) - +new Date(a.dateTime)),
    };
  }, [all.data]);

  function handleOpenEvent(eventId: string) {
    navigation.navigate('EventDetail', { eventId });
  }

  const sections = useMemo(
    () => [
      ...(upcoming.length
        ? [{ key: 'upcoming-header', kind: 'header' as const, label: 'Upcoming' }]
        : []),
      ...upcoming.map((e) => ({ key: e.id, kind: 'item' as const, event: e })),
      ...(past.length
        ? [{ key: 'past-header', kind: 'header' as const, label: 'Past events' }]
        : []),
      ...past.map((e) => ({ key: `past-${e.id}`, kind: 'item' as const, event: e })),
    ],
    [upcoming, past],
  );

  if (all.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (all.error) {
    const msg = all.error instanceof ApiError ? all.error.message : "Couldn't load events";
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={36} color={colors.danger} />
          <Text style={styles.errorTitle}>{msg}</Text>
          <Pressable onPress={() => void all.refetch()} style={styles.retry}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (sections.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Ionicons name="calendar-clear-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No events yet</Text>
          <Text style={styles.emptyBody}>
            The committee hasn't announced any events. Check back later.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={sections}
        keyExtractor={(s) => s.key}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        renderItem={({ item }) =>
          item.kind === 'header' ? (
            <Text style={styles.sectionLabel}>{item.label}</Text>
          ) : (
            <EventRow event={item.event} onPress={handleOpenEvent} />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={all.isRefetching}
            onRefresh={() => void all.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </SafeAreaView>
  );
}

function EventRow({
  event,
  onPress,
}: {
  event: EventListItem;
  onPress: (id: string) => void;
}) {
  const days = daysFromNow(event.dateTime);
  const isUpcoming = days >= 0;
  const dayLabel = !isUpcoming
    ? `${Math.abs(days)} days ago`
    : days === 0
      ? 'Today'
      : days === 1
        ? 'Tomorrow'
        : days <= 60
          ? `in ${days} days`
          : '';

  return (
    <Pressable
      onPress={() => onPress(event.id)}
      style={({ pressed }) => [styles.card, !isUpcoming && styles.cardPast, pressed && styles.cardPressed]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {event.name}
        </Text>
        {event.registrationOpen && isUpcoming ? (
          <View style={styles.openBadge}>
            <Text style={styles.openBadgeText}>Open</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
        <Text style={styles.metaText}>
          {fmtDate(event.dateTime)}
          {dayLabel ? ` · ${dayLabel}` : ''}
        </Text>
      </View>
      {event.venue ? (
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <Text style={styles.metaText} numberOfLines={1}>
            {event.venue}
          </Text>
        </View>
      ) : null}
      <View style={styles.cardFooter}>
        <Text style={styles.contribution}>{fmtINR(event.contributionPerFamily)} / family</Text>
        <View style={styles.regCount}>
          <Ionicons name="people-outline" size={12} color={colors.textMuted} />
          <Text style={styles.regCountText}>{event.registrationsCount} registered</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.lg, gap: spacing.md },
  gap: { height: spacing.md },

  sectionLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadow.card,
  },
  cardPast: { opacity: 0.7 },
  cardPressed: { opacity: 0.85 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  cardTitle: { ...typography.h3, color: colors.text, flex: 1 },
  openBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.successSoft,
    borderRadius: radius.pill,
  },
  openBadgeText: { ...typography.caption, color: colors.success, fontWeight: '600' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { ...typography.bodySmall, color: colors.textMuted, flex: 1 },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  contribution: { ...typography.bodyMedium, color: colors.text },
  regCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  regCountText: { ...typography.caption, color: colors.textMuted },

  // empty + error states
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: { ...typography.h2, color: colors.text, marginTop: spacing.md },
  emptyBody: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  errorTitle: { ...typography.h3, color: colors.text, textAlign: 'center' },
  retry: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  retryText: { ...typography.button, color: colors.primaryDark },
});
