import { apiRequest, saveSession } from '@/services/api-client';

/**
 * The student's university on their Zuri account (user service, { data } wrapped).
 *
 *   GET  /users/me/memberships            → Membership[]
 *   POST /users/me/memberships            { institution_id, role, identifier?, is_default? } → 201 Membership
 *                                         409 "user already has a membership for this institution"
 *   POST /users/me/switch-institution     { institution_id } → new tokens scoped to that university
 *
 * The app only ever asks for role "student" (the server doesn't check roles yet;
 * reported in BACKEND_REQUESTS #0).
 */

export interface Membership {
  id: string;
  institution_id: string;
  role: string;
  department_id?: string;
  identifier?: string;
  is_default: boolean;
  status: string;
  created_at: string;
}

/**
 * Universities that exist on Zuri's server, by the name the app uses.
 * The academic service seeds "veritas_uni"; others are added as they join.
 */
export const SERVER_INSTITUTIONS: Record<string, string> = {
  'Veritas University': 'veritas_uni',
};

export function serverInstitutionFor(universityName: string): string | undefined {
  return SERVER_INSTITUTIONS[universityName.trim()];
}

export async function listMemberships(): Promise<Membership[]> {
  const res = await apiRequest<{ data?: Membership[] | null }>('/users/me/memberships');
  return res.data ?? [];
}

/** Join a university as a student (matric number as the identifier, when given). */
export async function joinInstitution(institutionId: string, matricNumber?: string): Promise<Membership> {
  const res = await apiRequest<{ data: Membership }>('/users/me/memberships', {
    method: 'POST',
    body: {
      institution_id: institutionId,
      role: 'student',
      is_default: true,
      ...(matricNumber?.trim() ? { identifier: matricNumber.trim() } : {}),
    },
  });
  return res.data;
}

/** Make a university the active one. The server returns new tokens scoped to it, which are saved. */
export async function switchInstitution(institutionId: string): Promise<void> {
  const res = await apiRequest<{ data: any }>('/users/me/switch-institution', {
    method: 'POST',
    body: { institution_id: institutionId },
  });
  if (res.data?.access_token) await saveSession(res.data);
}
