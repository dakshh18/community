import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, spacing, typography } from '@/theme';
import type { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'NotRegistered'>;

export function NotRegisteredScreen({ navigation, route }: Props) {
  const { adminContactPhone } = route.params;

  function handleCallAdmin() {
    if (!adminContactPhone) return;
    void Linking.openURL(`tel:${adminContactPhone}`);
  }

  return (
    <ScreenContainer>
      <View style={styles.center}>
        <View style={styles.iconBubble}>
          <Ionicons name="information-circle-outline" size={48} color={colors.warning} />
        </View>
        <Text style={styles.title}>Your number isn't in community records</Text>
        <Text style={styles.body}>
          Only verified community members can access Samaj Connect. Please contact a committee
          member to be added.
        </Text>
        {adminContactPhone ? (
          <Text style={styles.contact}>Admin contact: {adminContactPhone}</Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        {adminContactPhone ? (
          <Button label="Call admin" onPress={handleCallAdmin} />
        ) : null}
        <Button label="Go back" variant="secondary" onPress={() => navigation.goBack()} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  iconBubble: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { ...typography.h2, color: colors.text, textAlign: 'center' },
  body: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  contact: { ...typography.bodyMedium, color: colors.text, marginTop: spacing.md },
  actions: { gap: spacing.md, paddingBottom: spacing.lg },
});
