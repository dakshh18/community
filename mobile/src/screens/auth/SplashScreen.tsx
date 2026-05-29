import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@/theme';

export function SplashScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <View style={styles.logoBubble}>
          <Text style={styles.logoEmoji}>🪷</Text>
        </View>
        <Text style={styles.title}>Samaj Connect</Text>
        <Text style={styles.tagline}>Stay connected. Help each other.</Text>
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  logoBubble: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  logoEmoji: { fontSize: 56 },
  title: { ...typography.display, color: colors.text, marginBottom: spacing.sm },
  tagline: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  loader: { marginTop: spacing.xxl },
});
