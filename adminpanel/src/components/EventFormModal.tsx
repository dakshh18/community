import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createEvent, updateEvent } from '@/api/endpoints';
import type { EventRow } from '@/api/types';
import { Modal } from './Modal';
import { Field, Input, Textarea } from './ui';
import { useToast } from './Toast';
import { toLocalInput } from '@/lib/format';
import { errMsg } from '@/lib/errors';

export function EventFormModal({
  event,
  onClose,
  onSaved,
}: {
  event?: EventRow | null;
  onClose: () => void;
  onSaved?: (e: EventRow) => void;
}) {
  const editing = !!event;
  const qc = useQueryClient();
  const toast = useToast();

  const [name, setName] = useState(event?.name ?? '');
  const [dateTime, setDateTime] = useState(toLocalInput(event?.dateTime) || '');
  const [venue, setVenue] = useState(event?.venue ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [contribution, setContribution] = useState(String(event?.contributionPerFamily ?? 1000));
  const [registrationOpen, setRegistrationOpen] = useState(event?.registrationOpen ?? true);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const body = {
        name: name.trim(),
        dateTime: new Date(dateTime).toISOString(),
        venue: venue.trim() || null,
        description: description.trim() || null,
        contributionPerFamily: Number(contribution) || 0,
        registrationOpen,
      };
      return editing ? updateEvent(event!.id, body) : createEvent(body);
    },
    onSuccess: (e) => {
      toast.push(editing ? 'Event updated' : 'Event created', 'success');
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['event', event?.id] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      onSaved?.(e);
      onClose();
    },
    onError: (e) => setError(errMsg(e)),
  });

  return (
    <Modal
      title={editing ? 'Edit event' : 'New event'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={() => {
              setError('');
              if (!name.trim()) return setError('Name is required');
              if (!dateTime) return setError('Date & time is required');
              mutation.mutate();
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create event'}
          </button>
        </>
      }
    >
      {error && <div className="page-error">{error}</div>}
      <Field label="Event name">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Snehmilan 2026" autoFocus />
      </Field>
      <div className="row2">
        <Field label="Date & time">
          <Input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} />
        </Field>
        <Field label="Contribution / family (₹)">
          <Input
            type="number"
            min={0}
            value={contribution}
            onChange={(e) => setContribution(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Venue">
        <Input value={venue} onChange={(e) => setVenue(e.target.value)} />
      </Field>
      <Field label="Description">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <label className="check">
        <input
          type="checkbox"
          checked={registrationOpen}
          onChange={(e) => setRegistrationOpen(e.target.checked)}
        />
        Registration open
      </label>
    </Modal>
  );
}
