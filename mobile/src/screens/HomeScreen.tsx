import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuthStore } from '@/auth/store';
import { colors, radius, spacing, typography } from '@/theme';

export function HomeScreen() {
  const viewer = useAuthStore((s) => s.viewer);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <ScreenContainer scroll>
      <Text style={styles.greeting}>Namaste 🙏</Text>
      <Text style={styles.role}>Signed in as {viewer?.role ?? 'MEMBER'}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>You're connected</Text>
        <Text style={styles.cardBody}>
          The directory, events, and help features will appear here as we build them. For now you
          can use the bottom tabs to navigate.
        </Text>
      </View>

      <View style={styles.metaCard}>
        <Text style={styles.metaLabel}>Phone</Text>
        <Text style={styles.metaValue}>{viewer?.phone ?? '—'}</Text>
        <Text style={styles.metaLabel}>Email</Text>
        <Text style={styles.metaValue}>{viewer?.email ?? '—'}</Text>
        <Text style={styles.metaLabel}>Person ID</Text>
        <Text style={styles.metaValueMono}>{viewer?.personId ?? '—'}</Text>
        <Text style={styles.metaLabel}>Household ID</Text>
        <Text style={styles.metaValueMono}>{viewer?.householdId ?? '—'}</Text>
      </View>

      <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  greeting: { ...typography.display, color: colors.text, marginTop: spacing.sm },
  role: { ...typography.bodyMedium, color: colors.textMuted, marginBottom: spacing.xl },
  card: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  cardTitle: { ...typography.h3, color: colors.primaryDark },
  cardBody: { ...typography.body, color: colors.text },
  metaCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  metaLabel: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  metaValue: { ...typography.bodyMedium, color: colors.text },
  metaValueMono: { ...typography.bodySmall, color: colors.text, fontFamily: 'Courier' },
});
