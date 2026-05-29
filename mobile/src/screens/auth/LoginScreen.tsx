import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { ApiError } from '@/api/client';
import { authStart } from '@/api/auth';
import { colors, spacing, typography } from '@/theme';
import type { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

function normalizePhoneInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(-10);
}

export function LoginScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const phoneNorm = normalizePhoneInput(phone);
  const isValid = /^[6-9]\d{9}$/.test(phoneNorm);

  async function handleContinue() {
    if (!isValid) {
      setError('Enter a valid 10-digit Indian mobile number');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const r = await authStart(phoneNorm);
      if (!r.found) {
        navigation.navigate('NotRegistered', { adminContactPhone: null });
        return;
      }
      if (r.needsEmail) {
        navigation.navigate('EnterEmail', { phone: phoneNorm });
      } else {
        navigation.navigate('Otp', {
          phone: phoneNorm,
          maskedEmail: r.maskedEmail ?? null,
        });
      }
    } catch (e) {
      if (e instanceof ApiError && e.code === 'not_registered') {
        navigation.navigate('NotRegistered', {
          adminContactPhone: e.body.adminContactPhone ?? null,
        });
        return;
      }
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to{'\n'}Samaj Connect</Text>
        <Text style={styles.subtitle}>
          Enter your mobile number to continue. Only verified community members can access the app.
        </Text>
      </View>

      <View style={styles.form}>
        <TextField
          label="Mobile number"
          placeholder="9876543210"
          value={phone}
          onChangeText={(v) => {
            setPhone(v);
            setError(null);
          }}
          keyboardType="phone-pad"
          autoFocus
          maxLength={14}
          error={error}
          helper={!error ? 'Indian numbers only (10 digits)' : undefined}
        />
        <View style={styles.prefixRow}>
          <Text style={styles.prefix}>+91 {phoneNorm}</Text>
        </View>
        <Button
          label="Continue"
          onPress={handleContinue}
          loading={loading}
          disabled={!isValid}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.xxl, marginBottom: spacing.xxl, gap: spacing.md },
  title: { ...typography.display, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted },
  form: { gap: spacing.lg },
  prefixRow: { alignItems: 'flex-end' },
  prefix: { ...typography.caption, color: colors.textMuted },
});
