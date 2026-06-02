import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useEvent, useRegisterForEvent } from '@/api/hooks';
import { ApiError } from '@/api/client';
import { colors, radius, spacing, typography } from '@/theme';
import type { EventsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<EventsStackParamList, 'Register'>;

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtINR(n: number): string { return `₹${n.toLocaleString('en-IN')}`; }

const MIN = 0;
const MAX = 30;

export function RegisterScreen({ navigation, route }: Props) {
  const { eventId } = route.params;
  const event = useEvent(eventId);
  const register = useRegisterForEvent(eventId);

  const [count, setCount] = useState<number>(2);

  function step(delta: number) {
    setCount((c) => Math.min(MAX, Math.max(MIN, c + delta)));
  }

  function handleSubmit() {
    if (count < 0) return;
    register.mutate(
      { attendeesCount: count },
      {
        onSuccess: () => navigation.goBack(),
        onError: (err) =>
          Alert.alert(
            'Registration failed',
            err instanceof ApiError ? err.message : 'Please try again',
          ),
      },
    );
  }

  return (
    <ScreenContainer scroll>
      <View style={styles.eventCard}>
        <Text style={styles.eventLabel}>Registering for</Text>
        <Text style={styles.eventName}>{event.data?.name ?? '…'}</Text>
        {event.data ? (
          <Text style={styles.eventMeta}>
            {fmtDate(event.data.dateTime)} · {fmtINR(event.data.contributionPerFamily)} per family
          </Text>
        ) : null}
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>How many people from your family will attend?</Text>
        <Text style={styles.helper}>
          Count adults + children attending the event (yourself included).
        </Text>

        <View style={styles.stepper}>
          <Pressable
            onPress={() => step(-1)}
            disabled={count <= MIN}
            style={({ pressed }) => [
              styles.stepBtn,
              count <= MIN && styles.stepBtnDisabled,
              pressed && styles.stepBtnPressed,
            ]}
          >
            <Ionicons name="remove" size={24} color={count <= MIN ? colors.textMuted : colors.text} />
          </Pressable>
          <View style={styles.stepValueBox}>
            <Text style={styles.stepValue}>{count}</Text>
            <Text style={styles.stepValueLabel}>
              {count === 1 ? 'attendee' : 'attendees'}
            </Text>
          </View>
          <Pressable
            onPress={() => step(1)}
            disabled={count >= MAX}
            style={({ pressed }) => [
              styles.stepBtn,
              count >= MAX && styles.stepBtnDisabled,
              pressed && styles.stepBtnPressed,
            ]}
          >
            <Ionicons name="add" size={24} color={count >= MAX ? colors.textMuted : colors.text} />
          </Pressable>
        </View>

        <View style={styles.infoBlock}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <Text style={styles.infoText}>
            You can add kids performances after registering, from the event page.
          </Text>
        </View>

        <Button
          label={`Register · ${fmtINR(event.data?.contributionPerFamily ?? 0)}`}
          onPress={handleSubmit}
          loading={register.isPending}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  eventCard: {
    backgroundColor: colors.primarySoft,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  eventLabel: {
    ...typography.caption,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventName: { ...typography.h2, color: colors.text },
  eventMeta: { ...typography.body, color: colors.text },

  form: { gap: spacing.lg },
  label: { ...typography.bodyMedium, color: colors.text },
  helper: { ...typography.bodySmall, color: colors.textMuted, marginTop: -spacing.md },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  stepBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: { opacity: 0.4 },
  stepBtnPressed: { backgroundColor: colors.surfaceMuted },
  stepValueBox: { alignItems: 'center', flex: 1 },
  stepValue: { ...typography.display, color: colors.text },
  stepValueLabel: { ...typography.bodySmall, color: colors.textMuted },

  infoBlock: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
  },
  infoText: { ...typography.bodySmall, color: colors.textMuted, flex: 1 },
});
