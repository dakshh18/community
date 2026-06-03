import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deletePerson, listPersons, listProfessions } from '@/api/endpoints';
import type { AdminPerson } from '@/api/types';
import { Page } from '@/components/Layout';
import { Badge, EmptyState, Loading, PageError, Pagination, Select } from '@/components/ui';
import { ConfirmModal } from '@/components/Modal';
import { MemberFormModal } from '@/components/MemberFormModal';
import { useToast } from '@/components/Toast';
import { RELATION_LABELS } from '@/lib/format';
import { errMsg } from '@/lib/errors';

export default function MembersPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [professionCatId, setProfessionCatId] = useState('');
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<AdminPerson | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AdminPerson | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: professions } = useQuery({ queryKey: ['professions'], queryFn: listProfessions });
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['persons', debounced, professionCatId, page],
    queryFn: () =>
      listPersons({
        q: debounced || undefined,
        professionCatId: professionCatId || undefined,
        page,
        pageSize: 20,
      }),
  });

  const del = useMutation({
    mutationFn: (id: string) => deletePerson(id),
    onSuccess: () => {
      toast.push('Member deleted', 'success');
      qc.invalidateQueries({ queryKey: ['persons'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      setDeleting(null);
    },
    onError: (e) => {
      toast.push(errMsg(e), 'error');
      setDeleting(null);
    },
  });

  return (
    <Page
      title="Members"
      actions={
        <button className="btn primary" onClick={() => setCreating(true)}>
          + Add member
        </button>
      }
    >
      <div className="toolbar">
        <input
          className="search"
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          value={professionCatId}
          onChange={(e) => {
            setProfessionCatId(e.target.value);
            setPage(1);
          }}
          placeholder="All professions"
          options={
            professions?.categories.map((c) => ({ value: c.id, label: c.name })) ?? []
          }
        />
        {isFetching && <span className="spinner" />}
      </div>

      <div className="card">
        {isLoading ? (
          <Loading />
        ) : error ? (
          <PageError message={errMsg(error)} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon="🔍" title="No members found" hint="Try a different search or add one." />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Relation</th>
                  <th>Native place</th>
                  <th>Profession</th>
                  <th>Phone</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="gu">{p.fullName}</span>{' '}
                      {p.isHead && <Badge tone="purple">Head</Badge>}{' '}
                      {p.hasAccount && <Badge tone="blue">Account</Badge>}
                    </td>
                    <td className="muted">{RELATION_LABELS[p.relation]}</td>
                    <td className="gu">{p.household?.nativePlace ?? '—'}</td>
                    <td>{p.professionName ?? <span className="muted">{p.professionRaw ?? '—'}</span>}</td>
                    <td className="muted">{p.phoneE164 ?? '—'}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn sm" onClick={() => setEditing(p)}>
                          Edit
                        </button>
                        <button className="btn sm danger" onClick={() => setDeleting(p)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && (
          <div style={{ padding: '0 16px 12px' }}>
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              onPage={setPage}
            />
          </div>
        )}
      </div>

      {creating && <MemberFormModal onClose={() => setCreating(false)} />}
      {editing && <MemberFormModal person={editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmModal
          title="Delete member"
          danger
          confirmLabel="Delete"
          busy={del.isPending}
          onClose={() => setDeleting(null)}
          onConfirm={() => del.mutate(deleting.id)}
          body={
            <>
              Permanently delete <strong className="gu">{deleting.fullName}</strong>? This cannot be
              undone.
              {deleting.hasAccount && (
                <div className="inline-note" style={{ marginTop: 12 }}>
                  This member has a login account — deactivate the user first (Users &amp; Roles).
                </div>
              )}
            </>
          }
        />
      )}
    </Page>
  );
}
