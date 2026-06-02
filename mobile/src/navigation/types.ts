/** Route param types — kept in sync with the navigators. */

import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  EnterEmail: { phone: string };
  Otp: { phone: string; email?: string; maskedEmail?: string | null };
  NotRegistered: { adminContactPhone: string | null };
};

export type DirectoryStackParamList = {
  DirectoryList: { nativePlace?: string } | undefined;
  MemberDetail: { personId: string };
};

export type EventsStackParamList = {
  EventsList: undefined;
  EventDetail: { eventId: string };
  Register: { eventId: string };
  PerformanceForm: { registrationId: string; eventId: string };
  PaymentStatus: { eventId: string };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  MyHousehold: undefined;
  MemberDetail: { personId: string };
};

export type RootTabParamList = {
  Home: undefined;
  Directory: NavigatorScreenParams<DirectoryStackParamList>;
  Events: NavigatorScreenParams<EventsStackParamList>;
  Help: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList
      extends AuthStackParamList,
        RootTabParamList,
        EventsStackParamList {}
  }
}
