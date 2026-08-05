import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listInstruments, getMyOrganizations } from '@regieart/api';
import type { Instrument, InstrumentStatus } from '@regieart/types';
import p from '../../../shared/layout/page.module.scss';

const EMOJI: Record<string, string> = { BRASS:'🎺', WOODWIND:'🎷', STRING:'🎸', KEYBOARD:'🎹', PERCUSSION:'🥁', AUDIO_GEAR:'🎛️', LIGHTING:'💡', OTHER:'🎵' };
const STATUS_CLASS = (st: InstrumentStatus, p: Record<string,string>) => st==='AVAILABLE' ? p.chipOk : st==='IN_USE' ? p.chipBrand : p.chipError;

export function BacklinePage() {
  const { t } = useTranslation();
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [filter, setFilter] = useState<InstrumentStatus|'ALL'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyOrganizations().then((orgs) => {
      const orgId = orgs[0]?.id;
      if (!orgId) { setLoading(false); return; }
      return listInstruments({ orgId });
    }).then((res) => { if (res) setInstruments(res); }).finally(() => setLoading(false));
  }, []);

  const shown = filter === 'ALL' ? instruments : instruments.filter((i) => i.status === filter);

  return (
    <div className={p.page}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 className={p.pageTitle}>{t('nav.backline')}</h1>
          <p className={p.pageSubtitle}>{instruments.length} items</p>
        </div>
        <Link to="/inventory/scanner" className={p.btnSecondary}>📷 QR Scan</Link>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {(['ALL','AVAILABLE','IN_USE','MAINTENANCE'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ background: filter===f ? 'var(--action-brand)':'var(--surface-raised)', color: filter===f ? '#fff':'var(--text-body)', border:'none', borderRadius:8, padding:'7px 14px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            {f}
          </button>
        ))}
      </div>

      {loading ? <div className={p.spinner} /> : (
        <div className={p.card}>
          <table className={p.table}>
            <thead><tr>
              <th className={p.th}>Instrument</th>
              <th className={p.th}>Type</th>
              <th className={p.th}>Brand / Model</th>
              <th className={p.th}>Status</th>
            </tr></thead>
            <tbody>
              {shown.map((i) => (
                <tr key={i.id} className={p.tr}>
                  <td className={p.td}>{EMOJI[i.type] ?? '🎵'} {i.name}</td>
                  <td className={p.td}>{i.type}</td>
                  <td className={p.td}>{[i.brand, i.model].filter(Boolean).join(' / ') || '—'}</td>
                  <td className={p.td}><span className={`${p.chip} ${STATUS_CLASS(i.status, p)}`}>{i.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length===0 && <div className={p.empty}><div className={p.emptyTitle}>{t('common.no_results')}</div></div>}
        </div>
      )}
    </div>
  );
}
