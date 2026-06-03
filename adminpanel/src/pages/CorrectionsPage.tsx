import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { listCorrections, reviewCorrection } from '@/api/endpoints';
import type { ReviewStatus } from '@/api/types';
import { Page } from '@/components/Layout';
import { Badge, EmptyState, Loading, PageError, Pagination, Select } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { STATUS_BADGE, fmtDateTime } from '@/lib/format';
import { errMsg } from '@/lib/errors';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

export default function CorrectionsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [status, setStatus] = useState<ReviewStatus | ''>('PENDING');
  const [page, setPage] = useState(1);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['corrections', status, page],
    queryFn: () => listCorrections({ status: status || undefined, page, pageSize: 20 }),
  });

  const review = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) =>
      reviewCorrection(id, action),
    onSuccess: (_d, vars) => {
      toast.push(vars.action === 'APPROVE' ? 'Correction approved & applied' : 'Correction rejected', 'success');
      qc.invalidateQueries({ queryKey: ['corrections'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (e) => toast.push(errMsg(e), 'error'),
  });

  return (
    <Page title="Correction requests">
      <div className="toolbar">
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ReviewStatus | '');
            setPage(1);
          }}
          placeholder="All statuses"
          options={STATUS_OPTIONS}
        />
        {isFetching && <span className="spinner" />}
      </div>

      <div className="card">
        {isLoading ? (
          <Loading />
        ) : error ? (
          <PageError message={errMsg(error)} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon="✅" title="Nothing in this queue" hint="Member-submitted edits show up here." />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Field</th>
                  <th>Current</th>
                  <th>Requested</th>
                  <th>By</th>
                  <th>When</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c.id}>
                    <td className="gu">{c.personName}</td>
                    <td><code>{c.fieldName}</code></td>
                    <td className="muted gu">{c.oldValue ?? '—'}</td>
                    <td className="gu"><strong>{c.newValue ?? '—'}</strong></td>
                    <td className="muted gu">{c.requestedByName}</td>
                    <td className="muted">{fmtDateTime(c.createdAt)}</td>
                    <td>
                      <Badge tone={STATUS_BADGE[c.status]}>{c.status}</Badge>
                    </td>
                    <td>
                      {c.status === 'PENDING' && (
                        <div className="row-actions">
                          <button
                            className="btn sm primary"
                            disabled={review.isPending}
                            onClick={() => review.mutate({ id: c.id, action: 'APPROVE' })}
                          >
                            Approve
                          </button>
                          <button
                            className="btn sm danger"
                            disabled={review.isPending}
                            onClick={() => review.mutate({ id: c.id, action: 'REJECT' })}
                          >
                            Reject
                          </button>
                        </div>
                      )}
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
    </Page>
  );
}
