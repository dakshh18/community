/**
 * Initials avatar. Picks a deterministic color from a small palette based on
 * the name hash so the same person gets the same color every render.
 */
import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, typography } from '@/theme';

const PALETTE = ['#FF9933', '#F2705C', '#B47D5A', '#2E7D32', '#7E57C2', '#1976D2', '#B26A00'];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

interface Props {
  name: string;
  size?: number;
  style?: ViewStyle;
}

export function Avatar({ name, size = 48, style }: Props) {
  const bg = PALETTE[hashCode(name) % PALETTE.length]!;
  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        style,
      ]}
    >
      <Text style={[styles.label, { fontSize: size * 0.4 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  label: { ...typography.bodyMedium, color: colors.textOnPrimary },
});
