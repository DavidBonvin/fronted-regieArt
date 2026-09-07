import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getEventAssignments, getMyOrganizations } from '@regieart/api';
import type { InstrumentAssignment } from '@regieart/types';
import p from '../../../shared/layout/page.module.scss';
import s from './ChecklistPage.module.scss';
import { getActiveOrganization } from '../../../shared/utils/activeOrganization';

export function ChecklistPage() {
  const { daysheetId } = useParams<{ daysheetId: string }>();
  const [assignments, setAssignments] = useState<InstrumentAssignment[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!daysheetId) return;
    getMyOrganizations().then((orgs) => {
      const orgId = getActiveOrganization(orgs)?.id;
      if (!orgId) { setLoading(false); return; }
      return getEventAssignments({ orgId, eventId: daysheetId });
    }).then((a) => { if (a) setAssignments(a); }).finally(() => setLoading(false));
  }, [daysheetId]);

  const progress = assignments.length ? Math.round(checked.size / assignments.length * 100) : 0;

  return (
    <div className={p.page}>
      <h1 className={p.pageTitle}>Checklist du matériel</h1>

      <div className={s.progressBar}>
        <div className={s.progressFill} style={{ width: `${progress}%` }} />
      </div>
      <div className={s.progressLabel}>{checked.size}/{assignments.length} — {progress}%</div>

      {loading ? <div className={p.spinner} /> : assignments.length === 0 ? (
        <div className={p.empty}><div className={p.emptyTitle}>Aucun résultat</div></div>
      ) : (
        <div className={p.card}>
          {assignments.map((a) => {
            const done = checked.has(a.id);
            return (
              <div key={a.id} className={`${s.row} ${done ? s.done : ''}`} onClick={() => setChecked((prev) => { const n = new Set(prev); done ? n.delete(a.id) : n.add(a.id); return n; })}>
                <div className={`${s.check} ${done ? s.checked : ''}`}>{done && '✓'}</div>
                <div className={s.item}>{a.instrument?.name ?? 'Élément inconnu'}</div>
                <div className={s.assignee}>{a.user?.displayName ?? ''}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}