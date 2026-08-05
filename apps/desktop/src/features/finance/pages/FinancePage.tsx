import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listEntries, getMyOrganizations } from '@regieart/api';
import type { FinanceEntry } from '@regieart/types';
import p from '../../../shared/layout/page.module.scss';
import s from './FinancePage.module.scss';

export function FinancePage() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyOrganizations().then((orgs) => {
      const orgId = orgs[0]?.id;
      if (!orgId) { setLoading(false); return; }
      return listEntries({ orgId, limit: 50 });
    }).then((res) => {
      if (res) setEntries(res.entries);
    }).finally(() => setLoading(false));
  }, []);

  const income = entries.filter((e) => e.type === 'INCOME').reduce((n, e) => n + parseFloat(e.amount), 0);
  const expense = entries.filter((e) => e.type === 'EXPENSE').reduce((n, e) => n + parseFloat(e.amount), 0);
  const balance = income - expense;

  const statusClass = (st: string) =>
    st === 'APPROVED' ? p.chipOk : st === 'REJECTED' ? p.chipError : p.chipPending;

  return (
    <div className={p.page}>
      <div className={`${p.pageHeader} ${s.header}`}>
        <div>
          <h1 className={p.pageTitle}>{t('nav.finance')}</h1>
        </div>
        <Link to="/finance/receipt" className={p.btnPrimary}>+ {t('finance_form.add_title')}</Link>
      </div>

      <div className={`${p.grid3} ${s.statsRow}`}>
        <div className={p.statCard}>
          <div className={p.statLabel}>{t('finance.income_label')}</div>
          <div className={`${p.statValue} ${s.income}`}>{income.toFixed(2)}</div>
        </div>
        <div className={p.statCard}>
          <div className={p.statLabel}>{t('finance.expenses_label')}</div>
          <div className={`${p.statValue} ${s.expense}`}>{expense.toFixed(2)}</div>
        </div>
        <div className={p.statCard}>
          <div className={p.statLabel}>{t('finance.balance_label')}</div>
          <div className={`${p.statValue} ${balance >= 0 ? s.income : s.expense}`}>
            {balance >= 0 ? '+' : ''}{balance.toFixed(2)}
          </div>
        </div>
      </div>

      {loading ? <div className={p.spinner} /> : (
        <div className={p.card}>
          <table className={p.table}>
            <thead>
              <tr>
                <th className={p.th}>{t('finance.date_label')}</th>
                <th className={p.th}>{t('finance.description_label')}</th>
                <th className={p.th}>{t('finance.type_label')}</th>
                <th className={p.th}>{t('finance.amount_label')}</th>
                <th className={p.th}>{t('finance.status_label')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className={p.tr}>
                  <td className={p.td}>{new Date(e.date).toLocaleDateString()}</td>
                  <td className={p.td}>{e.description ?? e.category?.name ?? '—'}</td>
                  <td className={p.td}>
                    <span className={`${p.chip} ${e.type === 'INCOME' ? p.chipOk : p.chipNeutral}`}>
                      {e.type}
                    </span>
                  </td>
                  <td className={`${p.td} ${e.type === 'INCOME' ? s.income : s.expense}`}>
                    {e.type === 'INCOME' ? '+' : '−'}{parseFloat(e.amount).toFixed(2)} {e.currency}
                  </td>
                  <td className={p.td}>
                    <span className={`${p.chip} ${statusClass(e.status)}`}>{e.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {entries.length === 0 && <div className={p.empty}><div className={p.emptyTitle}>{t('common.no_results')}</div></div>}
        </div>
      )}
    </div>
  );
}
