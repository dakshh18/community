/**
 * Home screen — the first thing every member sees.
 *
 * Layout (member view):
 *   1. Greeting hero: avatar + namaste + name + native place + role pill
 *   2. Search bar (tap → Directory)
 *   3. Two side-by-side hero cards (saffron Community + deep-green Event)
 *   4. Payment due banner (if any) — high-contrast so it's hard to miss
 *   5. Section divider with title + counts
 *   6. Native places as 2-column vertical grid (no horizontal scroll)
 *   7. Help shortcut card
 *
 * Admin / committee view: the saffron Community card swaps for a deeper
 * saffron "Finance" card showing collected/outstanding, and an admin
 * queue row appears with pending corrections + help requests.
 */

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
import { useAuthStore } from '@/auth/store';
import { Avatar } from '@/components/Avatar';
import { CommunityHeroCard, UpcomingEventHeroCard } from '@/components/HomeHeroCards';
import { NativePlaceCard } from '@/components/NativePlaceCard';
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

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
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
  const myNativePlace = household.data?.household.nativePlace ?? null;
  const isAdmin = viewer?.role === 'ADMIN';
  const isCommittee = viewer?.role === 'COMMITTEE';
  const isPrivileged = isAdmin || isCommittee;
  const privilegedStats = isAdmin ? adminStats.data : committeeStats.data;

  const refreshing =
    household.isRefetching ||
    professions.isRefetching ||
    nativePlaces.isRefetching ||
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

  // ---- Navigation ----
  const goToDirectory = () =>
    navigation.navigate('Directory', { screen: 'DirectoryList' });
  const goToNativePlace = (nativePlace: string) =>
    navigation.navigate('Directory', {
      screen: 'DirectoryList',
      params: { nativePlace },
    });
  const goToEvents = () => navigation.navigate('Events', { screen: 'EventsList' });
  const goToEventDetail = (eventId: string) =>
    navigation.navigate('Events', { screen: 'EventDetail', params: { eventId } });
  const goToPaymentStatus = (eventId: string) =>
    navigation.navigate('Events', { screen: 'PaymentStatus', params: { eventId } });
  const goToHelp = () => navigation.navigate('Help');

  // ---- Derived ----
  const totalMembers = professions.data?.totalPersons;
  const villageCount = nativePlaces.data?.length;
  const showPaymentCard =
    !!upcoming.data &&
    !!myPayment.data &&
    myPayment.data.amountPaid < myPayment.data.amountDue;

  const nativeRows = useMemo(
    () => chunk(nativePlaces.data ?? [], 2),
    [nativePlaces.data],
  );

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
        {/* === 1. Greeting === */}
        <View style={styles.greetingRow}>
          <Avatar name={me?.fullName ?? greetingName} size={56} />
          <View style={styles.greetingText}>
            <Text style={styles.namaste}>Namaste 🙏</Text>
            <Text style={styles.name} numberOfLines={1}>
              {greetingName}
            </Text>
            <View style={styles.metaRow}>
              {myNativePlace ? (
                <View style={styles.metaPiece}>
                  <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {myNativePlace}
                  </Text>
                </View>
              ) : null}
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>{viewer?.role ?? 'MEMBER'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* === 2. Search bar === */}
        <Pressable
          onPress={goToDirectory}
          style={({ pressed }) => [styles.searchBar, pressed && styles.searchBarPressed]}
        >
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <Text style={styles.searchPlaceholder}>Search doctor, teacher, business…</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
        </Pressable>

        {/* === 3. Top featured cards (saffron + deep green) === */}
        <View style={styles.heroRow}>
          {isPrivileged && privilegedStats ? (
            <PrivilegedFinanceCard
              collected={privilegedStats.payments.collected}
              outstanding={privilegedStats.payments.outstanding}
              onPress={goToEvents}
            />
          ) : (
            <CommunityHeroCard
              totalMembers={totalMembers}
              villagesCount={villageCount}
              onPress={goToDirectory}
            />
          )}

          <UpcomingEventHeroCard
            event={
              upcoming.data
                ? {
                    name: upcoming.data.name,
                    dateTime: upcoming.data.dateTime,
                    contributionPerFamily: upcoming.data.contributionPerFamily,
                  }
                : null
            }
            onPress={() =>
              upcoming.data ? goToEventDetail(upcoming.data.id) : goToEvents()
            }
          />
        </View>

        {/* === 4. Payment due banner === */}
        {showPaymentCard && myPayment.data && upcoming.data ? (
          <PaymentDueBanner
            amountDue={myPayment.data.amountDue}
            amountPaid={myPayment.data.amountPaid}
            eventName={upcoming.data.name}
            onPress={() => goToPaymentStatus(upcoming.data!.id)}
          />
        ) : null}

        {/* === 5. Admin queue (privileged only) === */}
        {isPrivileged && privilegedStats ? (
          <AdminQueueRow
            pendingCorrections={privilegedStats.queues.pendingCorrections}
            pendingHelp={
              isAdmin && adminStats.data
                ? adminStats.data.queues.pendingHelpRequests
                : null
            }
          />
        ) : null}

        {/* === 6. Section divider — Native places === */}
        <View style={styles.sectionHeaderBlock}>
          <View style={styles.sectionAccent} />
          <View style={styles.sectionTitleWrap}>
            <Text style={styles.sectionTitle}>Native places</Text>
            <Text style={styles.sectionSubtitle}>
              {nativePlaces.data
                ? `${nativePlaces.data.length} villages · tap to filter the directory`
                : 'Loading villages…'}
            </Text>
          </View>
        </View>

        {/* === 7. Vertical 2-col grid === */}
        <View style={styles.grid}>
          {nativeRows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.gridRow}>
              {row.map((np, colIdx) => {
                const overallIdx = rowIdx * 2 + colIdx;
                return (
                  <NativePlaceCard
                    key={np.nativePlace}
                    nativePlace={np.nativePlace}
                    personsCount={np.personsCount}
                    householdsCount={np.householdsCount}
                    rank={overallIdx < 3 ? overallIdx + 1 : undefined}
                    onPress={goToNativePlace}
                  />
                );
              })}
              {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
            </View>
          ))}
        </View>

        {/* === 8. Help shortcut === */}
        <HelpShortcutCard onPress={goToHelp} />

        <View style={{ height: spacing.lg }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Sub-components ----------

function PrivilegedFinanceCard({
  collected,
  outstanding,
  onPress,
}: {
  collected: number;
  outstanding: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.privCard, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.privIconBubble}>
        <Ionicons name="cash" size={20} color={colors.textOnPrimary} />
      </View>
      <Text style={styles.privPrimary}>{fmtINR(collected)}</Text>
      <Text style={styles.privLabel}>Collected so far</Text>
      <View style={styles.privDivider} />
      <View style={styles.privFooterRow}>
        <Text style={styles.privFooter}>{fmtINR(outstanding)} due</Text>
        <Text style={styles.privFooter}>View →</Text>
      </View>
    </Pressable>
  );
}

function AdminQueueRow({
  pendingCorrections,
  pendingHelp,
}: {
  pendingCorrections: number;
  pendingHelp: number | null;
}) {
  return (
    <View style={styles.queueRow}>
      <View style={styles.queueCard}>
        <Ionicons name="document-text-outline" size={20} color={colors.warning} />
        <Text style={styles.queueValue}>{pendingCorrections}</Text>
        <Text style={styles.queueLabel}>Pending corrections</Text>
      </View>
      {pendingHelp !== null ? (
        <View style={styles.queueCard}>
          <Ionicons name="hand-right-outline" size={20} color={colors.info} />
          <Text style={styles.queueValue}>{pendingHelp}</Text>
          <Text style={styles.queueLabel}>Help requests</Text>
        </View>
      ) : null}
    </View>
  );
}

function PaymentDueBanner({
  amountDue,
  amountPaid,
  eventName,
  onPress,
}: {
  amountDue: number;
  amountPaid: number;
  eventName: string;
  onPress: () => void;
}) {
  const remaining = Math.max(0, amountDue - amountPaid);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.payBanner, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.payIconWrap}>
        <Ionicons name="wallet-outline" size={22} color={colors.warning} />
      </View>
      <View style={styles.payBody}>
        <Text style={styles.payLabel}>
          {amountPaid > 0 ? 'PARTIAL PAYMENT' : 'PAYMENT DUE'}
        </Text>
        <Text style={styles.payAmount}>{fmtINR(remaining)}</Text>
        <Text style={styles.payMeta}>for {eventName}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.warning} />
    </Pressable>
  );
}

function HelpShortcutCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.helpCard, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.helpIcon}>
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
  content: { padding: spacing.lg, gap: spacing.lg },

  // === 1. Greeting ===
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  greetingText: { flex: 1, gap: 2 },
  namaste: { ...typography.body, color: colors.textMuted },
  name: { ...typography.h1, color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  metaPiece: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '60%' },
  metaText: { ...typography.caption, color: colors.textMuted },
  rolePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  rolePillText: { ...typography.caption, color: colors.primaryDark, fontWeight: '700', fontSize: 10 },

  // === 2. Search ===
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

  // === 3. Hero row ===
  heroRow: { flexDirection: 'row', gap: spacing.md },

  privCard: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    borderRadius: radius.lg,
    padding: spacing.lg,
    minHeight: 180,
    ...shadow.card,
  },
  privIconBubble: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  privPrimary: { ...typography.h2, color: colors.textOnPrimary, fontWeight: '700' },
  privLabel: { ...typography.bodySmall, color: 'rgba(255,255,255,0.85)' },
  privDivider: { height: 1, marginTop: spacing.md, marginBottom: spacing.sm, backgroundColor: 'rgba(255,255,255,0.33)' },
  privFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  privFooter: { ...typography.caption, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },

  // === Admin queue ===
  queueRow: { flexDirection: 'row', gap: spacing.md },
  queueCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.xs,
    ...shadow.card,
  },
  queueValue: { ...typography.h2, color: colors.text },
  queueLabel: { ...typography.bodySmall, color: colors.textMuted },

  // === Payment due banner ===
  payBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  payIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  payBody: { flex: 1, gap: 2 },
  payLabel: { ...typography.caption, color: colors.warning, fontWeight: '700', letterSpacing: 0.5 },
  payAmount: { ...typography.h2, color: colors.text },
  payMeta: { ...typography.bodySmall, color: colors.textMuted },

  // === Section header ===
  sectionHeaderBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  sectionAccent: {
    width: 4,
    alignSelf: 'stretch',
    minHeight: 36,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  sectionTitleWrap: { flex: 1, gap: 2 },
  sectionTitle: { ...typography.h2, color: colors.text },
  sectionSubtitle: { ...typography.bodySmall, color: colors.textMuted },

  // === Native places grid ===
  grid: { gap: spacing.md },
  gridRow: { flexDirection: 'row', gap: spacing.md },

  // === Help shortcut ===
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginTop: spacing.md,
    ...shadow.card,
  },
  helpIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.successSoft,
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
});
