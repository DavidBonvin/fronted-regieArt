import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listInstruments, getMyOrganizations } from '@regieart/api';
import type { Instrument } from '@regieart/types';
import p from '../../../shared/layout/page.module.scss';
import s from './QRScannerPage.module.scss';
import { getActiveOrganization } from '../../../shared/utils/activeOrganization';

export function QRScannerPage() {
  const { t } = useTranslation();
  const [serial, setSerial] = useState('');
  const [result, setResult] = useState<Instrument|null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    if (!serial.trim()) return;
    setLoading(true);
    setNotFound(false);
    setResult(null);
    try {
      const orgs = await getMyOrganizations();
      const orgId = getActiveOrganization(orgs)?.id;
      if (!orgId) return;
      const items = await listInstruments({ orgId });
      const found = items.find((i) => i.serialNumber === serial.trim());
      found ? setResult(found) : setNotFound(true);
    } finally { setLoading(false); }
  }

  return (
    <div className={p.page}>
      <h1 className={p.pageTitle}>{t('qr_scanner.screen_title')}</h1>

      <div className={s.viewfinder}>
        <div className={s.frame}>
          <div className={s.corner + ' ' + s.tl} />
          <div className={s.corner + ' ' + s.tr} />
          <div className={s.corner + ' ' + s.bl} />
          <div className={s.corner + ' ' + s.br} />
          <div className={s.scanLine} />
        </div>
        <p className={s.hint}>{t('qr_scanner.camera_hint')}</p>
      </div>

      <div className={s.manualRow}>
        <input
          className={s.input}
          placeholder={t('qr_scanner.serial_placeholder')}
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className={p.btnPrimary} onClick={handleSearch} disabled={loading}>{t('qr_scanner.lookup_btn')}</button>
      </div>

      {loading && <div className={p.spinner} />}
      {notFound && <div className={p.empty}><div className={p.emptyTitle}>{t('qr_scanner.not_found')}</div></div>}
      {result && (
        <div className={p.card} style={{ marginTop:16 }}>
          <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>{result.name}</div>
          <div style={{ color:'var(--text-secondary)', fontSize:13 }}>{result.brand} {result.model}</div>
          <div style={{ marginTop:12 }}><span className={`${p.chip} ${p.chipOk}`}>{result.status}</span></div>
        </div>
      )}
    </div>
  );
}