import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { useAddPerformance } from '@/api/hooks';
import { ApiError } from '@/api/client';
import type { PerformanceType } from '@/api/types';
import { colors, radius, spacing, typography } from '@/theme';
import type { EventsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<EventsStackParamList, 'PerformanceForm'>;

interface TypeOption {
  key: PerformanceType;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}

const TYPE_OPTIONS: TypeOption[] = [
  { key: 'DANCE', label: 'Dance', icon: 'musical-notes-outline' },
  { key: 'ACT', label: 'Act', icon: 'people-outline' },
  { key: 'SPEECH', label: 'Speech', icon: 'mic-outline' },
  { key: 'SINGING', label: 'Singing', icon: 'mic-circle-outline' },
  { key: 'OTHER', label: 'Other', icon: 'sparkles-outline' },
];

export function PerformanceFormScreen({ navigation, route }: Props) {
  const { registrationId, eventId } = route.params;
  const addMut = useAddPerformance(registrationId, eventId);

  const [childName, setChildName] = useState('');
  const [type, setType] = useState<PerformanceType | null>(null);
  const [title, setTitle] = useState('');
  const [durationStr, setDurationStr] = useState('');
  const [notes, setNotes] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);

  function validate(): boolean {
    let ok = true;
    if (!childName.trim()) {
      setNameError("Child's name is required");
      ok = false;
    } else setNameError(null);
    if (!type) {
      setTypeError('Pick a performance type');
      ok = false;
    } else setTypeError(null);
    return ok;
  }

  function handleSubmit() {
    if (!validate() || !type) return;
    const durationMin = durationStr.trim() ? parseInt(durationStr, 10) : null;
    if (durationStr.trim() && (Number.isNaN(durationMin!) || durationMin! < 0)) {
      Alert.alert('Invalid duration', 'Enter a number of minutes or leave blank.');
      return;
    }
    addMut.mutate(
      {
        childName: childName.trim(),
        type,
        title: title.trim() || null,
        durationMin: durationMin ?? null,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => navigation.goBack(),
        onError: (err) =>
          Alert.alert(
            'Could not add performance',
            err instanceof ApiError ? err.message : 'Please try again',
          ),
      },
    );
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>Add kids performance</Text>
      <Text style={styles.subtitle}>
        Register your child to perform at the event. The committee uses this to plan the program.
      </Text>

      <View style={styles.form}>
        <TextField
          label="Child's full name"
          placeholder="e.g. Aarav Hiralkumar"
          value={childName}
          onChangeText={(v) => {
            setChildName(v);
            if (nameError) setNameError(null);
          }}
          autoCapitalize="words"
          autoFocus
          error={nameError}
        />

        <View>
          <Text style={styles.fieldLabel}>Performance type</Text>
          <View style={styles.typeRow}>
            {TYPE_OPTIONS.map((opt) => {
              const active = type === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    setType(opt.key);
                    if (typeError) setTypeError(null);
                  }}
                  style={({ pressed }) => [
                    styles.typeChip,
                    active && styles.typeChipActive,
                    pressed && styles.typeChipPressed,
                  ]}
                >
                  <Ionicons
                    name={opt.icon}
                    size={16}
                    color={active ? colors.textOnPrimary : colors.text}
                  />
                  <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {typeError ? <Text style={styles.fieldError}>{typeError}</Text> : null}
        </View>

        <TextField
          label="Title / topic (optional)"
          placeholder="e.g. Garba on Falguni Pathak's Maine Payal Hai Chhankai"
          value={title}
          onChangeText={setTitle}
          autoCapitalize="sentences"
        />

        <TextField
          label="Duration in minutes (optional)"
          placeholder="e.g. 4"
          value={durationStr}
          onChangeText={(v) => setDurationStr(v.replace(/[^\d]/g, '').slice(0, 3))}
          keyboardType="number-pad"
          maxLength={3}
        />

        <TextField
          label="Notes for the committee (optional)"
          placeholder="Music requirements, props, age group, etc."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          autoCapitalize="sentences"
        />

        <Button label="Add performance" onPress={handleSubmit} loading={addMut.isPending} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xl },
  form: { gap: spacing.lg },

  fieldLabel: { ...typography.bodyMedium, color: colors.text, marginBottom: spacing.sm },
  fieldError: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },

  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipPressed: { opacity: 0.8 },
  typeChipText: { ...typography.bodySmall, color: colors.text },
  typeChipTextActive: { color: colors.textOnPrimary },
});
