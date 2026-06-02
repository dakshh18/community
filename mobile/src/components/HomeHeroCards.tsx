/**
 * Two side-by-side feature cards anchored at the top of the Home screen.
 * Distinct solid colors so they read as two separate signals at a glance:
 *
 *   ┌──────────────┐  ┌──────────────┐
 *   │  SAFFRON     │  │  DEEP GREEN  │
 *   │  community   │  │  event       │
 *   └──────────────┘  └──────────────┘
 *
 * The cards are intentionally equal height with internal sections (icon
 * row, big value, footer) so they visually anchor the page.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadow, spacing, typography } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// ---------- Shared card shell ----------

interface HeroProps {
  bg: string;
  fg: string;
  icon: IconName;
  primary: string;
  label: string;
  footerLeft?: string;
  footerRight?: string;
  onPress: () => void;
}

function HeroCard({
  bg, fg, icon, primary, label, footerLeft, footerRight, onPress,
}: HeroProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: bg }, pressed && styles.pressed]}
    >
      {/* subtle decorative arc — adds depth without busy patterns */}
      <View style={[styles.decoTopRight, { backgroundColor: `${fg}14` }]} />
      <View style={[styles.decoBottom, { backgroundColor: `${fg}0A` }]} />

      <View style={[styles.iconBubble, { backgroundColor: `${fg}26` }]}>
        <Ionicons name={icon} size={20} color={fg} />
      </View>

      <View style={styles.bodyBlock}>
        <Text style={[styles.primary, { color: fg }]} numberOfLines={2}>
          {primary}
        </Text>
        <Text style={[styles.label, { color: `${fg}D9` }]} numberOfLines={2}>
          {label}
        </Text>
      </View>

      {footerLeft || footerRight ? (
        <>
          <View style={[styles.divider, { backgroundColor: `${fg}33` }]} />
          <View style={styles.footerRow}>
            {footerLeft ? (
              <Text style={[styles.footer, { color: `${fg}D9` }]} numberOfLines={1}>
                {footerLeft}
              </Text>
            ) : (
              <Text> </Text>
            )}
            {footerRight ? (
              <Text style={[styles.footer, { color: `${fg}D9` }]} numberOfLines={1}>
                {footerRight}
              </Text>
            ) : null}
          </View>
        </>
      ) : null}
    </Pressable>
  );
}

// ---------- Community ----------

export function CommunityHeroCard({
  totalMembers,
  villagesCount,
  onPress,
}: {
  totalMembers: number | undefined;
  villagesCount: number | undefined;
  onPress: () => void;
}) {
  const value = typeof totalMembers === 'number' ? totalMembers.toLocaleString() : '—';
  return (
    <HeroCard
      bg={colors.primary} // saffron
      fg={colors.textOnPrimary} // white
      icon="people"
      primary={value}
      label="Community members"
      footerLeft={villagesCount ? `${villagesCount} villages` : undefined}
      footerRight="View →"
      onPress={onPress}
    />
  );
}

// ---------- Upcoming event ----------

export function UpcomingEventHeroCard({
  event,
  onPress,
}: {
  event: { name: string; dateTime: string; contributionPerFamily: number } | null;
  onPress: () => void;
}) {
  // Deep green — matches the spec's accent color palette.
  const bg = colors.success;
  const fg = colors.textOnPrimary;

  if (!event) {
    return (
      <HeroCard
        bg={bg}
        fg={fg}
        icon="calendar-clear-outline"
        primary="No upcoming events"
        label="Check back soon"
        onPress={onPress}
      />
    );
  }

  const days = Math.ceil((new Date(event.dateTime).getTime() - Date.now()) / 86400000);
  const dayLabel =
    days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : days <= 60 ? `in ${days} days` : 'Coming up';

  return (
    <HeroCard
      bg={bg}
      fg={fg}
      icon="calendar"
      primary={event.name}
      label={dayLabel}
      footerLeft={`₹${event.contributionPerFamily.toLocaleString('en-IN')} / family`}
      footerRight="View →"
      onPress={onPress}
    />
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    minHeight: 180,
    overflow: 'hidden',
    ...shadow.card,
  },
  pressed: { opacity: 0.92 },

  // decorative shapes
  decoTopRight: {
    position: 'absolute',
    top: -28,
    right: -28,
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  decoBottom: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 120,
    height: 60,
    borderRadius: 60,
  },

  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },

  bodyBlock: { gap: spacing.xs, flex: 1 },
  primary: { ...typography.h2, fontWeight: '700' },
  label: { ...typography.bodySmall },

  divider: { height: 1, marginTop: spacing.md, marginBottom: spacing.sm, opacity: 0.5 },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footer: { ...typography.caption, fontWeight: '600' },
});
