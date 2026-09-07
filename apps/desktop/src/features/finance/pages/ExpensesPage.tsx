import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { listEntries, getMyOrganizations } from '@regieart/api';
import type { FinanceEntry } from '@regieart/types';
import p from '../../../shared/layout/page.module.scss';
import { getActiveOrganization } from '../../../shared/utils/activeOrganization';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvé',
  REJECTED: 'Refusé',
};

export function ExpensesPage() {
  const { daysheetId } = useParams<{ daysheetId: string }>();
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyOrganizations().then((orgs) => {
      const orgId = getActiveOrganization(orgs)?.id;
      if (!orgId) { setLoading(false); return; }
      return listEntries({ orgId, eventId: daysheetId });
    }).then((res) => { if (res) setEntries(res.entries); }).finally(() => setLoading(false));
  }, [daysheetId]);

  const total = entries.reduce((n, e) => e.type==='EXPENSE' ? n + parseFloat(e.amount) : n - parseFloat(e.amount), 0);

  return (
    <div className={p.page}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <h1 className={p.pageTitle}>Dépenses</h1>
        <Link to="/finance/receipt" className={p.btnPrimary}>+ Ajouter une écriture</Link>
      </div>

      <div className={p.statCard} style={{ marginBottom:20 }}>
        <div className={p.statLabel}>Solde</div>
        <div className={p.statValue} style={{ color: total>0 ? 'var(--status-error)' : 'var(--status-ok)' }}>{total.toFixed(2)}</div>
      </div>

      {loading ? <div className={p.spinner} /> : (
        <div className={p.card}>
          <table className={p.table}>
            <thead><tr>
              <th className={p.th}>Date</th>
              <th className={p.th}>Description</th>
              <th className={p.th}>Montant</th>
              <th className={p.th}>Statut</th>
            </tr></thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className={p.tr}>
                  <td className={p.td}>{new Date(e.date).toLocaleDateString('fr-FR')}</td>
                  <td className={p.td}>{e.description ?? e.category?.name ?? '—'}</td>
                  <td className={p.td} style={{ color: e.type==='INCOME'?'var(--status-ok)':'var(--status-error)' }}>
                    {e.type==='INCOME'?'+':'−'}{parseFloat(e.amount).toFixed(2)} {e.currency}
                  </td>
                  <td className={p.td}>
                    <span className={`${p.chip} ${e.status==='APPROVED'?p.chipOk:e.status==='REJECTED'?p.chipError:p.chipPending}`}>{STATUS_LABEL[e.status] ?? e.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {entries.length===0 && <div className={p.empty}><div className={p.emptyTitle}>Aucun résultat</div></div>}
        </div>
      )}
    </div>
  );
}