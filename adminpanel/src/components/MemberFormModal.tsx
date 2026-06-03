import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createPerson, listProfessions, updatePerson } from '@/api/endpoints';
import type { AdminPerson, Relation } from '@/api/types';
import { Modal } from './Modal';
import { Field, Input, Select } from './ui';
import { HouseholdPicker } from './HouseholdPicker';
import { GENDER_OPTIONS, RELATION_OPTIONS, toDateInput } from '@/lib/format';
import { errMsg } from '@/lib/errors';
import { useToast } from './Toast';

interface FixedHousehold {
  id: string;
  label: string;
}

export function MemberFormModal({
  person,
  fixedHousehold,
  onClose,
  onSaved,
}: {
  person?: AdminPerson | null;
  fixedHousehold?: FixedHousehold;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const editing = !!person;
  const qc = useQueryClient();
  const toast = useToast();

  const [householdId, setHouseholdId] = useState<string | null>(
    person?.householdId ?? fixedHousehold?.id ?? null,
  );
  const [householdLabel, setHouseholdLabel] = useState<string | null>(
    fixedHousehold?.label ??
      (person?.household ? `${person.household.nativePlace} — ${person.fullName}` : null),
  );

  const [fullName, setFullName] = useState(person?.fullName ?? '');
  const [relation, setRelation] = useState<Relation>(person?.relation ?? 'OTHER');
  const [gender, setGender] = useState<string>(person?.gender ?? '');
  const [dob, setDob] = useState(toDateInput(person?.dob));
  const [phone, setPhone] = useState(person?.phone ?? '');
  const [email, setEmail] = useState(person?.email ?? '');
  const [professionRaw, setProfessionRaw] = useState(person?.professionRaw ?? '');
  const [professionCatId, setProfessionCatId] = useState(person?.professionCatId ?? '');
  const [bloodGroup, setBloodGroup] = useState(person?.bloodGroup ?? '');
  const [notes, setNotes] = useState(person?.notes ?? '');
  const [showPhone, setShowPhone] = useState(person?.showPhone ?? true);
  const [showAddress, setShowAddress] = useState(person?.showAddress ?? false);
  const [makeHead, setMakeHead] = useState(false);
  const [error, setError] = useState('');

  const { data: professions } = useQuery({ queryKey: ['professions'], queryFn: listProfessions });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!householdId) throw new Error('Please select a household');
      if (!fullName.trim()) throw new Error('Full name is required');
      const body: Record<string, unknown> = {
        fullName: fullName.trim(),
        relation,
        gender: gender || null,
        dob: dob || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        professionRaw: professionRaw.trim() || null,
        professionCatId: professionCatId || null,
        bloodGroup: bloodGroup.trim() || null,
        notes: notes.trim() || null,
        showPhone,
        showAddress,
      };
      if (editing) {
        if (householdId !== person!.householdId) body.householdId = householdId;
        return updatePerson(person!.id, body);
      }
      body.householdId = householdId;
      body.makeHead = makeHead || relation === 'SELF';
      return createPerson(body);
    },
    onSuccess: () => {
      toast.push(editing ? 'Member updated' : 'Member added', 'success');
      qc.invalidateQueries({ queryKey: ['persons'] });
      qc.invalidateQueries({ queryKey: ['household'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      onSaved?.();
      onClose();
    },
    onError: (e) => setError(errMsg(e)),
  });

  const professionOptions =
    professions?.categories.map((c) => ({
      value: c.id,
      label: c.nameGu ? `${c.name} (${c.nameGu})` : c.name,
    })) ?? [];

  return (
    <Modal
      title={editing ? `Edit member — ${person!.fullName}` : 'Add member'}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={() => {
              setError('');
              mutation.mutate();
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add member'}
          </button>
        </>
      }
    >
      {error && <div className="page-error">{error}</div>}

      <Field label="Household" hint={fixedHousehold ? undefined : 'Which household does this member belong to?'}>
        {fixedHousehold ? (
          <div className="check">
            🏠 <strong>{fixedHousehold.label}</strong>
          </div>
        ) : (
          <HouseholdPicker
            value={householdId}
            label={householdLabel}
            onChange={(id, label) => {
              setHouseholdId(id);
              setHouseholdLabel(label);
            }}
          />
        )}
      </Field>

      <Field label="Full name (Gujarati)">
        <Input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="પૂરું નામ"
          autoFocus
        />
      </Field>

      <div className="row3">
        <Field label="Relation">
          <Select
            value={relation}
            onChange={(e) => setRelation(e.target.value as Relation)}
            options={RELATION_OPTIONS}
          />
        </Field>
        <Field label="Gender">
          <Select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            options={GENDER_OPTIONS}
            placeholder="—"
          />
        </Field>
        <Field label="Date of birth">
          <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        </Field>
      </div>

      <div className="row2">
        <Field label="Phone" hint="10-digit; normalized automatically">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9XXXXXXXXX" />
        </Field>
        <Field label="Email" hint="Used for OTP login (optional)">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" />
        </Field>
      </div>

      <div className="row2">
        <Field label="Profession (raw text)" hint="Original wording; auto-maps to a category">
          <Input
            value={professionRaw}
            onChange={(e) => setProfessionRaw(e.target.value)}
            placeholder="શિક્ષક / Doctor / Business…"
          />
        </Field>
        <Field label="Profession category" hint="Override the auto-mapped category">
          <Select
            value={professionCatId}
            onChange={(e) => setProfessionCatId(e.target.value)}
            options={professionOptions}
            placeholder="Auto / none"
          />
        </Field>
      </div>

      <div className="row2">
        <Field label="Blood group">
          <Input
            value={bloodGroup}
            onChange={(e) => setBloodGroup(e.target.value)}
            placeholder="O+ / B+ / AB-"
          />
        </Field>
        <Field label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>

      <div className="row2" style={{ marginTop: 4 }}>
        <label className="check">
          <input type="checkbox" checked={showPhone} onChange={(e) => setShowPhone(e.target.checked)} />
          Phone visible to members
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={showAddress}
            onChange={(e) => setShowAddress(e.target.checked)}
          />
          Address visible to members
        </label>
      </div>

      {!editing && (
        <label className="check" style={{ marginTop: 10 }}>
          <input type="checkbox" checked={makeHead} onChange={(e) => setMakeHead(e.target.checked)} />
          Make this person the household head
        </label>
      )}
    </Modal>
  );
}
