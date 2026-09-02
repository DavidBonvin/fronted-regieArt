import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listEntries, getMyOrganizations, listEvents } from '@regieart/api';
import type { Event, FinanceEntry, Organization } from '@regieart/types';
import p from '../../../shared/layout/page.module.scss';
import s from './FinancePage.module.scss';
import { getActiveOrganization } from '../../../shared/utils/activeOrganization';
import { useActiveOrganizationId } from '../../../shared/utils/useActiveOrganizationId';

export function FinancePage() {
  const { t } = useTranslation();
  const activeOrgId = useActiveOrganizationId();
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedScope, setSelectedScope] = useState<'general' | string>('general');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      setLoading(true);
      setSelectedScope('general');
      getMyOrganizations().then(async (orgs) => {
        const active = getActiveOrganization(orgs);
        if (!active) return;
        setOrganization(active);
        const [entriesRes, eventsRes] = await Promise.all([
          listEntries({ orgId: active.id, limit: 200 }),
          listEvents({ orgId: active.id, limit: 100 }),
        ]);
        setEntries(entriesRes.entries);
        setEvents(eventsRes.events);
      }).finally(() => setLoading(false));
  }, [activeOrgId]);

    const visibleEntries = selectedScope === 'general'
      ? entries.filter((entry) => !entry.eventId)
      : entries.filter((entry) => entry.eventId === selectedScope);
    function totalsByCurrency(entriesToTotal: FinanceEntry[], type?: FinanceEntry['type']) {
      const totals = new Map<string, number>();
      entriesToTotal.filter((entry) => !type || entry.type === type).forEach((entry) => {
        totals.set(entry.currency, (totals.get(entry.currency) ?? 0) + parseFloat(entry.amount));
      });
      return totals;
    }

    function formatTotals(totals: Map<string, number>, signed = false) {
      if (totals.size === 0) return '0';
      return [...totals.entries()]
        .map(([currency, total]) => `${signed && total >= 0 ? '+' : ''}${total.toFixed(2)} ${currency}`)
        .join(' · ');
    }

    const income = totalsByCurrency(visibleEntries, 'INCOME');
    const expense = totalsByCurrency(visibleEntries, 'EXPENSE');
    const balance = new Map<string, number>();
    new Set([...income.keys(), ...expense.keys()]).forEach((currency) => {
      balance.set(currency, (income.get(currency) ?? 0) - (expense.get(currency) ?? 0));
    });

    const eventTotals = new Map<string, Map<string, number>>();
    entries.filter((entry) => entry.eventId).forEach((entry) => {
      const totals = eventTotals.get(entry.eventId!) ?? new Map<string, number>();
      totals.set(entry.currency, (totals.get(entry.currency) ?? 0) + (entry.type === 'INCOME' ? 1 : -1) * parseFloat(entry.amount));
      eventTotals.set(entry.eventId!, totals);
    });

    function eventIcon(type: Event['type']) {
      return { CONCERT: '🎤', REHEARSAL: '🎸', AUDITION: '🎼', TOUR_DATE: '🚌', RECORDING_SESSION: '🎙️' }[type] ?? '📅';
    }

    function formatEventTotals(eventId: string) {
      const totals = eventTotals.get(eventId);
      if (!totals || totals.size === 0) return 'Sin movimientos';
      return [...totals.entries()].map(([currency, total]) => `${total >= 0 ? '+' : ''}${total.toFixed(2)} ${currency}`).join(' · ');
    }

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

      <div className={s.financeScopes} aria-label="Seleccionar ámbito financiero">
        <button
          type="button"
          className={`${s.financeScope} ${selectedScope === 'general' ? s.financeScopeActive : ''}`}
          onClick={() => setSelectedScope('general')}
        >
          <span className={s.financeScopeIcon}>🏢</span>
          <span><strong>{organization?.name ?? 'Organización'}</strong><small>Finanzas generales</small></span>
        </button>
        {events.map((event) => (
          <button
            type="button"
            key={event.id}
            className={`${s.financeScope} ${selectedScope === event.id ? s.financeScopeActive : ''}`}
            onClick={() => setSelectedScope(event.id)}
          >
            <span className={s.financeScopeIcon}>{eventIcon(event.type)}</span>
            <span><strong>{event.title}</strong><small>{formatEventTotals(event.id)}</small></span>
          </button>
        ))}
      </div>

      <div className={`${p.grid3} ${s.statsRow}`}>
        <div className={p.statCard}>
          <div className={p.statLabel}>{t('finance.income_label')}</div>
          <div className={`${p.statValue} ${s.income}`}>{formatTotals(income)}</div>
        </div>
        <div className={p.statCard}>
          <div className={p.statLabel}>{t('finance.expenses_label')}</div>
          <div className={`${p.statValue} ${s.expense}`}>{formatTotals(expense)}</div>
        </div>
        <div className={p.statCard}>
          <div className={p.statLabel}>{t('finance.balance_label')}</div>
          <div className={`${p.statValue} ${[...balance.values()].every((value) => value >= 0) ? s.income : s.expense}`}>
            {formatTotals(balance, true)}
          </div>
        </div>
      </div>

      {loading ? <div className={p.spinner} /> : (
        <div className={`${p.card} ${s.tableCard}`}>
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
              {visibleEntries.map((e) => (
                <tr key={e.id} className={p.tr}>
                  <td className={p.td} data-label={t('finance.date_label')}>{new Date(e.date).toLocaleDateString()}</td>
                  <td className={p.td} data-label={t('finance.description_label')}>{e.description ?? e.category?.name ?? '—'}</td>
                  <td className={p.td} data-label={t('finance.type_label')}>
                    <span className={`${p.chip} ${e.type === 'INCOME' ? p.chipOk : p.chipNeutral}`}>
                      {e.type}
                    </span>
                  </td>
                  <td className={`${p.td} ${e.type === 'INCOME' ? s.income : s.expense}`} data-label={t('finance.amount_label')}>
                    {e.type === 'INCOME' ? '+' : '−'}{parseFloat(e.amount).toFixed(2)} {e.currency}
                  </td>
                  <td className={p.td} data-label={t('finance.status_label')}>
                    <span className={`${p.chip} ${statusClass(e.status)}`}>{e.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleEntries.length === 0 && <div className={p.empty}><div className={p.emptyTitle}>{t('common.no_results')}</div></div>}
        </div>
      )}
    </div>
  );
}
