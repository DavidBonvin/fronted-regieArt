import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createEntry, listCategories, getMyOrganizations, listEvents } from '@regieart/api';
import type { Event, FinanceCategory } from '@regieart/types';
import p from '../../../shared/layout/page.module.scss';
import s from './ReceiptCapturePage.module.scss';
import { getActiveOrganization } from '../../../shared/utils/activeOrganization';

const CURRENCIES = ['EUR','USD','GBP','ARS','MXN','CLP','COP'];

const CATEGORY_META: Record<string, { icon: string; label: string }> = {
  travel: { icon: '🚗', label: 'Transporte' },
  transporte: { icon: '🚗', label: 'Transporte' },
  accommodation: { icon: '🛏️', label: 'Alojamiento' },
  alojamiento: { icon: '🛏️', label: 'Alojamiento' },
  food: { icon: '🍽️', label: 'Comida' },
  comida: { icon: '🍽️', label: 'Comida' },
  equipment: { icon: '🎛️', label: 'Equipamiento' },
  equipamiento: { icon: '🎛️', label: 'Equipamiento' },
  marketing: { icon: '📣', label: 'Marketing' },
  fees: { icon: '🧾', label: 'Honorarios' },
  honorarios: { icon: '🧾', label: 'Honorarios' },
  other: { icon: '📦', label: 'Otros' },
  otros: { icon: '📦', label: 'Otros' },
};

function categoryMeta(category: FinanceCategory) {
  return CATEGORY_META[category.name.trim().toLowerCase()] ?? {
    icon: category.icon || '🏷️',
    label: category.name,
  };
}

function eventIcon(type: Event['type']) {
  return { CONCERT: '🎤', REHEARSAL: '🎸', AUDITION: '🎼', TOUR_DATE: '🚌', RECORDING_SESSION: '🎙️' }[type] ?? '📅';
}

export function ReceiptCapturePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [orgId, setOrgId] = useState('');
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [form, setForm] = useState({ type:'EXPENSE', amount:'', currency:'EUR', categoryId:'', eventId:'', description:'', date: new Date().toISOString().slice(0,10) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyOrganizations().then((orgs) => {
      const id = getActiveOrganization(orgs)?.id;
      if (!id) return;
      setOrgId(id);
      Promise.all([listCategories(id), listEvents({ orgId: id, limit: 100 })]).then(([items, eventResult]) => {
        setCategories(items);
        setEvents(eventResult.events);
        if (items[0]) setForm((prev) => ({ ...prev, categoryId: items[0].id }));
      });
    });
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  async function handleSave() {
    if (!form.amount || !orgId) { setError(t('errors.required_fields')); return; }
    if (!Number.isFinite(parseFloat(form.amount))) { setError(t('errors.invalid_amount')); return; }
    setSaving(true);
    setError('');
    try {
      await createEntry({
        orgId,
        eventId: form.eventId || undefined,
        type: form.type as 'EXPENSE'|'INCOME',
        amount: form.amount,
        currency: form.currency,
        categoryId: form.categoryId || undefined,
        description: form.description || undefined,
        date: form.date,
      } as any);
      navigate('/finance');
    } catch { setError(t('errors.generic')); }
    finally { setSaving(false); }
  }

  return (
    <div className={p.page}>
      <h1 className={p.pageTitle}>{t('finance_form.add_title')}</h1>

      <div className={`${p.card} ${s.form}`}>
        <div className={s.typeToggle}>
          {(['EXPENSE','INCOME'] as const).map((tp) => (
            <button key={tp} className={`${s.typeBtn} ${form.type===tp ? s.active : ''}`} onClick={() => setForm((f) => ({ ...f, type: tp }))}>{tp}</button>
          ))}
        </div>

        <div className={s.row2}>
          <label className={s.label}>{t('finance_form.amount_label')}
            <input className={s.input} type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')} />
          </label>
          <label className={s.label}>{t('finance_form.currency_label')}
            <select className={s.select} value={form.currency} onChange={set('currency')}>
              {CURRENCIES.map((c) => <option className={s.option} key={c}>{c}</option>)}
            </select>
          </label>
        </div>

        <div className={s.label}>
          <span>{t('finance_form.category_label')}</span>
          {categories.length > 0 ? (
            <div className={s.categoryGrid} role="radiogroup" aria-label={t('finance_form.category_label')}>
              {categories.map((category) => {
                const meta = categoryMeta(category);
                const selected = form.categoryId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    className={`${s.categoryOption} ${selected ? s.categoryOptionSelected : ''}`}
                    onClick={() => setForm((prev) => ({ ...prev, categoryId: category.id }))}
                    aria-pressed={selected}
                  >
                    <span className={s.categoryIcon}>{meta.icon}</span>
                    <span className={s.categoryName}>{meta.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <span className={s.categoryEmpty}>No hay categorías disponibles para esta organización.</span>
          )}
        </div>

        <label className={s.label}>{'Asignar a'}
          <select className={s.select} value={form.eventId} onChange={set('eventId')}>
            <option className={s.option} value="">🏢 Finanzas generales de la organización</option>
            {events.map((event) => <option className={s.option} key={event.id} value={event.id}>{eventIcon(event.type)} {event.title}</option>)}
          </select>
        </label>

        <label className={s.label}>{t('finance_form.description_label')}
          <input className={s.input} value={form.description} onChange={set('description')} />
        </label>

        <label className={s.label}>{t('finance_form.date_label')}
          <input className={s.input} type="date" value={form.date} onChange={set('date')} />
        </label>

        {error && <div style={{ color:'var(--status-error)', fontSize:13 }}>{error}</div>}

        <div className={s.actions}>
          <button className={p.btnSecondary} onClick={() => navigate(-1)}>{t('common.cancel')}</button>
          <button className={p.btnPrimary} onClick={handleSave} disabled={saving}>{saving ? t('common.saving') : t('common.save')}</button>
        </div>
      </div>
    </div>
  );
}