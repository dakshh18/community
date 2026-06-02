/** Directory + household + professions endpoint wrappers. */
import { api } from './client';
import type {
  DirectoryPage,
  DirectoryQuery,
  MyHouseholdResult,
  NativePlaceRow,
  PersonView,
  ProfessionsResult,
} from './types';

export async function getDirectory(query: DirectoryQuery): Promise<DirectoryPage> {
  const { data } = await api.get<DirectoryPage>('/directory', { params: query });
  return data;
}

export async function getPerson(id: string): Promise<PersonView> {
  const { data } = await api.get<PersonView>(`/persons/${id}`);
  return data;
}

export async function getMyHousehold(): Promise<MyHouseholdResult> {
  const { data } = await api.get<MyHouseholdResult>('/households/me');
  return data;
}

export async function getProfessions(): Promise<ProfessionsResult> {
  const { data } = await api.get<ProfessionsResult>('/professions');
  return data;
}

export async function getNativePlaces(): Promise<NativePlaceRow[]> {
  const { data } = await api.get<NativePlaceRow[]>('/native-places');
  return data;
}
