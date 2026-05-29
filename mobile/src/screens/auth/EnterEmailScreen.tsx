import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { ApiError } from '@/api/client';
import { authSendOtp } from '@/api/auth';
import { colors, spacing, typography } from '@/theme';
import type { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'EnterEmail'>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EnterEmailScreen({ navigation, route }: Props) {
  const { phone } = route.params;
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const trimmed = email.trim().toLowerCase();
  const isValid = EMAIL_RE.test(trimmed);

  async function handleContinue() {
    if (!isValid) {
      setError('Please enter a valid email address');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const r = await authSendOtp(phone, trimmed);
      navigation.navigate('Otp', {
        phone,
        email: trimmed,
        maskedEmail: r.maskedEmail,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <Text style={styles.title}>What's your email?</Text>
        <Text style={styles.subtitle}>
          We'll email a 6-digit code to verify it's you. This is a one-time setup — next time we'll
          reuse this email.
        </Text>
      </View>

      <View style={styles.form}>
        <TextField
          label="Email address"
          placeholder="name@example.com"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setError(null);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          autoFocus
          error={error}
        />
        <Button
          label="Send code"
          onPress={handleContinue}
          loading={loading}
          disabled={!isValid}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.xl, marginBottom: spacing.xxl, gap: spacing.md },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted },
  form: { gap: spacing.lg },
});
