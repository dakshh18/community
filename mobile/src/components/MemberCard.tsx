import React, { memo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Avatar } from './Avatar';
import type { PersonView } from '@/api/types';
import { colors, radius, shadow, spacing, typography } from '@/theme';

interface Props {
  person: PersonView;
  onPress: (personId: string) => void;
}

function openCall(phoneE164: string | null) {
  if (!phoneE164) return;
  void Linking.openURL(`tel:${phoneE164}`);
}

function openWhatsapp(phoneE164: string | null) {
  if (!phoneE164) return;
  const stripped = phoneE164.replace('+', '');
  void Linking.openURL(`whatsapp://send?phone=${stripped}`).catch(() => {
    void Linking.openURL(`https://wa.me/${stripped}`);
  });
}

export const MemberCard = memo(function MemberCard({ person, onPress }: Props) {
  const subtitle = [person.profession?.name, person.nativePlace.trim()]
    .filter(Boolean)
    .join(' • ');
  const hasPhone = !!person.phoneE164;

  return (
    <Pressable
      onPress={() => onPress(person.id)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Avatar name={person.fullName} size={48} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {person.fullName}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {person.bloodGroup ? (
          <View style={styles.bloodBadge}>
            <Ionicons name="water-outline" size={12} color={colors.danger} />
            <Text style={styles.bloodText}>{person.bloodGroup}</Text>
          </View>
        ) : null}
      </View>

      {hasPhone ? (
        <View style={styles.actions}>
          <Pressable
            onPress={() => openCall(person.phoneE164)}
            hitSlop={10}
            style={[styles.iconBtn, { backgroundColor: colors.primarySoft }]}
          >
            <Ionicons name="call" size={18} color={colors.primaryDark} />
          </Pressable>
          <Pressable
            onPress={() => openWhatsapp(person.phoneE164)}
            hitSlop={10}
            style={[styles.iconBtn, { backgroundColor: colors.successSoft }]}
          >
            <Ionicons name="logo-whatsapp" size={18} color={colors.success} />
          </Pressable>
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  pressed: { opacity: 0.7 },
  body: { flex: 1, gap: 2 },
  name: { ...typography.bodyMedium, color: colors.text },
  subtitle: { ...typography.bodySmall, color: colors.textMuted },
  bloodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.dangerSoft,
  },
  bloodText: { ...typography.caption, color: colors.danger },
  actions: { flexDirection: 'row', gap: spacing.sm },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
