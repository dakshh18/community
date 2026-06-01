import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuthStore } from '@/auth/store';
import { useMyHousehold } from '@/api/hooks';
import { colors, radius, shadow, spacing, typography } from '@/theme';
import type { ProfileStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileMain'>;

interface RowProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  hint?: string;
  onPress: () => void;
}

function Row({ icon, label, hint, onPress }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={22} color={colors.primaryDark} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export function ProfileScreen({ navigation }: Props) {
  const viewer = useAuthStore((s) => s.viewer);
  const signOut = useAuthStore((s) => s.signOut);
  const my = useMyHousehold();

  const me = my.data?.members.find((m) => m.isOwner);
  const head = my.data?.household.head;

  return (
    <ScreenContainer scroll>
      <View style={styles.heroCard}>
        <Avatar name={me?.fullName ?? viewer?.phone ?? '?'} size={72} />
        <Text style={styles.name}>{me?.fullName ?? '—'}</Text>
        {viewer?.phone ? <Text style={styles.phone}>{viewer.phone}</Text> : null}
        <View style={styles.rolePill}>
          <Text style={styles.roleText}>{viewer?.role ?? 'MEMBER'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Row
          icon="people-outline"
          label="My household"
          hint={
            my.data
              ? `${my.data.members.length} member${my.data.members.length === 1 ? '' : 's'}${head ? ` · headed by ${head.fullName}` : ''}`
              : undefined
          }
          onPress={() => navigation.navigate('MyHousehold')}
        />
      </View>

      <View style={styles.signOutWrap}>
        <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  name: { ...typography.h2, color: colors.text, marginTop: spacing.sm },
  phone: { ...typography.body, color: colors.textMuted },
  rolePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  roleText: { ...typography.caption, color: colors.primaryDark },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  rowPressed: { backgroundColor: colors.surfaceMuted },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
  rowLabel: { ...typography.bodyMedium, color: colors.text },
  rowHint: { ...typography.bodySmall, color: colors.textMuted },

  signOutWrap: { marginTop: spacing.lg },
});
