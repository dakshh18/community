import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { listUsers, updateUser } from '@/api/endpoints';
import type { AdminUser, Role } from '@/api/types';
import { useAuthStore } from '@/auth/store';
import { Page } from '@/components/Layout';
import { Badge, EmptyState, Loading, PageError, Pagination, Select } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { ROLE_OPTIONS, fmtDateTime, roleBadgeClass } from '@/lib/format';
import { errMsg } from '@/lib/errors';

export default function UsersPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const meId = useAuthStore((s) => s.user?.id);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['users', debounced, role, page],
    queryFn: () => listUsers({ q: debounced || undefined, role: role || undefined, page, pageSize: 20 }),
  });

  const mutate = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { role?: Role; isActive?: boolean } }) =>
      updateUser(id, body),
    onSuccess: () => {
      toast.push('User updated', 'success');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toast.push(errMsg(e), 'error'),
  });

  function changeRole(u: AdminUser, newRole: Role) {
    if (newRole === u.role) return;
    mutate.mutate({ id: u.id, body: { role: newRole } });
  }

  return (
    <Page title="Users & Roles">
      <div className="toolbar">
        <input
          className="search"
          placeholder="Search by name, email, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          value={role}
          onChange={(e) => {
            setRole(e.target.value as Role | '');
            setPage(1);
          }}
          placeholder="All roles"
          options={ROLE_OPTIONS}
        />
        {isFetching && <span className="spinner" />}
      </div>

      <div className="card">
        {isLoading ? (
          <Loading />
        ) : error ? (
          <PageError message={errMsg(error)} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon="🛡" title="No users found" hint="Users appear after their first login." />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Active</th>
                  <th>Last login</th>
                  <th style={{ textAlign: 'right' }}>Change role</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => {
                  const isSelf = u.id === meId;
                  return (
                    <tr key={u.id}>
                      <td className="gu">
                        {u.personName ?? '—'} {isSelf && <Badge tone="purple">You</Badge>}
                        {u.hasPassword && <Badge tone="blue">Panel</Badge>}
                      </td>
                      <td className="muted">{u.email ?? '—'}</td>
                      <td className="muted">{u.phone ?? '—'}</td>
                      <td>
                        <Badge tone={roleBadgeClass(u.role)}>{u.role}</Badge>
                      </td>
                      <td>
                        {u.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Disabled</Badge>}
                      </td>
                      <td className="muted">{fmtDateTime(u.lastLoginAt)}</td>
                      <td>
                        <div className="row-actions" style={{ alignItems: 'center' }}>
                          <select
                            value={u.role}
                            disabled={isSelf || mutate.isPending}
                            style={{ width: 'auto', minWidth: 130 }}
                            onChange={(e) => changeRole(u, e.target.value as Role)}
                          >
                            {ROLE_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          {!isSelf && (
                            <button
                              className={`btn sm ${u.isActive ? 'danger' : ''}`}
                              disabled={mutate.isPending}
                              onClick={() =>
                                mutate.mutate({ id: u.id, body: { isActive: !u.isActive } })
                              }
                            >
                              {u.isActive ? 'Disable' : 'Enable'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {data && (
          <div style={{ padding: '0 16px 12px' }}>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />
          </div>
        )}
      </div>

      <p style={{ color: 'var(--text-faint)', fontSize: 13, marginTop: 14 }}>
        “Panel” = has a web-panel password. To grant panel access, run{' '}
        <code>npm run set-admin-password -- &lt;phone&gt; &lt;password&gt; ADMIN</code> on the server.
      </p>
    </Page>
  );
}
