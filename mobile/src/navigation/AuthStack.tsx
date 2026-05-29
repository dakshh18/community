import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LoginScreen } from '@/screens/auth/LoginScreen';
import { EnterEmailScreen } from '@/screens/auth/EnterEmailScreen';
import { OtpScreen } from '@/screens/auth/OtpScreen';
import { NotRegisteredScreen } from '@/screens/auth/NotRegisteredScreen';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="EnterEmail" component={EnterEmailScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="NotRegistered" component={NotRegisteredScreen} />
    </Stack.Navigator>
  );
}
