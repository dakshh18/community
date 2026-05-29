import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';

import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, spacing, typography } from '@/theme';

export function PlaceholderScreen() {
  const route = useRoute();
  return (
    <ScreenContainer>
      <View style={styles.center}>
        <Text style={styles.label}>Coming next</Text>
        <Text style={styles.title}>{route.name}</Text>
        <Text style={styles.body}>
          This tab will be wired up in the next milestone.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  label: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  title: { ...typography.h1, color: colors.text },
  body: { ...typography.body, color: colors.textMuted, textAlign: 'center', maxWidth: 280 },
});
