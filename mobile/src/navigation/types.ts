/** Route param types — keep in sync with the navigators. */

export type AuthStackParamList = {
  Login: undefined;
  EnterEmail: { phone: string };
  Otp: { phone: string; email?: string; maskedEmail?: string | null };
  NotRegistered: { adminContactPhone: string | null };
};

export type RootTabParamList = {
  Home: undefined;
  Directory: undefined;
  Events: undefined;
  Help: undefined;
  Profile: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends AuthStackParamList, RootTabParamList {}
  }
}
