import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { HomeScreen } from '@/screens/HomeScreen';
import { ComingSoonScreen } from '@/screens/ComingSoonScreen';
import { DirectoryStack } from './DirectoryStack';
import { EventsStack } from './EventsStack';
import { ProfileStack } from './ProfileStack';
import { colors, spacing, typography } from '@/theme';
import type { RootTabParamList } from './types';

const Tabs = createBottomTabNavigator<RootTabParamList>();

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<keyof RootTabParamList, IconName> = {
  Home: 'home-outline',
  Directory: 'people-outline',
  Events: 'calendar-outline',
  Help: 'help-circle-outline',
  Profile: 'person-outline',
};

export function AppTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { ...typography.caption },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
          paddingTop: spacing.xs,
          height: 64,
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={ICONS[route.name]} color={color} size={size} />
        ),
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Directory" component={DirectoryStack} />
      <Tabs.Screen name="Events" component={EventsStack} />
      <Tabs.Screen name="Help" component={ComingSoonScreen} />
      <Tabs.Screen name="Profile" component={ProfileStack} />
    </Tabs.Navigator>
  );
}
