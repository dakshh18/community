import React from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Avatar } from '@/components/Avatar';
import { InfoRow } from '@/components/InfoRow';
import { ScreenContainer } from '@/components/ScreenContainer';
import { usePerson } from '@/api/hooks';
import { ApiError } from '@/api/client';
import { colors, radius, shadow, spacing, typography } from '@/theme';
import type { DirectoryStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<DirectoryStackParamList, 'MemberDetail'>;

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

function fmtDob(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function MemberDetailScreen({ route }: Props) {
  const { personId } = route.params;
  const { data: p, isLoading, error, refetch } = usePerson(personId);

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (error || !p) {
    const msg = error instanceof ApiError ? error.message : 'Could not load this member';
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={36} color={colors.danger} />
          <Text style={styles.errorTitle}>{msg}</Text>
          <Pressable onPress={() => void refetch()} style={styles.retry}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const phoneVisible = !!p.phoneE164;
  const hasHiddenFields = !p.dob || !p.phone || !p.email;
  const nonOwnerHidden = !p.isOwner && !p.isHouseholdMember;

  function callPhone() {
    if (p?.phoneE164) void Linking.openURL(`tel:${p.phoneE164}`);
  }

  function whatsAppPhone() {
    if (!p?.phoneE164) return;
    const num = p.phoneE164.replace('+', '');
    void Linking.openURL(`whatsapp://send?phone=${num}`).catch(() =>
      Linking.openURL(`https://wa.me/${num}`),
    );
  }

  return (
    <ScreenContainer scroll>
      <View style={styles.heroCard}>
        <Avatar name={p.fullName} size={80} />
        <Text style={styles.name}>{p.fullName}</Text>
        <View style={styles.relationPill}>
          <Text style={styles.relationText}>{RELATION_LABELS[p.relation] ?? p.relation}</Text>
        </View>
        {p.profession ? (
          <Text style={styles.profession}>{p.profession.name}</Text>
        ) : p.professionRaw ? (
          <Text style={styles.profession}>{p.professionRaw}</Text>
        ) : null}
        <Text style={styles.nativePlace}>{p.nativePlace}</Text>
      </View>

      {phoneVisible ? (
        <View style={styles.actionRow}>
          <Pressable onPress={callPhone} style={[styles.actionBtn, styles.actionPrimary]}>
            <Ionicons name="call" size={18} color={colors.textOnPrimary} />
            <Text style={[styles.actionLabel, styles.actionLabelPrimary]}>Call</Text>
          </Pressable>
          <Pressable onPress={whatsAppPhone} style={[styles.actionBtn, styles.actionSecondary]}>
            <Ionicons name="logo-whatsapp" size={18} color={colors.success} />
            <Text style={[styles.actionLabel, styles.actionLabelSecondary]}>WhatsApp</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Contact</Text>
        <InfoRow label="Phone" value={p.phone ? `+91 ${p.phone}` : null} hidden={!p.phone} hiddenLabel="Hidden by member" />
        <InfoRow label="Email" value={p.email} hidden={!p.email} hiddenLabel="Visible to owner only" />
        <InfoRow label="Blood group" value={p.bloodGroup} hidden={!p.bloodGroup} hiddenLabel="Not provided" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personal</Text>
        <InfoRow label="Native place" value={p.nativePlace} />
        <InfoRow label="City" value={p.city} />
        <InfoRow
          label="Date of birth"
          value={p.dob ? fmtDob(p.dob) : null}
          hidden={!p.dob}
          hiddenLabel={nonOwnerHidden ? 'Visible to household only' : 'Not provided'}
        />
      </View>

      {hasHiddenFields && nonOwnerHidden ? (
        <View style={styles.privacyNote}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} />
          <Text style={styles.privacyText}>
            Some details are visible only to verified members of this household.
          </Text>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingTop: 60 },
  errorTitle: { ...typography.h3, color: colors.text, textAlign: 'center' },
  retry: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
  },
  retryText: { ...typography.button, color: colors.primaryDark },

  heroCard: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  name: { ...typography.h2, color: colors.text, textAlign: 'center', marginTop: spacing.sm },
  relationPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  relationText: { ...typography.caption, color: colors.primaryDark },
  profession: { ...typography.bodyMedium, color: colors.text },
  nativePlace: { ...typography.body, color: colors.textMuted },

  actionRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  actionPrimary: { backgroundColor: colors.primary },
  actionSecondary: { backgroundColor: colors.successSoft, borderWidth: 1, borderColor: colors.successSoft },
  actionLabel: { ...typography.button },
  actionLabelPrimary: { color: colors.textOnPrimary },
  actionLabelSecondary: { color: colors.success },

  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },

  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  privacyText: { ...typography.bodySmall, color: colors.textMuted, flexShrink: 1 },
});
