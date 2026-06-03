import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteHousehold,
  deletePerson,
  getHousehold,
  updateHousehold,
} from '@/api/endpoints';
import type { AdminPerson } from '@/api/types';
import { Page } from '@/components/Layout';
import { Badge, Loading, PageError } from '@/components/ui';
import { ConfirmModal } from '@/components/Modal';
import { HouseholdFormModal } from '@/components/HouseholdFormModal';
import { MemberFormModal } from '@/components/MemberFormModal';
import { useToast } from '@/components/Toast';
import { RELATION_LABELS, fmtDate } from '@/lib/format';
import { errMsg } from '@/lib/errors';

export default function HouseholdDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const [editingHousehold, setEditingHousehold] = useState(false);
  const [deletingHousehold, setDeletingHousehold] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [editingMember, setEditingMember] = useState<AdminPerson | null>(null);
  const [deletingMember, setDeletingMember] = useState<AdminPerson | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['household', id],
    queryFn: () => getHousehold(id),
  });

  const setHead = useMutation({
    mutationFn: (personId: string) => updateHousehold(id, { headPersonId: personId }),
    onSuccess: () => {
      toast.push('Head updated', 'success');
      qc.invalidateQueries({ queryKey: ['household', id] });
    },
    onError: (e) => toast.push(errMsg(e), 'error'),
  });

  const delHousehold = useMutation({
    mutationFn: () => deleteHousehold(id),
    onSuccess: () => {
      toast.push('Household deleted', 'success');
      qc.invalidateQueries({ queryKey: ['households'] });
      navigate('/households');
    },
    onError: (e) => {
      toast.push(errMsg(e), 'error');
      setDeletingHousehold(false);
    },
  });

  const delMember = useMutation({
    mutationFn: (pid: string) => deletePerson(pid),
    onSuccess: () => {
      toast.push('Member deleted', 'success');
      qc.invalidateQueries({ queryKey: ['household', id] });
      setDeletingMember(null);
    },
    onError: (e) => {
      toast.push(errMsg(e), 'error');
      setDeletingMember(null);
    },
  });

  return (
    <Page
      title="Household"
      actions={
        <Link to="/households" className="btn">
          ← All households
        </Link>
      }
    >
      {isLoading && <Loading />}
      {error && <PageError message={errMsg(error)} />}
      {data && (
        <>
          <div className="card pad" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <h2 className="gu" style={{ fontSize: 22 }}>
                  {data.nativePlace}
                </h2>
                <div className="muted" style={{ marginTop: 4 }}>
                  {data.city} · {data.personsCount} member{data.personsCount === 1 ? '' : 's'}
                </div>
              </div>
              <div className="row-actions">
                <button className="btn" onClick={() => setEditingHousehold(true)}>
                  Edit
                </button>
                <button className="btn danger" onClick={() => setDeletingHousehold(true)}>
                  Delete
                </button>
              </div>
            </div>
            <dl className="kv" style={{ marginTop: 18 }}>
              <dt>Head</dt>
              <dd className="gu">{data.headName ?? '— not set —'}</dd>
              <dt>Household phone</dt>
              <dd>{data.householdPhone ?? '—'}</dd>
              <dt>Native address</dt>
              <dd>{data.nativeAddress ?? '—'}</dd>
              <dt>Vadodara address</dt>
              <dd>{data.vadodaraAddress ?? '—'}</dd>
            </dl>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Members</h3>
              <button className="btn primary sm" onClick={() => setAddingMember(true)}>
                + Add member
              </button>
            </div>
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Relation</th>
                    <th>DOB</th>
                    <th>Profession</th>
                    <th>Phone</th>
                    <th>Blood</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.members.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span className="gu">{p.fullName}</span>{' '}
                        {p.isHead && <Badge tone="purple">Head</Badge>}{' '}
                        {p.hasAccount && <Badge tone="blue">Account</Badge>}
                      </td>
                      <td className="muted">{RELATION_LABELS[p.relation]}</td>
                      <td className="muted">{fmtDate(p.dob)}</td>
                      <td>
                        {p.professionName ?? <span className="muted">{p.professionRaw ?? '—'}</span>}
                      </td>
                      <td className="muted">{p.phoneE164 ?? '—'}</td>
                      <td>{p.bloodGroup ?? '—'}</td>
                      <td>
                        <div className="row-actions">
                          {!p.isHead && (
                            <button
                              className="btn sm"
                              disabled={setHead.isPending}
                              onClick={() => setHead.mutate(p.id)}
                            >
                              Make head
                            </button>
                          )}
                          <button className="btn sm" onClick={() => setEditingMember(p)}>
                            Edit
                          </button>
                          <button className="btn sm danger" onClick={() => setDeletingMember(p)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data.members.length === 0 && (
                    <tr>
                      <td colSpan={7} className="muted">
                        No members yet. Add the first one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {editingHousehold && (
            <HouseholdFormModal household={data} onClose={() => setEditingHousehold(false)} />
          )}
          {addingMember && (
            <MemberFormModal
              fixedHousehold={{ id: data.id, label: `${data.nativePlace} (${data.city})` }}
              onClose={() => setAddingMember(false)}
            />
          )}
          {editingMember && (
            <MemberFormModal person={editingMember} onClose={() => setEditingMember(null)} />
          )}
          {deletingHousehold && (
            <ConfirmModal
              title="Delete household"
              danger
              confirmLabel="Delete"
              busy={delHousehold.isPending}
              onClose={() => setDeletingHousehold(false)}
              onConfirm={() => delHousehold.mutate()}
              body={
                data.personsCount > 0 ? (
                  <div className="inline-note">
                    This household has {data.personsCount} member(s). Move or delete them first.
                  </div>
                ) : (
                  <>
                    Delete <strong className="gu">{data.nativePlace}</strong>? This cannot be undone.
                  </>
                )
              }
            />
          )}
          {deletingMember && (
            <ConfirmModal
              title="Delete member"
              danger
              confirmLabel="Delete"
              busy={delMember.isPending}
              onClose={() => setDeletingMember(null)}
              onConfirm={() => delMember.mutate(deletingMember.id)}
              body={
                <>
                  Delete <strong className="gu">{deletingMember.fullName}</strong>?
                  {deletingMember.hasAccount && (
                    <div className="inline-note" style={{ marginTop: 12 }}>
                      This member has a login account — deactivate the user first.
                    </div>
                  )}
                </>
              }
            />
          )}
        </>
      )}
    </Page>
  );
}
