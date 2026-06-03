import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { listHouseholds } from '@/api/endpoints';

/**
 * Async combobox for picking a household. Types → queries /admin/households,
 * shows matches, selecting one fires onChange with the id + a display label.
 */
export function HouseholdPicker({
  value,
  label,
  onChange,
}: {
  value: string | null;
  label: string | null;
  onChange: (id: string | null, label: string | null) => void;
}) {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 250);
    return () => clearTimeout(t);
  }, [term]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const { data } = useQuery({
    queryKey: ['household-picker', debounced],
    queryFn: () => listHouseholds({ q: debounced || undefined, pageSize: 15 }),
    enabled: open,
  });

  if (value && label) {
    return (
      <div className="check" style={{ justifyContent: 'space-between' }}>
        <span>
          🏠 <strong>{label}</strong>
        </span>
        <button type="button" className="btn sm ghost" onClick={() => onChange(null, null)}>
          Change
        </button>
      </div>
    );
  }

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <input
        value={term}
        placeholder="Search household by native place, head, phone…"
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && data && data.items.length > 0 && (
        <div
          className="card"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            zIndex: 50,
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
          {data.items.map((h) => (
            <button
              key={h.id}
              type="button"
              className="btn ghost"
              style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0 }}
              onClick={() => {
                onChange(h.id, `${h.nativePlace} — ${h.headName ?? 'No head'}`);
                setOpen(false);
                setTerm('');
              }}
            >
              <span className="gu">{h.nativePlace}</span>
              <span className="muted" style={{ marginLeft: 6 }}>
                {h.headName ?? 'No head'} · {h.personsCount} members
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
