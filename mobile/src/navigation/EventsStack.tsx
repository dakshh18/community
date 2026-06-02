import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { EventsListScreen } from '@/screens/events/EventsListScreen';
import { EventDetailScreen } from '@/screens/events/EventDetailScreen';
import { RegisterScreen } from '@/screens/events/RegisterScreen';
import { PerformanceFormScreen } from '@/screens/events/PerformanceFormScreen';
import { PaymentStatusScreen } from '@/screens/events/PaymentStatusScreen';
import { colors, typography } from '@/theme';
import type { EventsStackParamList } from './types';

const Stack = createNativeStackNavigator<EventsStackParamList>();

export function EventsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { ...typography.h3, color: colors.text },
        headerTintColor: colors.primary,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="EventsList" component={EventsListScreen} options={{ title: 'Events' }} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: 'Event' }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
      <Stack.Screen
        name="PerformanceForm"
        component={PerformanceFormScreen}
        options={{ title: 'Kids performance', presentation: 'modal' }}
      />
      <Stack.Screen name="PaymentStatus" component={PaymentStatusScreen} options={{ title: 'Payment status' }} />
    </Stack.Navigator>
  );
}
