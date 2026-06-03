import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { getAdminStats } from '@/api/endpoints';
import { Page } from '@/components/Layout';
import { Badge, Loading, PageError } from '@/components/ui';
import { fmtDateTime, rupees } from '@/lib/format';
import { errMsg } from '@/lib/errors';

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
  });

  return (
    <Page title="Dashboard">
      {isLoading && <Loading />}
      {error && <PageError message={errMsg(error, 'Could not load stats')} />}
      {data && (
        <>
          <div className="grid cols-4" style={{ marginBottom: 16 }}>
            <Stat label="Households" value={data.totals.households} />
            <Stat label="Members" value={data.totals.persons} />
            <Stat
              label="Active users"
              value={data.totals.activeUsers}
              sub={`${data.totals.users} total`}
            />
            <Stat
              label="Pending corrections"
              value={data.queues.pendingCorrections}
              sub={`${data.queues.pendingHelpRequests} help requests`}
            />
          </div>

          <div className="grid cols-4" style={{ marginBottom: 16 }}>
            <Stat label="Expected collection" value={rupees(data.payments.expected)} />
            <Stat label="Collected" value={rupees(data.payments.collected)} />
            <Stat label="Outstanding" value={rupees(data.payments.outstanding)} />
            <Stat
              label="Payments"
              value={`${data.payments.statusBuckets.PAID} paid`}
              sub={`${data.payments.statusBuckets.PARTIAL} partial · ${data.payments.statusBuckets.PENDING} pending`}
            />
          </div>

          <div className="grid cols-2">
            <div className="card">
              <div className="card-head">
                <h3>Members by profession</h3>
              </div>
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Gujarati</th>
                      <th style={{ textAlign: 'right' }}>Members</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byProfession.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td className="gu">{p.nameGu ?? '—'}</td>
                        <td style={{ textAlign: 'right' }}>{p.personsCount}</td>
                      </tr>
                    ))}
                    {data.byProfession.length === 0 && (
                      <tr>
                        <td colSpan={3} className="muted">
                          No categories yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3>Upcoming events</h3>
                <Link to="/events" className="btn sm">
                  All events
                </Link>
              </div>
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>When</th>
                      <th style={{ textAlign: 'right' }}>Regs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.upcomingEvents.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <Link to={`/events/${e.id}`}>{e.name}</Link>
                        </td>
                        <td className="muted">{fmtDateTime(e.dateTime)}</td>
                        <td style={{ textAlign: 'right' }}>{e.registrationsCount}</td>
                      </tr>
                    ))}
                    {data.upcomingEvents.length === 0 && (
                      <tr>
                        <td colSpan={3} className="muted">
                          No upcoming events.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {data.recentHelpRequests.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-head">
                <h3>Recent help requests</h3>
              </div>
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>By</th>
                      <th>Category</th>
                      <th>Urgency</th>
                      <th>Status</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentHelpRequests.map((h) => (
                      <tr key={h.id}>
                        <td>{h.requestedByName}</td>
                        <td>{h.category}</td>
                        <td>{h.urgency}</td>
                        <td>
                          <Badge tone={h.status === 'PENDING' ? 'amber' : 'green'}>{h.status}</Badge>
                        </td>
                        <td className="muted">{h.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </Page>
  );
}
