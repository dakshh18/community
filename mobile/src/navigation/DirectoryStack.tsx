import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { DirectoryScreen } from '@/screens/directory/DirectoryScreen';
import { MemberDetailScreen } from '@/screens/directory/MemberDetailScreen';
import { colors, typography } from '@/theme';
import type { DirectoryStackParamList } from './types';

const Stack = createNativeStackNavigator<DirectoryStackParamList>();

export function DirectoryStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { ...typography.h3, color: colors.text },
        headerTintColor: colors.primary,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="DirectoryList" component={DirectoryScreen} options={{ title: 'Directory' }} />
      <Stack.Screen name="MemberDetail" component={MemberDetailScreen} options={{ title: 'Member' }} />
    </Stack.Navigator>
  );
}
