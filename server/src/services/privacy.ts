/**
 * Server-side privacy filter. Spec §6.
 *
 * Every directory response is run through these `view*` projectors. Hidden
 * fields are nulled out at the service layer so they never travel over the
 * wire to unauthorized viewers.
 *
 * Visibility rules (non-owner, logged-in member):
 *   - fullName, relation, gender, profession, native place, city  → always
 *   - bloodGroup                                                  → always (spec §6)
 *   - dob                                                         → hidden
 *   - email                                                       → hidden
 *   - phone / phoneE164                                           → hidden if Person.showPhone is false
 *   - full address                                                → hidden if head Person.showAddress is false
 *
 * Owner (Person matches viewer), same-household viewer, and ADMIN/COMMITTEE
 * always see everything.
 */

import type {
  Person,
  ProfessionCategory,
  Household,
  Relation,
  Gender,
  Role,
} from '@prisma/client';

export interface ViewerCtx {
  sub: string;        // User.id (JWT subject)
  personId: string;
  householdId: string;
  role: Role;
}

export interface PersonWithCat extends Person {
  professionCat: ProfessionCategory | null;
}

export interface HouseholdSummary {
  nativePlace: string;
  city: string;
}

export interface HouseholdWithHead extends Household {
  head: Person | null;
}

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
  dob: string | null;        // ISO date — null when hidden
  phone: string | null;      // canonical 10-digit — null when hidden
  phoneE164: string | null;
  email: string | null;      // null unless owner/admin
  isOwner: boolean;
  isHouseholdMember: boolean;
  privacy?: {
    showPhone: boolean;
    showAddress: boolean;
  };
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

function isPrivileged(viewer: ViewerCtx): boolean {
  return viewer.role === 'ADMIN' || viewer.role === 'COMMITTEE';
}

export function viewPerson(
  p: PersonWithCat,
  household: HouseholdSummary,
  viewer: ViewerCtx,
): PersonView {
  const isOwner = viewer.personId === p.id;
  const isMember = p.householdId === viewer.householdId;
  const isAdmin = isPrivileged(viewer);
  const fullVisible = isOwner || isMember || isAdmin;

  const phoneVisible = p.showPhone || fullVisible;
  const dobVisible = fullVisible;
  const emailVisible = isOwner || isAdmin;

  return {
    id: p.id,
    householdId: p.householdId,
    fullName: p.fullName,
    relation: p.relation,
    gender: p.gender,
    nativePlace: household.nativePlace.trim(),
    city: household.city,
    professionRaw: p.professionRaw,
    profession: p.professionCat
      ? {
          id: p.professionCat.id,
          name: p.professionCat.name,
          nameGu: p.professionCat.nameGu,
          icon: p.professionCat.icon,
        }
      : null,
    bloodGroup: p.bloodGroup,
    dob: dobVisible && p.dob ? p.dob.toISOString() : null,
    phone: phoneVisible ? p.phone : null,
    phoneE164: phoneVisible ? p.phoneE164 : null,
    email: emailVisible ? p.email : null,
    isOwner,
    isHouseholdMember: isMember,
    ...(isOwner
      ? { privacy: { showPhone: p.showPhone, showAddress: p.showAddress } }
      : {}),
  };
}

export function viewHousehold(h: HouseholdWithHead, viewer: ViewerCtx): HouseholdView {
  const isMember = h.id === viewer.householdId;
  const isAdmin = isPrivileged(viewer);
  const headShowsAddr = h.head?.showAddress ?? false;
  const headShowsPhone = h.head?.showPhone ?? true;

  const addrVisible = isMember || isAdmin || headShowsAddr;
  const phoneVisible = isMember || isAdmin || headShowsPhone;

  return {
    id: h.id,
    nativePlace: h.nativePlace.trim(),
    city: h.city,
    nativeAddress: addrVisible ? h.nativeAddress : null,
    vadodaraAddress: addrVisible ? h.vadodaraAddress : null,
    householdPhone: phoneVisible ? h.householdPhone : null,
    head: h.head ? { id: h.head.id, fullName: h.head.fullName } : null,
  };
}
