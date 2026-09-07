import React, { useState } from 'react';
import { listInstruments, getMyOrganizations } from '@regieart/api';
import type { Instrument } from '@regieart/types';
import p from '../../../shared/layout/page.module.scss';
import s from './QRScannerPage.module.scss';
import { getActiveOrganization } from '../../../shared/utils/activeOrganization';

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'Disponible', IN_USE: 'En cours d’utilisation', MAINTENANCE: 'En maintenance',
};

export function QRScannerPage() {
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
      <h1 className={p.pageTitle}>Scanner QR</h1>

      <div className={s.viewfinder}>
        <div className={s.frame}>
          <div className={s.corner + ' ' + s.tl} />
          <div className={s.corner + ' ' + s.tr} />
          <div className={s.corner + ' ' + s.bl} />
          <div className={s.corner + ' ' + s.br} />
          <div className={s.scanLine} />
        </div>
        <p className={s.hint}>Placez le code QR dans le cadre pour le scanner.</p>
      </div>

      <div className={s.manualRow}>
        <input
          className={s.input}
          placeholder="Numéro de série"
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className={p.btnPrimary} onClick={handleSearch} disabled={loading}>Rechercher</button>
      </div>

      {loading && <div className={p.spinner} />}
      {notFound && <div className={p.empty}><div className={p.emptyTitle}>Aucun équipement trouvé</div></div>}
      {result && (
        <div className={p.card} style={{ marginTop:16 }}>
          <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>{result.name}</div>
          <div style={{ color:'var(--text-secondary)', fontSize:13 }}>{result.brand} {result.model}</div>
          <div style={{ marginTop:12 }}><span className={`${p.chip} ${p.chipOk}`}>{STATUS_LABEL[result.status] ?? result.status}</span></div>
        </div>
      )}
    </div>
  );
}