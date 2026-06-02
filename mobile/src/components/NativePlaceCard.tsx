import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadow, spacing, typography } from '@/theme';

interface Props {
  nativePlace: string;
  personsCount: number;
  householdsCount: number;
  rank?: number; // 1-based — only the top 3 get a medal
  onPress: (nativePlace: string) => void;
}

// Restrained palette — saffron + warm complements.
const PALETTE = ['#FF9933', '#2E7D32', '#1976D2', '#B47D5A', '#7E57C2', '#B26A00', '#F2705C'];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function rankMedal(rank: number): { fg: string; bg: string; label: string } | null {
  switch (rank) {
    case 1: return { fg: '#7C4A00', bg: '#FFF1B8', label: 'Largest' };
    case 2: return { fg: '#1F4E22', bg: '#D8EFD2', label: '2nd' };
    case 3: return { fg: '#5A2C00', bg: '#F6DDC9', label: '3rd' };
    default: return null;
  }
}

export const NativePlaceCard = memo(function NativePlaceCard({
  nativePlace,
  personsCount,
  householdsCount,
  rank,
  onPress,
}: Props) {
  const tint = PALETTE[hashCode(nativePlace) % PALETTE.length]!;
  const medal = rank ? rankMedal(rank) : null;

  return (
    <Pressable
      onPress={() => onPress(nativePlace)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {/* Tint stripe at top — each village a distinct visual identity */}
      <View style={[styles.stripe, { backgroundColor: tint }]} />

      <View style={styles.body}>
        <View style={styles.iconRow}>
          <View style={[styles.iconBubble, { backgroundColor: `${tint}1A` }]}>
            <Ionicons name="location" size={16} color={tint} />
          </View>
          {medal ? (
            <View style={[styles.medal, { backgroundColor: medal.bg }]}>
              <Text style={[styles.medalText, { color: medal.fg }]}>{medal.label}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.name} numberOfLines={2}>
          {nativePlace}
        </Text>

        <View style={styles.statsRow}>
          <Text style={styles.count}>{personsCount}</Text>
          <Text style={styles.countUnit}>
            {personsCount === 1 ? 'member' : 'members'}
          </Text>
        </View>

        <Text style={styles.subStat}>
          {householdsCount} {householdsCount === 1 ? 'household' : 'households'}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  pressed: { opacity: 0.85 },

  stripe: { height: 4, width: '100%' },

  body: { padding: spacing.md, gap: spacing.xs, minHeight: 130 },

  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medal: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  medalText: { ...typography.caption, fontSize: 10, fontWeight: '700' },

  name: { ...typography.bodyMedium, color: colors.text, marginTop: spacing.xs },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: spacing.xs,
  },
  count: { ...typography.h3, color: colors.text },
  countUnit: { ...typography.bodySmall, color: colors.textMuted },

  subStat: { ...typography.caption, color: colors.textMuted },
});
