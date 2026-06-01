import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

interface Props {
  label: string;
  value: string | null | undefined;
  trailing?: ReactNode;
  hidden?: boolean;
  hiddenLabel?: string;
}

export function InfoRow({ label, value, trailing, hidden, hiddenLabel = 'Hidden' }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueWrap}>
        <Text style={[styles.value, hidden && styles.hidden]} numberOfLines={2}>
          {value || (hidden ? hiddenLabel : '—')}
        </Text>
        {trailing}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: spacing.sm, gap: 4 },
  label: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  valueWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  value: { ...typography.bodyMedium, color: colors.text, flexShrink: 1 },
  hidden: { color: colors.textMuted, fontStyle: 'italic' },
});
