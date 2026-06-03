import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { listEvents } from '@/api/endpoints';
import { useAuthStore } from '@/auth/store';
import { Page } from '@/components/Layout';
import { Badge, EmptyState, Loading, PageError, Pagination } from '@/components/ui';
import { EventFormModal } from '@/components/EventFormModal';
import { fmtDateTime, rupees } from '@/lib/format';
import { errMsg } from '@/lib/errors';

export default function EventsPage() {
  const navigate = useNavigate();
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['events', page],
    queryFn: () => listEvents({ page, pageSize: 20 }),
  });

  return (
    <Page
      title="Events"
      actions={
        isAdmin ? (
          <button className="btn primary" onClick={() => setCreating(true)}>
            + New event
          </button>
        ) : null
      }
    >
      <div className="card">
        {isLoading ? (
          <Loading />
        ) : error ? (
          <PageError message={errMsg(error)} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon="📅" title="No events yet" />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>When</th>
                  <th>Venue</th>
                  <th style={{ textAlign: 'right' }}>Contribution</th>
                  <th style={{ textAlign: 'right' }}>Regs</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((e) => (
                  <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/events/${e.id}`)}>
                    <td><strong>{e.name}</strong></td>
                    <td className="muted">{fmtDateTime(e.dateTime)}</td>
                    <td className="muted">{e.venue ?? '—'}</td>
                    <td style={{ textAlign: 'right' }}>{rupees(e.contributionPerFamily)}</td>
                    <td style={{ textAlign: 'right' }}>{e.registrationsCount ?? 0}</td>
                    <td>
                      {e.registrationOpen ? (
                        <Badge tone="green">Open</Badge>
                      ) : (
                        <Badge>Closed</Badge>
                      )}
                    </td>
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
        <EventFormModal onClose={() => setCreating(false)} onSaved={(e) => navigate(`/events/${e.id}`)} />
      )}
    </Page>
  );
}
