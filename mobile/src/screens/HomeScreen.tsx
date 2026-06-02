import React, { useMemo } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  useAdminStats,
  useCommitteeStats,
  useMyHousehold,
  useMyPayment,
  useNativePlaces,
  useProfessions,
  useUpcomingEvent,
} from '@/api/hooks';
import { NativePlaceCard } from '@/components/NativePlaceCard';
import { useAuthStore } from '@/auth/store';
import { colors, radius, shadow, spacing, typography } from '@/theme';
import type { RootTabParamList } from '@/navigation/types';

// ---------- Helpers ----------

function firstName(fullName: string | undefined | null): string | null {
  if (!fullName) return null;
  const parts = fullName.trim().split(/\s+/);
  return parts[0] ?? null;
}

function fmtINR(n: number): string {
  if (typeof n !== 'number' || !isFinite(n)) return '₹—';
  return `₹${n.toLocaleString('en-IN')}`;
}

function fmtEventDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function daysUntil(iso: string): number {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return Infinity;
  return Math.ceil((d - Date.now()) / (24 * 60 * 60 * 1000));
}

// ---------- Component ----------

export function HomeScreen() {
  const viewer = useAuthStore((s) => s.viewer);
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();

  const household = useMyHousehold();
  const professions = useProfessions();
  const nativePlaces = useNativePlaces();
  const upcoming = useUpcomingEvent();
  const adminStats = useAdminStats();
  const committeeStats = useCommitteeStats();
  const myPayment = useMyPayment(upcoming.data?.id);

  const me = household.data?.members.find((m) => m.isOwner);
  const greetingName = firstName(me?.fullName) ?? 'there';
  const isAdmin = viewer?.role === 'ADMIN';
  const isCommittee = viewer?.role === 'COMMITTEE';
  const isPrivileged = isAdmin || isCommittee;

  const refreshing =
    household.isRefetching ||
    professions.isRefetching ||
    upcoming.isRefetching ||
    adminStats.isRefetching ||
    committeeStats.isRefetching;

  function refreshAll() {
    void household.refetch();
    void professions.refetch();
    void nativePlaces.refetch();
    void upcoming.refetch();
    if (myPayment.refetch) void myPayment.refetch();
    if (isAdmin) void adminStats.refetch();
    if (isPrivileged) void committeeStats.refetch();
  }

  // Privileged stats — admin wins, else committee.
  const privilegedStats = isAdmin ? adminStats.data : committeeStats.data;

  const totalMembers = professions.data?.totalPersons;
  const totalCorrections = isAdmin
    ? adminStats.data?.queues.pendingCorrections
    : committeeStats.data?.queues.pendingCorrections;
  const totalHelpPending = isAdmin ? adminStats.data?.queues.pendingHelpRequests : null;

  // Payment due — only show if there's an upcoming event and member hasn't fully paid.
  const showPaymentCard =
    !!upcoming.data &&
    !!myPayment.data &&
    myPayment.data.amountPaid < myPayment.data.amountDue;

  // Directory is a nested stack — pass the initial screen explicitly so TS is happy.
  const goToDirectory = () =>
    navigation.navigate('Directory', { screen: 'DirectoryList' });
  const goToNativePlace = (nativePlace: string) =>
    navigation.navigate('Directory', {
      screen: 'DirectoryList',
      params: { nativePlace },
    });
  const goToEvents = () => navigation.navigate('Events');
  const goToHelp = () => navigation.navigate('Help');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshAll}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Greeting */}
        <View style={styles.greetingBlock}>
          <Text style={styles.greetingHello}>Namaste 🙏</Text>
          <Text style={styles.greetingName}>{greetingName}</Text>
          {isPrivileged ? (
            <View style={styles.rolePill}>
              <Ionicons name="shield-checkmark-outline" size={12} color={colors.primaryDark} />
              <Text style={styles.rolePillText}>{viewer?.role}</Text>
            </View>
          ) : null}
        </View>

        {/* Search bar — tappable, opens Directory */}
        <Pressable
          onPress={goToDirectory}
          style={({ pressed }) => [styles.searchBar, pressed && styles.searchBarPressed]}
        >
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <Text style={styles.searchPlaceholder}>
            Search doctor, teacher, business…
          </Text>
        </Pressable>

        {/* Native places */}
        {nativePlaces.data && nativePlaces.data.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Native places</Text>
              <Text style={styles.sectionMeta}>
                {nativePlaces.data.length} villages
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.nativeRow}
            >
              {nativePlaces.data.map((np) => (
                <NativePlaceCard
                  key={np.nativePlace}
                  nativePlace={np.nativePlace}
                  personsCount={np.personsCount}
                  householdsCount={np.householdsCount}
                  onPress={goToNativePlace}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Admin / committee dashboard strip */}
        {isPrivileged && privilegedStats ? (
          <View style={styles.adminGrid}>
            {typeof totalCorrections === 'number' ? (
              <StatCard
                icon="document-text-outline"
                value={totalCorrections.toLocaleString()}
                label="Pending corrections"
                tone="warning"
              />
            ) : null}
            {isAdmin && typeof totalHelpPending === 'number' ? (
              <StatCard
                icon="hand-right-outline"
                value={totalHelpPending.toLocaleString()}
                label="Help requests"
                tone="info"
              />
            ) : null}
            <StatCard
              icon="cash-outline"
              value={fmtINR(privilegedStats.payments.collected)}
              label="Collected"
              tone="success"
            />
            <StatCard
              icon="alert-circle-outline"
              value={fmtINR(privilegedStats.payments.outstanding)}
              label="Outstanding"
              tone="danger"
            />
          </View>
        ) : null}

        {/* Member quick stats */}
        {!isPrivileged ? (
          <View style={styles.memberGrid}>
            <StatCard
              icon="people-outline"
              value={
                typeof totalMembers === 'number' ? totalMembers.toLocaleString() : '—'
              }
              label="Community members"
              tone="primary"
            />
            <StatCard
              icon="calendar-outline"
              value={upcoming.data ? '1' : '0'}
              label="Upcoming events"
              tone="info"
            />
          </View>
        ) : null}

        {/* Upcoming event card */}
        {upcoming.data ? (
          <UpcomingEventCard
            event={upcoming.data}
            payment={myPayment.data ?? null}
            onPress={goToEvents}
          />
        ) : (
          <EmptyEventCard />
        )}

        {/* Payment due reminder (member view, only when unpaid) */}
        {showPaymentCard && myPayment.data && upcoming.data ? (
          <PaymentDueCard
            amountDue={myPayment.data.amountDue}
            amountPaid={myPayment.data.amountPaid}
            status={myPayment.data.status}
            eventName={upcoming.data.name}
            onPress={goToEvents}
          />
        ) : null}

        {/* Find help shortcut */}
        <HelpShortcutCard onPress={goToHelp} />

        <View style={styles.footerSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Sub-components ----------

interface StatCardProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  label: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

function StatCard({ icon, value, label, tone }: StatCardProps) {
  const toneColor = (() => {
    switch (tone) {
      case 'primary':
        return { bg: colors.primarySoft, fg: colors.primaryDark };
      case 'success':
        return { bg: colors.successSoft, fg: colors.success };
      case 'warning':
        return { bg: colors.warningSoft, fg: colors.warning };
      case 'danger':
        return { bg: colors.dangerSoft, fg: colors.danger };
      case 'info':
      default:
        return { bg: '#E3F2FD', fg: colors.info };
    }
  })();
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: toneColor.bg }]}>
        <Ionicons name={icon} size={20} color={toneColor.fg} />
      </View>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function UpcomingEventCard({
  event,
  payment,
  onPress,
}: {
  event: { id: string; name: string; dateTime: string; venue: string | null; contributionPerFamily: number; registrationsCount: number };
  payment: { status: 'PENDING' | 'PARTIAL' | 'PAID'; amountDue: number; amountPaid: number } | null;
  onPress: () => void;
}) {
  const days = daysUntil(event.dateTime);
  const dayLabel =
    days <= 0
      ? 'Today'
      : days === 1
        ? 'Tomorrow'
        : days <= 60
          ? `in ${days} days`
          : `on ${fmtEventDate(event.dateTime)}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.eventCard, pressed && styles.cardPressed]}
    >
      <View style={styles.eventBadge}>
        <Ionicons name="calendar" size={14} color={colors.primaryDark} />
        <Text style={styles.eventBadgeText}>Upcoming</Text>
      </View>
      <Text style={styles.eventTitle}>{event.name}</Text>
      <Text style={styles.eventDate}>{dayLabel} · {fmtEventDate(event.dateTime)}</Text>
      {event.venue ? (
        <View style={styles.eventMeta}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <Text style={styles.eventMetaText}>{event.venue}</Text>
        </View>
      ) : null}
      <View style={styles.eventDivider} />
      <View style={styles.eventFooter}>
        <View>
          <Text style={styles.eventLabel}>Contribution / family</Text>
          <Text style={styles.eventStrong}>{fmtINR(event.contributionPerFamily)}</Text>
        </View>
        <View style={styles.eventCta}>
          <Text style={styles.eventCtaText}>
            {payment?.status === 'PAID' ? 'View status' : 'Register →'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function EmptyEventCard() {
  return (
    <View style={styles.emptyEventCard}>
      <Ionicons name="calendar-clear-outline" size={28} color={colors.textMuted} />
      <Text style={styles.emptyEventTitle}>No upcoming events</Text>
      <Text style={styles.emptyEventBody}>
        We'll show the next Snehmilan here as soon as it's announced.
      </Text>
    </View>
  );
}

function PaymentDueCard({
  amountDue,
  amountPaid,
  status,
  eventName,
  onPress,
}: {
  amountDue: number;
  amountPaid: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID';
  eventName: string;
  onPress: () => void;
}) {
  const remaining = Math.max(0, amountDue - amountPaid);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.paymentCard, pressed && styles.cardPressed]}
    >
      <View style={[styles.paymentIcon, { backgroundColor: colors.warningSoft }]}>
        <Ionicons name="wallet-outline" size={22} color={colors.warning} />
      </View>
      <View style={styles.paymentBody}>
        <Text style={styles.paymentLabel}>Payment {status === 'PARTIAL' ? 'partial' : 'due'}</Text>
        <Text style={styles.paymentAmount}>{fmtINR(remaining)}</Text>
        <Text style={styles.paymentMeta}>
          for {eventName}{status === 'PARTIAL' ? ` · ${fmtINR(amountPaid)} paid` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function HelpShortcutCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.helpCard, pressed && styles.cardPressed]}
    >
      <View style={[styles.helpIcon, { backgroundColor: colors.successSoft }]}>
        <Ionicons name="hand-right-outline" size={22} color={colors.success} />
      </View>
      <View style={styles.helpBody}>
        <Text style={styles.helpTitle}>Find help from community</Text>
        <View style={styles.helpTags}>
          {['Medical', 'Education', 'Job', 'Emergency'].map((t) => (
            <View key={t} style={styles.helpTag}>
              <Text style={styles.helpTagText}>{t}</Text>
            </View>
          ))}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  footerSpacer: { height: spacing.lg },

  // Greeting
  greetingBlock: { gap: spacing.xs, marginTop: spacing.sm },
  greetingHello: { ...typography.body, color: colors.textMuted },
  greetingName: { ...typography.display, color: colors.text },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    marginTop: spacing.xs,
  },
  rolePillText: { ...typography.caption, color: colors.primaryDark, fontWeight: '600' },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchBarPressed: { opacity: 0.7 },
  searchPlaceholder: { ...typography.body, color: colors.textMuted, flex: 1 },

  // Stat grid (member: 2-up, admin: 2-up wrap)
  memberGrid: { flexDirection: 'row', gap: spacing.md },
  adminGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statCard: {
    flexGrow: 1,
    flexBasis: '40%',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.xs,
    minWidth: 140,
    ...shadow.card,
  },
  statIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs,
  },
  statValue: { ...typography.h2, color: colors.text },
  statLabel: { ...typography.bodySmall, color: colors.textMuted },

  // Event card
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadow.card,
  },
  cardPressed: { opacity: 0.85 },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.sm,
  },
  eventBadgeText: { ...typography.caption, color: colors.primaryDark },
  eventTitle: { ...typography.h2, color: colors.text },
  eventDate: { ...typography.body, color: colors.textMuted },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  eventMetaText: { ...typography.bodySmall, color: colors.textMuted, flex: 1 },
  eventDivider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.md },
  eventFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eventLabel: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  eventStrong: { ...typography.h3, color: colors.text },
  eventCta: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  eventCtaText: { ...typography.button, color: colors.textOnPrimary },

  emptyEventCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyEventTitle: { ...typography.h3, color: colors.text, marginTop: spacing.sm },
  emptyEventBody: { ...typography.body, color: colors.textMuted, textAlign: 'center' },

  // Payment due
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  paymentIcon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  paymentBody: { flex: 1, gap: 2 },
  paymentLabel: { ...typography.caption, color: colors.warning, textTransform: 'uppercase', letterSpacing: 0.5 },
  paymentAmount: { ...typography.h2, color: colors.text },
  paymentMeta: { ...typography.bodySmall, color: colors.textMuted },

  // Help shortcut
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  helpIcon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  helpBody: { flex: 1, gap: spacing.sm },
  helpTitle: { ...typography.bodyMedium, color: colors.text },
  helpTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  helpTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
  },
  helpTagText: { ...typography.caption, color: colors.textMuted },

  // Native places section
  section: { gap: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionTitle: { ...typography.h3, color: colors.text },
  sectionMeta: { ...typography.caption, color: colors.textMuted },
  nativeRow: { gap: spacing.md, paddingRight: spacing.lg, paddingVertical: spacing.xs },
});
