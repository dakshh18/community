import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createHousehold, updateHousehold } from '@/api/endpoints';
import type { AdminHousehold } from '@/api/types';
import { Modal } from './Modal';
import { Field, Input, Textarea } from './ui';
import { useToast } from './Toast';
import { errMsg } from '@/lib/errors';

export function HouseholdFormModal({
  household,
  onClose,
  onSaved,
}: {
  household?: AdminHousehold | null;
  onClose: () => void;
  onSaved?: (h: AdminHousehold) => void;
}) {
  const editing = !!household;
  const qc = useQueryClient();
  const toast = useToast();

  const [nativePlace, setNativePlace] = useState(household?.nativePlace ?? '');
  const [city, setCity] = useState(household?.city ?? 'Vadodara');
  const [householdPhone, setHouseholdPhone] = useState(household?.householdPhone ?? '');
  const [nativeAddress, setNativeAddress] = useState(household?.nativeAddress ?? '');
  const [vadodaraAddress, setVadodaraAddress] = useState(household?.vadodaraAddress ?? '');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        nativePlace: nativePlace.trim(),
        city: city.trim() || 'Vadodara',
        householdPhone: householdPhone.trim() || null,
        nativeAddress: nativeAddress.trim() || null,
        vadodaraAddress: vadodaraAddress.trim() || null,
      };
      return editing ? updateHousehold(household!.id, body) : createHousehold(body);
    },
    onSuccess: (h) => {
      toast.push(editing ? 'Household updated' : 'Household created', 'success');
      qc.invalidateQueries({ queryKey: ['households'] });
      qc.invalidateQueries({ queryKey: ['household', household?.id] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      onSaved?.(h);
      onClose();
    },
    onError: (e) => setError(errMsg(e)),
  });

  return (
    <Modal
      title={editing ? `Edit household` : 'New household'}
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
              if (!nativePlace.trim()) {
                setError('Native place is required');
                return;
              }
              mutation.mutate();
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create'}
          </button>
        </>
      }
    >
      {error && <div className="page-error">{error}</div>}
      <div className="row2">
        <Field label="Native place (village)" hint="The source village / gaam">
          <Input
            value={nativePlace}
            onChange={(e) => setNativePlace(e.target.value)}
            placeholder="ખેરોલી"
            autoFocus
          />
        </Field>
        <Field label="City">
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
      </div>
      <Field label="Household phone" hint="Primary login number (usually the head's)">
        <Input
          value={householdPhone}
          onChange={(e) => setHouseholdPhone(e.target.value)}
          placeholder="9XXXXXXXXX"
        />
      </Field>
      <Field label="Native address">
        <Textarea value={nativeAddress} onChange={(e) => setNativeAddress(e.target.value)} />
      </Field>
      <Field label="Vadodara address">
        <Textarea value={vadodaraAddress} onChange={(e) => setVadodaraAddress(e.target.value)} />
      </Field>
    </Modal>
  );
}
