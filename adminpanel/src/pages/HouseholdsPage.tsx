import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { listHouseholds } from '@/api/endpoints';
import { Page } from '@/components/Layout';
import { EmptyState, Loading, PageError, Pagination } from '@/components/ui';
import { HouseholdFormModal } from '@/components/HouseholdFormModal';
import { errMsg } from '@/lib/errors';

export default function HouseholdsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['households', debounced, page],
    queryFn: () => listHouseholds({ q: debounced || undefined, page, pageSize: 20 }),
  });

  return (
    <Page
      title="Households"
      actions={
        <button className="btn primary" onClick={() => setCreating(true)}>
          + New household
        </button>
      }
    >
      <div className="toolbar">
        <input
          className="search"
          placeholder="Search by village, head, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {isFetching && <span className="spinner" />}
      </div>

      <div className="card">
        {isLoading ? (
          <Loading />
        ) : error ? (
          <PageError message={errMsg(error)} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon="🏠" title="No households found" />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Native place</th>
                  <th>Head</th>
                  <th>Phone</th>
                  <th>City</th>
                  <th style={{ textAlign: 'right' }}>Members</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((h) => (
                  <tr
                    key={h.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/households/${h.id}`)}
                  >
                    <td className="gu">
                      <strong>{h.nativePlace}</strong>
                    </td>
                    <td className="gu">{h.headName ?? <span className="muted">No head set</span>}</td>
                    <td className="muted">{h.householdPhone ?? '—'}</td>
                    <td className="muted">{h.city}</td>
                    <td style={{ textAlign: 'right' }}>{h.personsCount}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn sm">Open →</button>
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
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />
          </div>
        )}
      </div>

      {creating && (
        <HouseholdFormModal
          onClose={() => setCreating(false)}
          onSaved={(h) => navigate(`/households/${h.id}`)}
        />
      )}
    </Page>
  );
}
