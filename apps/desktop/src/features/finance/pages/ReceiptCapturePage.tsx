import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createEntry, listCategories, getMyOrganizations } from '@regieart/api';
import type { FinanceCategory } from '@regieart/types';
import p from '../../../shared/layout/page.module.scss';
import s from './ReceiptCapturePage.module.scss';

const CURRENCIES = ['EUR','USD','GBP','ARS','MXN','CLP','COP'];

export function ReceiptCapturePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [orgId, setOrgId] = useState('');
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [form, setForm] = useState({ type:'EXPENSE', amount:'', currency:'EUR', categoryId:'', description:'', date: new Date().toISOString().slice(0,10) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyOrganizations().then((orgs) => {
      const id = orgs[0]?.id;
      if (!id) return;
      setOrgId(id);
      listCategories(id).then(setCategories);
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
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>

        <label className={s.label}>{t('finance_form.category_label')}
          <select className={s.select} value={form.categoryId} onChange={set('categoryId')}>
            <option value="">{t('common.none')}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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