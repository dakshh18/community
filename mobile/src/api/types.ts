/** Mirror of the backend's response shapes (auth + minimal directory). */

export type Role = 'ADMIN' | 'COMMITTEE' | 'MEMBER';

export interface AuthStartResponse {
  found: boolean;
  needsEmail: boolean;
  maskedEmail: string | null;
}

export interface NotRegisteredResponse {
  error: 'not_registered';
  message: string;
  adminContactPhone: string | null;
}

export interface SendOtpResponse {
  sent: true;
  maskedEmail: string;
  expiresInMinutes: number;
  mock: boolean;
}

export interface VerifyOtpResponse {
  token: string;
  user: {
    id: string;
    role: Role;
    phone: string;
    email: string | null;
  };
  personId: string;
  householdId: string;
}

export interface ApiErrorBody {
  error: string;
  message: string;
  issues?: { path: (string | number)[]; message: string }[];
  adminContactPhone?: string | null;
}

// ---------- Directory ----------

export type Relation =
  | 'SELF'
  | 'SPOUSE'
  | 'SON'
  | 'DAUGHTER'
  | 'DAUGHTER_IN_LAW'
  | 'MOTHER'
  | 'FATHER'
  | 'GRANDSON'
  | 'GRANDDAUGHTER'
  | 'OTHER';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface ProfessionView {
  id: string;
  name: string;
  nameGu: string | null;
  icon: string | null;
}

export interface PersonView {
  id: string;
  householdId: string;
  fullName: string;
  relation: Relation;
  gender: Gender | null;
  nativePlace: string;
  city: string;
  professionRaw: string | null;
  profession: ProfessionView | null;
  bloodGroup: string | null;
  dob: string | null;
  phone: string | null;
  phoneE164: string | null;
  email: string | null;
  isOwner: boolean;
  isHouseholdMember: boolean;
  privacy?: { showPhone: boolean; showAddress: boolean };
}

export interface DirectoryPage {
  items: PersonView[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DirectoryQuery {
  q?: string;
  professionCategoryId?: string;
  nativePlace?: string;
  city?: string;
  bloodGroup?: string;
  page?: number;
  pageSize?: number;
}

export interface HouseholdView {
  id: string;
  nativePlace: string;
  city: string;
  nativeAddress: string | null;
  vadodaraAddress: string | null;
  householdPhone: string | null;
  head: { id: string; fullName: string } | null;
}

export interface MyHouseholdResult {
  household: HouseholdView;
  members: PersonView[];
}

export interface ProfessionCategoryRow {
  id: string;
  name: string;
  nameGu: string | null;
  icon: string | null;
  personsCount: number;
}

export interface ProfessionsResult {
  categories: ProfessionCategoryRow[];
  uncategorizedCount: number;
  totalPersons: number;
}

/** Sentinel for the "Other" chip — filters for persons with no profession category. */
export const NO_CATEGORY = 'none';
