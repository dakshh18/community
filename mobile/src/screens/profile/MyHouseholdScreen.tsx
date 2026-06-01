import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { useMyHousehold } from '@/api/hooks';
import { ApiError } from '@/api/client';
import { colors, radius, shadow, spacing, typography } from '@/theme';
import type { ProfileStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'MyHousehold'>;

const RELATION_LABELS: Record<string, string> = {
  SELF: 'Self',
  SPOUSE: 'Spouse',
  SON: 'Son',
  DAUGHTER: 'Daughter',
  DAUGHTER_IN_LAW: 'Daughter-in-law',
  MOTHER: 'Mother',
  FATHER: 'Father',
  GRANDSON: 'Grandson',
  GRANDDAUGHTER: 'Granddaughter',
  OTHER: 'Member',
};

export function MyHouseholdScreen({ navigation }: Props) {
  const { data, isLoading, error, refetch, isRefetching } = useMyHousehold();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    const msg = error instanceof ApiError ? error.message : "Couldn't load your household";
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={36} color={colors.danger} />
          <Text style={styles.errorTitle}>{msg}</Text>
          <Pressable onPress={() => void refetch()} style={styles.retry}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const { household, members } = data;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Native place</Text>
          <Text style={styles.summaryValue}>{household.nativePlace}</Text>
          <Text style={styles.summaryLabel}>City</Text>
          <Text style={styles.summaryValue}>{household.city}</Text>
          {household.vadodaraAddress ? (
            <>
              <Text style={styles.summaryLabel}>Address</Text>
              <Text style={styles.summaryValue}>{household.vadodaraAddress}</Text>
            </>
          ) : null}
          {household.householdPhone ? (
            <>
              <Text style={styles.summaryLabel}>Household phone</Text>
              <Text style={styles.summaryValue}>+91 {household.householdPhone}</Text>
            </>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>
          Members ({members.length})
        </Text>

        <View style={styles.membersList}>
          {members.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => navigation.navigate('MemberDetail', { personId: m.id })}
              style={({ pressed }) => [styles.memberRow, pressed && styles.memberPressed]}
            >
              <Avatar name={m.fullName} size={44} />
              <View style={styles.memberBody}>
                <Text style={styles.memberName}>{m.fullName}</Text>
                <Text style={styles.memberMeta}>
                  {RELATION_LABELS[m.relation] ?? m.relation}
                  {m.profession ? ` · ${m.profession.name}` : ''}
                  {m.bloodGroup ? ` · ${m.bloodGroup}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: spacing.md, paddingTop: 60, paddingHorizontal: spacing.xl,
  },
  errorTitle: { ...typography.h3, color: colors.text, textAlign: 'center' },
  retry: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    backgroundColor: colors.primarySoft, borderRadius: radius.md, marginTop: spacing.md,
  },
  retryText: { ...typography.button, color: colors.primaryDark },

  summaryCard: {
    backgroundColor: colors.surface, padding: spacing.lg,
    borderRadius: radius.lg, gap: 4, ...shadow.card,
  },
  summaryLabel: {
    ...typography.caption, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.sm,
  },
  summaryValue: { ...typography.bodyMedium, color: colors.text },

  sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.sm },

  membersList: { gap: spacing.md },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberPressed: { opacity: 0.7 },
  memberBody: { flex: 1, gap: 2 },
  memberName: { ...typography.bodyMedium, color: colors.text },
  memberMeta: { ...typography.bodySmall, color: colors.textMuted },
});
