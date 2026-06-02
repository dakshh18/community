/**
 * Friendly "this section is coming soon" placeholder. Used for Help right now.
 *
 * Props let other tabs reuse it (e.g. Reports later) with their own copy.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, shadow, spacing, typography } from '@/theme';

interface Item {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
}

interface Props {
  title?: string;
  body?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  features?: Item[];
}

const DEFAULT_FEATURES: Item[] = [
  { icon: 'medkit-outline', label: 'Medical help' },
  { icon: 'school-outline', label: 'Education help' },
  { icon: 'briefcase-outline', label: 'Job & business' },
  { icon: 'water-outline', label: 'Blood donation' },
  { icon: 'shield-checkmark-outline', label: 'Legal & emergency' },
];

export function ComingSoonScreen({
  title = 'Help is on the way',
  body = 'Soon you’ll be able to ask the community for help and offer support to others — right from this tab.',
  icon = 'hand-right-outline',
  features = DEFAULT_FEATURES,
}: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <View style={styles.iconBubble}>
            <Ionicons name={icon} size={36} color={colors.primary} />
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Coming soon</Text>
          </View>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>

        <View style={styles.featureCard}>
          <Text style={styles.featureHeader}>What’s coming</Text>
          {features.map((f, i) => (
            <View
              key={f.label}
              style={[styles.featureRow, i < features.length - 1 && styles.featureRowDivider]}
            >
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={18} color={colors.primaryDark} />
              </View>
              <Text style={styles.featureLabel}>{f.label}</Text>
              <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            </View>
          ))}
        </View>

        <Text style={styles.footnote}>
          We’re building this with care for our community.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },

  iconWrap: { alignItems: 'center', gap: spacing.sm },
  iconBubble: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  badgeText: { ...typography.caption, color: colors.textOnPrimary, fontWeight: '700', letterSpacing: 0.5 },

  title: { ...typography.h1, color: colors.text, textAlign: 'center', marginTop: spacing.xl },
  body: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    maxWidth: 320,
  },

  featureCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xxl,
    ...shadow.card,
  },
  featureHeader: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  featureRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: { ...typography.bodyMedium, color: colors.text, flex: 1 },

  footnote: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 'auto',
    paddingBottom: spacing.xl,
  },
});
