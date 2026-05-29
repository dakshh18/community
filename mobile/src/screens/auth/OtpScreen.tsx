import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { ApiError } from '@/api/client';
import { authSendOtp, authVerifyOtp } from '@/api/auth';
import { useAuthStore } from '@/auth/store';
import { colors, spacing, typography } from '@/theme';
import type { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Otp'>;

export function OtpScreen({ route }: Props) {
  const { phone, email, maskedEmail } = route.params;
  const signIn = useAuthStore((s) => s.signIn);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [autoSentOnce, setAutoSentOnce] = useState(false);

  useEffect(() => {
    if (autoSentOnce) return;
    if (email) {
      // Email was provided via EnterEmail — that flow already called send-otp.
      setAutoSentOnce(true);
      return;
    }
    // Came straight from Login (returning user) — fire send-otp now.
    setAutoSentOnce(true);
    void (async () => {
      try {
        await authSendOtp(phone);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Could not send code');
      }
    })();
  }, [autoSentOnce, email, phone]);

  const isValid = /^\d{6}$/.test(code);

  async function handleVerify() {
    if (!isValid) {
      setError('Enter the 6-digit code');
      return;
    }
    setError(null);
    setInfo(null);
    setVerifying(true);
    try {
      const r = await authVerifyOtp(phone, code);
      await signIn(r.token, {
        userId: r.user.id,
        role: r.user.role,
        phone: r.user.phone,
        email: r.user.email,
        personId: r.personId,
        householdId: r.householdId,
      });
      // RootNavigator will swap to AppTabs once token is set.
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    setError(null);
    setInfo(null);
    setResending(true);
    try {
      await authSendOtp(phone, email);
      setInfo('A new code is on its way');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not resend code');
    } finally {
      setResending(false);
    }
  }

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Enter the code</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to {maskedEmail ?? email ?? 'your email'}.
        </Text>
      </View>

      <View style={styles.form}>
        <TextField
          label="6-digit code"
          placeholder="123456"
          value={code}
          onChangeText={(v) => {
            setCode(v.replace(/\D/g, '').slice(0, 6));
            setError(null);
          }}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          textAlign="center"
          error={error}
          helper={info ?? undefined}
        />

        <Button
          label="Verify and sign in"
          onPress={handleVerify}
          loading={verifying}
          disabled={!isValid}
        />

        <Button
          label={resending ? 'Sending…' : 'Resend code'}
          onPress={handleResend}
          loading={resending}
          variant="ghost"
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
