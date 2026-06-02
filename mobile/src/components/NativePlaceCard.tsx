import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadow, spacing, typography } from '@/theme';

interface Props {
  nativePlace: string;
  personsCount: number;
  householdsCount: number;
  onPress: (nativePlace: string) => void;
}

const PALETTE = ['#FF9933', '#2E7D32', '#1976D2', '#B47D5A', '#7E57C2', '#B26A00', '#F2705C'];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export const NativePlaceCard = memo(function NativePlaceCard({
  nativePlace,
  personsCount,
  householdsCount,
  onPress,
}: Props) {
  const tint = PALETTE[hashCode(nativePlace) % PALETTE.length]!;
  return (
    <Pressable
      onPress={() => onPress(nativePlace)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.iconBubble, { backgroundColor: `${tint}1A` }]}>
        <Ionicons name="location" size={20} color={tint} />
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {nativePlace}
      </Text>
      <View style={styles.statRow}>
        <Text style={styles.statValue}>{personsCount}</Text>
        <Text style={styles.statUnit}>{personsCount === 1 ? 'member' : 'members'}</Text>
      </View>
      <Text style={styles.subStat}>
        {householdsCount} {householdsCount === 1 ? 'household' : 'households'}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    width: 160,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadow.card,
  },
  pressed: { opacity: 0.85 },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  name: { ...typography.bodyMedium, color: colors.text },
  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  statValue: { ...typography.h2, color: colors.text },
  statUnit: { ...typography.bodySmall, color: colors.textMuted },
  subStat: { ...typography.caption, color: colors.textMuted },
});
