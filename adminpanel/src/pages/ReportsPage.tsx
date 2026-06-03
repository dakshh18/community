import { useState } from 'react';

import { Page } from '@/components/Layout';
import { useToast } from '@/components/Toast';
import { downloadCsv } from '@/lib/download';
import { errMsg } from '@/lib/errors';

interface Report {
  key: string;
  title: string;
  desc: string;
  path: string;
  file: string;
}

const REPORTS: Report[] = [
  {
    key: 'members',
    title: 'Member directory',
    desc: 'Every member with household, native place, profession and contact.',
    path: '/reports/members.csv',
    file: 'members.csv',
  },
  {
    key: 'pending',
    title: 'Pending payments',
    desc: 'All households with outstanding contributions across events.',
    path: '/reports/payments/pending.csv',
    file: 'pending-payments.csv',
  },
];

export default function ReportsPage() {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function download(r: Report) {
    setBusy(r.key);
    try {
      await downloadCsv(r.path, r.file);
      toast.push(`Downloaded ${r.file}`, 'success');
    } catch (e) {
      toast.push(errMsg(e, 'Download failed'), 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Page title="Reports">
      <div className="grid cols-2">
        {REPORTS.map((r) => (
          <div key={r.key} className="card pad">
            <h3 style={{ fontSize: 16 }}>{r.title}</h3>
            <p style={{ color: 'var(--text-soft)', fontSize: 14, margin: '6px 0 16px' }}>{r.desc}</p>
            <button className="btn primary" disabled={busy === r.key} onClick={() => download(r)}>
              {busy === r.key ? 'Preparing…' : '⬇ Download CSV'}
            </button>
          </div>
        ))}
      </div>
      <p style={{ color: 'var(--text-faint)', fontSize: 13, marginTop: 16 }}>
        Per-event registration, payment and expense reports are available on each event's detail page.
      </p>
    </Page>
  );
}
