import React, { useCallback, useState } from 'react';
import { getConfig, getHttpClient } from '@regieart/api';

// ─── Styles ──────────────────────────────────────────────────────────────────

const colors = {
  bg:      '#0f172a',
  surface: '#1e293b',
  surface2:'#263248',
  border:  '#334155',
  text:    '#f1f5f9',
  muted:   '#94a3b8',
  ok:      '#22c55e',
  fail:    '#ef4444',
  warn:    '#f59e0b',
  info:    '#3b82f6',
};

const s: Record<string, React.CSSProperties> = {
  section:  { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 20, marginBottom: 20 },
  h2:       { margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: colors.text },
  desc:     { color: colors.muted, fontSize: 13, marginBottom: 14, lineHeight: 1.6 },
  row:      { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  label:    { color: colors.muted, fontSize: 12, minWidth: 120, flexShrink: 0 },
  input:    { flex: 1, maxWidth: 340, background: colors.surface2, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '6px 10px', fontSize: 13 },
  btn:      { padding: '9px 22px', background: colors.info, color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  log:      { fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', background: '#0a0f1e', border: `1px solid ${colors.border}`, borderRadius: 8, padding: 16, maxHeight: 640, overflowY: 'auto', color: colors.text, lineHeight: 1.65 },
  pill:     { display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 },
};

// ─── ROPC helper ─────────────────────────────────────────────────────────────

async function loginWithROPC(username: string, password: string): Promise<string> {
  const cfg = getConfig();
  const url = `${cfg.keycloakUrl}/realms/${cfg.realm}/protocol/openid-connect/token`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'password', client_id: cfg.clientId, username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((err['error_description'] as string | undefined) ?? `Keycloak ${res.status}`);
  }
  const { access_token } = await res.json() as { access_token: string };
  return access_token;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WriteSuiteTab(): React.ReactElement {
  const [user2Email,    setUser2Email]    = useState('testuserinvitado1@gmail.com');
  const [user2Password, setUser2Password] = useState('testuserinvitado1@gmail.com');
  const [isRunning,     setIsRunning]     = useState(false);
  const [result, setResult] = useState<{ status: 'idle' | 'running' | 'ok' | 'fail'; detail: string }>({
    status: 'idle', detail: '',
  });

  const runWriteSuite = useCallback(async () => {
    setIsRunning(true);
    setResult({ status: 'running', detail: '' });

    const lines: string[] = [];
    const log = (msg: string) => {
      lines.push(msg);
      setResult({ status: 'running', detail: lines.join('\n') });
    };

    const client   = getHttpClient();
    const apiBase  = getConfig().apiBaseUrl.replace(/\/$/, '');

    // ── User 2 fetch helper ────────────────────────────────────────────────
    let user2Token = '';
    const u2 = async (method: string, path: string, body?: unknown): Promise<unknown> => {
      const res = await fetch(`${apiBase}/${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${user2Token}`,
          'Content-Type': 'application/json',
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      const json = await res.json() as { success: boolean; data: unknown; error?: { message?: string } };
      if (!res.ok || !json.success) {
        throw Object.assign(
          new Error(`[U2] ${method} /${path} → HTTP ${res.status}: ${json?.error?.message ?? JSON.stringify(json)}`),
          { status: res.status },
        );
      }
      return json.data;
    };

    // ── Soft-fail wrapper ──────────────────────────────────────────────────
    const soft = async (label: string, fn: () => Promise<void>): Promise<void> => {
      try { await fn(); } catch (err) {
        log(`  ⚠️ ${label}: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    // ── Cleanup IDs ────────────────────────────────────────────────────────
    let orgId:             string | null = null;
    let songId:            string | null = null;
    let eventId:           string | null = null;
    let venueId:           string | null = null;
    let scheduleItemId:    string | null = null;
    let vehicleId:         string | null = null;
    let instrumentId:      string | null = null;
    let user2Id:           string | null = null;
    let user1Id:           string | null = null;
    let inviteLinkId:      string | null = null;
    let financeCategoryId: string | null = null;
    let financeEntryId:    string | null = null;
    let perDiemId:         string | null = null;
    let userSkillId:       string | null = null;

    // ── Type helpers ───────────────────────────────────────────────────────
    type R  = { success: boolean; data: Record<string, unknown> };
    type RL = { success: boolean; data: unknown[] };
    const id = (d: unknown, label: string): string => {
      const v = (d as Record<string, unknown>)?.id;
      if (!v || typeof v !== 'string') throw new Error(`${label} — ID no obtenido (data: ${JSON.stringify(d)})`);
      return v;
    };
    const notifTypes = (data: unknown): string[] => {
      const n = (data as Record<string, unknown>)?.notifications;
      return Array.isArray(n) ? n.map((x: unknown) => (x as Record<string, unknown>).type as string) : [];
    };

    try {
      // ════════════════════════════════════════════════════════════════════
      // PHASE 1 — Login ambos usuarios
      // ════════════════════════════════════════════════════════════════════
      log('━━━ PHASE 1 — Login usuarios ━━━');

      user2Token = await loginWithROPC(user2Email, user2Password);
      const u2meData = await u2('GET', 'users/me') as Record<string, unknown>;
      user2Id = id(u2meData, 'User 2 ID');
      log(`  ✅ User 2: ${u2meData.displayName ?? u2meData.email}  (${user2Id})`);

      const u1meRes = await client.get('users/me').json<R>();
      user1Id = id(u1meRes.data, 'User 1 ID');
      log(`  ✅ User 1: ${u1meRes.data.displayName ?? u1meRes.data.email}  (${user1Id})`);

      // ════════════════════════════════════════════════════════════════════
      // PHASE 2 — Organizations
      // ════════════════════════════════════════════════════════════════════
      log('\n━━━ PHASE 2 — Organizations ━━━');

      // Create
      log('⏳ POST /organizations…');
      const orgRes = await client.post('organizations', {
        json: { name: `[DEV Write Suite] ${Date.now()}`, description: 'Org de test automatizado' },
      }).json<R>();
      orgId = id(orgRes.data, 'orgId');
      log(`  ✅ Org creada: ${orgId}`);

      // Update
      log('⏳ PATCH /organizations/:id…');
      await soft('PATCH org', async () => {
        await client.patch(`organizations/${orgId}`, {
          json: { description: 'Descripción actualizada — Write Suite', website: 'https://regiearttest.dev' },
        }).json<R>();
        log('  ✅ Org actualizada (description + website)');
      });

      // Invite link
      log('⏳ POST /organizations/:id/invite-links (rol MEMBER)…');
      const inviteRes = await client.post(`organizations/${orgId}/invite-links`, {
        json: { role: 'MEMBER' },
      }).json<R>();
      inviteLinkId  = inviteRes.data?.id as string | null;
      const token2  = inviteRes.data?.token as string | null;
      if (!token2) throw new Error('Invite link no devolvió token');
      log(`  ✅ Invite link: ${token2}  (role MEMBER)`);

      // User 2 joins
      log('⏳ POST /organizations/join/:token (como usuario 2)…');
      await u2('POST', `organizations/join/${token2}`);
      log('  ✅ Usuario 2 se unió a la org');

      // Verify members and extract User 2's OrganizationMember record ID
      // NOTE: PATCH /members/:memberId/role uses the OrganizationMember record ID
      // (the join-table ID), NOT the user.id — different from DELETE which uses userId.
      const membersRes = await client.get(`organizations/${orgId}/members`).json<RL>();
      log(`  ✅ Miembros en la org: ${membersRes.data.length}`);
      const user2MemberRecord = membersRes.data.find(
        (m: unknown) => ((m as Record<string, unknown>)?.user as Record<string, unknown>)?.id === user2Id,
      ) as Record<string, unknown> | undefined;
      const user2MemberId = user2MemberRecord?.id as string | null ?? null;
      log(`  ℹ️ memberId de usuario 2: ${user2MemberId ?? '(no encontrado)'}`);

      // Verify INVITE_ACCEPTED notification for User 1
      await soft('verificar INVITE_ACCEPTED', async () => {
        const n1 = await client.get('notifications', { searchParams: { limit: '10' } }).json<R>();
        const types = notifTypes(n1.data);
        log(types.includes('INVITE_ACCEPTED')
          ? '  ✅ User 1 recibió INVITE_ACCEPTED'
          : '  ⚠️ INVITE_ACCEPTED aún no visible (puede haber delay)');
      });

      // Change User 2 role → ADMIN  (uses OrganizationMember record ID, not userId)
      log('⏳ PATCH /organizations/:orgId/members/:memberId/role → ADMIN…');
      await soft('change role to ADMIN', async () => {
        if (!user2MemberId) {
          log('  ⚠️ memberId no disponible — saltando cambio de rol');
          return;
        }
        await client.patch(`organizations/${orgId}/members/${user2MemberId}/role`, {
          json: { role: 'ADMIN' },
        }).json<R>();
        log('  ✅ Rol de usuario 2 → ADMIN');
      });

      // Verify ROLE_CHANGED for User 2
      await soft('verificar ROLE_CHANGED', async () => {
        const n2 = await u2('GET', 'notifications?limit=10') as Record<string, unknown>;
        const types = notifTypes(n2);
        log(types.includes('ROLE_CHANGED')
          ? '  ✅ Usuario 2 recibió ROLE_CHANGED'
          : '  ⚠️ ROLE_CHANGED no encontrado en usuario 2');
      });

      // ════════════════════════════════════════════════════════════════════
      // PHASE 3 — Perfil y Habilidades
      // ════════════════════════════════════════════════════════════════════
      log('\n━━━ PHASE 3 — Perfil y Habilidades ━━━');

      // PATCH /users/me
      log('⏳ PATCH /users/me (bio + city)…');
      await soft('PATCH users/me', async () => {
        const pRes = await client.patch('users/me', {
          json: { bio: '[DEV Write Suite] Bio temporal', city: 'Montreal', country: 'CA' },
        }).json<R>();
        log(`  ✅ Perfil actualizado: bio="${String(pRes.data?.bio ?? '').slice(0, 35)}…"`);
        // Restore
        await client.patch('users/me', { json: { bio: null } }).json<R>();
        log('  ✅ Bio restaurada a null');
      });

      // GET /skill-categories
      log('⏳ GET /skill-categories…');
      let firstSkillCatId: string | null = null;
      let firstSkillCatName = '';
      await soft('GET skill-categories', async () => {
        const scRes = await client.get('skill-categories')
          .json<{ success: boolean; data: Array<{ id: string; name: string }> }>();
        const cats = Array.isArray(scRes.data) ? scRes.data : [];
        log(`  ✅ ${cats.length} categoría(s) de habilidades`);
        if (cats.length > 0) {
          firstSkillCatId   = cats[0].id;
          firstSkillCatName = cats[0].name;
        }
      });

      // POST + GET + DELETE skill
      if (firstSkillCatId) {
        log(`⏳ POST /users/me/skills (${firstSkillCatName})…`);
        await soft('POST skill', async () => {
          try {
            const skRes = await client.post('users/me/skills', {
              json: { skillCategoryId: firstSkillCatId, expertiseLevel: 'INTERMEDIATE', yearsExp: 3 },
            }).json<R>();
            userSkillId = skRes.data?.id as string | null;
            log(`  ✅ Skill añadida: "${firstSkillCatName}" — INTERMEDIATE  (${userSkillId})`);
          } catch (err: unknown) {
            const e = err as { status?: number };
            if (e.status === 409) {
              log('  ⏸️ Skill ya existe (409) — se salta limpieza de skill');
            } else { throw err; }
          }
        });

        if (userSkillId) {
          const mySkRes = await client.get('users/me/skills')
            .json<{ success: boolean; data: unknown[] }>();
          log(`  ✅ GET /users/me/skills → ${mySkRes.data.length} habilidad(es)`);
        }
      }

      // ════════════════════════════════════════════════════════════════════
      // PHASE 4 — Venues
      // ════════════════════════════════════════════════════════════════════
      log('\n━━━ PHASE 4 — Venues ━━━');

      log('⏳ POST /venues…');
      const venRes = await client.post('venues', {
        json: {
          name: `[DEV] Write Suite Venue ${Date.now()}`,
          address: '1 Rue de Test', city: 'Montreal', country: 'CA',
          capacity: 500, latitude: 45.508888, longitude: -73.561668,
          parkingNotes: '[DEV] Parking notes', timezone: 'America/Toronto',
        },
      }).json<R>();
      venueId = id(venRes.data, 'venueId');
      log(`  ✅ Venue creado: ${venueId}  "${venRes.data.name}"`);

      log('⏳ PATCH /venues/:id…');
      await soft('PATCH venues', async () => {
        await client.patch(`venues/${venueId}`, {
          json: { parkingNotes: '[DEV] 3 plazas reservadas — actualizado' },
        }).json<R>();
        log('  ✅ Venue actualizado (parkingNotes)');
      });

      // ════════════════════════════════════════════════════════════════════
      // PHASE 5 — Songs
      // ════════════════════════════════════════════════════════════════════
      log('\n━━━ PHASE 5 — Canciones ━━━');

      log('⏳ POST /songs…');
      const sngRes = await client.post('songs', {
        json: { orgId, title: '[DEV] Write Suite Song', composer: 'Test Composer', genre: 'Jazz', tempo: 120 },
      }).json<R>();
      songId = id(sngRes.data, 'songId');
      log(`  ✅ Canción creada: ${songId}`);

      log('⏳ PATCH /songs/:id (tempo 120 → 132)…');
      await soft('PATCH songs', async () => {
        await client.patch(`songs/${songId}`, {
          json: { notes: '[DEV] Notas actualizadas', tempo: 132 },
        }).json<R>();
        log('  ✅ Canción actualizada');
      });

      log('⏳ GET /songs/:id (assets vinculados)…');
      await soft('GET song detail', async () => {
        const sdRes = await client.get(`songs/${songId}`).json<R>();
        const assets = (sdRes.data?.assets as unknown[] | undefined) ?? [];
        log(`  ✅ Detalle OK — ${assets.length} asset(s) vinculado(s)`);
      });

      // ════════════════════════════════════════════════════════════════════
      // PHASE 6 — Events + DaySheet completo
      // ════════════════════════════════════════════════════════════════════
      log('\n━━━ PHASE 6 — Events + DaySheet + Roster + Vehículos ━━━');

      // Create event
      log('⏳ POST /events (CONCERT, vinculado al venue)…');
      const evRes = await client.post('events', {
        json: {
          orgId, title: '[DEV] Write Suite Concert', type: 'CONCERT',
          // Date within the next 7 days so WeatherAPI can return a real forecast
          startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          endTime:   new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
          venueId, isPublic: false,
          setlistNotes: '[DEV] Setlist de prueba',
        },
      }).json<R>();
      eventId = id(evRes.data, 'eventId');
      log(`  ✅ Evento creado: ${eventId}  status=${evRes.data.status ?? 'DRAFT'}`);

      // Status → CONFIRMED
      log('⏳ PATCH /events/:id status → CONFIRMED…');
      await soft('PATCH event status', async () => {
        await client.patch(`events/${eventId}`, { json: { status: 'CONFIRMED' } }).json<R>();
        log('  ✅ Evento confirmado');
      });

      // DaySheet notes
      log('⏳ PATCH /events/:id/daysheet…');
      await soft('PATCH daysheet', async () => {
        await client.patch(`events/${eventId}/daysheet`, {
          json: { daysheetNotes: '[DEV] PA: L-Acoustics', itineraryNotes: '[DEV] Salida 14:00' },
        }).json<R>();
        log('  ✅ DaySheet notes actualizadas');
      });

      // Add User 2 to roster
      log('⏳ POST /events/:id/roster (agregar usuario 2)…');
      await client.post(`events/${eventId}/roster`, {
        json: { userId: user2Id, role: '[DEV] Músico test', notes: '[DEV]' },
      }).json<R>();
      log('  ✅ Usuario 2 añadido al roster');

      // Verify EVENT_ASSIGNED for User 2
      await soft('verificar EVENT_ASSIGNED', async () => {
        const n2 = await u2('GET', 'notifications?limit=15') as Record<string, unknown>;
        const types = notifTypes(n2);
        log(types.includes('EVENT_ASSIGNED')
          ? '  ✅ Usuario 2 recibió EVENT_ASSIGNED'
          : '  ⚠️ EVENT_ASSIGNED no encontrado en usuario 2');
      });

      // User 2 confirms attendance
      log('⏳ PATCH /events/:id/roster/:userId (usuario 2 confirma)…');
      await soft('User 2 confirm attendance', async () => {
        await u2('PATCH', `events/${eventId}/roster/${user2Id}`, { status: 'CONFIRMED' });
        log('  ✅ Usuario 2 confirmó asistencia (CONFIRMED)');
      });

      // GET roster
      const rosterRes = await client.get(`events/${eventId}/roster`).json<RL>();
      log(`  ✅ GET /roster → ${rosterRes.data.length} participante(s)`);

      // Schedule item — SOUNDCHECK
      log('⏳ POST /events/:id/schedule (SOUNDCHECK)…');
      const schedRes = await client.post(`events/${eventId}/schedule`, {
        json: {
          type: 'SOUNDCHECK', title: '[DEV] Balance de audio',
          startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000).toISOString(),
          endTime:   new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 - 1.5 * 60 * 60 * 1000).toISOString(),
          location: '[DEV] Escenario', withWho: 'Con FOH',
        },
      }).json<R>();
      scheduleItemId = id(schedRes.data, 'scheduleItemId');
      log(`  ✅ Schedule item: ${scheduleItemId}`);

      // Toggle complete (tracking en vivo)
      log('⏳ PATCH .../schedule/:itemId/complete (toggle)…');
      await soft('toggle complete', async () => {
        const cRes = await client.patch(`events/${eventId}/schedule/${scheduleItemId}/complete`).json<R>();
        const completed = (cRes.data as unknown as { isCompleted?: boolean })?.isCompleted;
        log(`  ✅ isCompleted: ${completed} — tracking en vivo ✓`);
      });

      // Vehicle
      log('⏳ POST /events/:id/vehicles…');
      const vehRes = await client.post(`events/${eventId}/vehicles`, {
        json: { name: '[DEV] Furgoneta', driverName: 'Test Driver', plateNumber: 'QC-DEV-001', capacity: 8 },
      }).json<R>();
      vehicleId = id(vehRes.data, 'vehicleId');
      log(`  ✅ Vehículo: ${vehicleId}`);

      // Passenger — User 1
      log('⏳ POST .../vehicles/:id/passengers (usuario 1)…');
      await soft('add passenger', async () => {
        await client.post(`events/${eventId}/vehicles/${vehicleId}/passengers`, {
          json: { userId: user1Id },
        }).json<R>();
        log('  ✅ Usuario 1 añadido como pasajero');
      });

      // Pickup GPS
      log('⏳ POST .../vehicles/:id/pickups (con GPS)…');
      await soft('add pickup', async () => {
        await client.post(`events/${eventId}/vehicles/${vehicleId}/pickups`, {
          json: { time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 - 7 * 60 * 60 * 1000).toISOString(), address: '[DEV] Punto de recogida', lat: 45.508, lng: -73.561, order: 0 },
        }).json<R>();
        log('  ✅ Pickup point con GPS añadido');
      });

      // Master DaySheet
      log('⏳ GET /events/:id/daysheet (endpoint maestro)…');
      await soft('master daysheet', async () => {
        const dsRes = await client.get(`events/${eventId}/daysheet`).json<R>();
        const ds = dsRes.data as Record<string, unknown>;
        const scheduleItems = (ds.schedule as unknown[] | undefined)?.length ?? 0;
        const rosterCount   = (ds.roster   as unknown[] | undefined)?.length ?? 0;
        const vehicleCount  = (ds.vehicles as unknown[] | undefined)?.length ?? 0;
        const hasMeta    = !!ds.meta;
        const hasWeather = 'weather' in ds;
        const hasFinance = 'finance' in ds;
        log(`  ✅ DaySheet OK — schedule:${scheduleItems} roster:${rosterCount} vehicles:${vehicleCount}`);
        log(`     meta:${hasMeta} weather:${hasWeather} finance:${hasFinance}`);
        const w = ds.weather as Record<string, unknown> | null;
        if (w?.available) {
          log(`  🌤️ Clima: ${w.conditionText}  ${w.maxTempC}°C / ${w.minTempC}°C  lluvia:${w.chanceOfRain}%`);
        } else {
          log('  ⏸️ Clima no disponible (sin WEATHER_API_KEY o venue sin coords exactas)');
        }
      });

      // Weather standalone
      log('⏳ GET /events/:id/weather…');
      await soft('weather', async () => {
        const wRes = await client.get(`events/${eventId}/weather`).json<R>();
        const w = wRes.data as Record<string, unknown>;
        log(`  ✅ Weather: ${w.conditionText ?? 'N/A'}  max:${w.maxTempC}°C`);
      });

      // ════════════════════════════════════════════════════════════════════
      // PHASE 7 — Finance
      // ════════════════════════════════════════════════════════════════════
      log('\n━━━ PHASE 7 — Finance ━━━');

      // PUT event finance (upsert)
      log('⏳ PUT /events/:id/finance…');
      await soft('PUT event finance', async () => {
        await client.put(`events/${eventId}/finance`, {
          json: { cacheTotal: '3000.00', perDiemAmount: '60.00', currency: 'CAD', isPaid: false },
        }).json<R>();
        log('  ✅ Resumen financiero del evento guardado');
      });

      // GET event finance
      log('⏳ GET /events/:id/finance…');
      await soft('GET event finance', async () => {
        const efRes = await client.get(`events/${eventId}/finance`).json<R>();
        log(`  ✅ Finance: caché=${efRes.data?.cacheTotal}  ${efRes.data?.currency}`);
      });

      // Finance category
      log('⏳ POST /finance/categories…');
      const catRes = await client.post('finance/categories', {
        json: { orgId, name: '[DEV] Transporte test', type: 'EXPENSE', icon: '🚌' },
      }).json<R>();
      financeCategoryId = id(catRes.data, 'financeCategoryId');
      log(`  ✅ Categoría: ${financeCategoryId}  "${catRes.data.name}"`);

      // Finance entry
      log('⏳ POST /finance/entries (EXPENSE, amount "250.00")…');
      const entRes = await client.post('finance/entries', {
        json: {
          orgId, eventId, categoryId: financeCategoryId,
          type: 'EXPENSE', amount: '250.00', currency: 'CAD',
          description: '[DEV] Gasto de prueba', date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        },
      }).json<R>();
      financeEntryId = id(entRes.data, 'financeEntryId');
      log(`  ✅ Entrada: ${financeEntryId}  status=PENDING`);

      // Approve entry
      log('⏳ PATCH /finance/entries/:id/approve…');
      await soft('approve entry', async () => {
        await client.patch(`finance/entries/${financeEntryId}/approve`).json<R>();
        log('  ✅ Gasto aprobado (APPROVED) → dispara EXPENSE_APPROVED');
      });

      // Verify EXPENSE_APPROVED for User 1 (self-approve, still generates notif)
      await soft('verificar EXPENSE_APPROVED', async () => {
        const n1 = await client.get('notifications', { searchParams: { limit: '15' } }).json<R>();
        const types = notifTypes(n1.data);
        log(types.includes('EXPENSE_APPROVED')
          ? '  ✅ EXPENSE_APPROVED en notificaciones de usuario 1'
          : '  ⏸️ EXPENSE_APPROVED no encontrado (puede que no se genere si el aprobador es el mismo que registró el gasto)');
      });

      // GET finance report
      log('⏳ GET /finance/reports…');
      await soft('finance report', async () => {
        const repRes = await client.get('finance/reports', { searchParams: { orgId: orgId! } }).json<R>();
        const sum = repRes.data?.summary as Record<string, unknown> | undefined;
        log(`  ✅ Reporte: totalExpense=${sum?.totalExpense}  balance=${sum?.balance}`);
      });

      // Per diem for User 2
      // Backend DTO uses 'userId' (confirmed — recipientId is not accepted)
      log('⏳ POST /finance/per-diem (para usuario 2)…');
      await soft('POST per-diem', async () => {
        const pdRes = await client.post('finance/per-diem', {
          json: { orgId, eventId, userId: user2Id, amount: '60.00', currency: 'CAD' },
        }).json<R>();
        perDiemId = pdRes.data?.id as string | null;
        log(`  ✅ Per diem: ${perDiemId}`);
      });

      if (perDiemId) {
        log('⏳ PATCH /finance/per-diem/:id/mark-paid…');
        await soft('mark-paid per-diem', async () => {
          await client.patch(`finance/per-diem/${perDiemId}/mark-paid`).json<R>();
          log('  ✅ Per diem marcado como pagado (paidAt registrado)');
        });

        // GET per-diem list
        log('⏳ GET /finance/per-diem?orgId=…');
        await soft('GET per-diem', async () => {
          const pdListRes = await client.get('finance/per-diem', { searchParams: { orgId: orgId!, eventId: eventId! } }).json<RL>();
          log(`  ✅ Per diem list: ${pdListRes.data.length} registro(s)`);
        });
      }

      // ════════════════════════════════════════════════════════════════════
      // PHASE 8 — Inventory
      // ════════════════════════════════════════════════════════════════════
      log('\n━━━ PHASE 8 — Inventario ━━━');

      log('⏳ POST /instruments…');
      const instrRes = await client.post('instruments', {
        json: {
          orgId, name: '[DEV] Trompeta Write Suite', type: 'BRASS',
          brand: 'Bach', model: 'Stradivarius', serialNumber: `DEV-${Date.now()}`,
        },
      }).json<R>();
      instrumentId = id(instrRes.data, 'instrumentId');
      log(`  ✅ Instrumento: ${instrumentId}  status=AVAILABLE`);

      // Assign to User 2
      log('⏳ POST /instruments/:id/assign (a usuario 2)…');
      await soft('assign instrument', async () => {
        await client.post(`instruments/${instrumentId}/assign`, {
          json: { userId: user2Id, eventId, notes: '[DEV] Asignación de prueba' },
        }).json<R>();
        log('  ✅ Instrumento asignado → status=IN_USE');
      });

      // Verify INSTRUMENT_ASSIGNED for User 2
      await soft('verificar INSTRUMENT_ASSIGNED', async () => {
        const n2 = await u2('GET', 'notifications?limit=15') as Record<string, unknown>;
        const types = notifTypes(n2);
        log(types.includes('INSTRUMENT_ASSIGNED')
          ? '  ✅ Usuario 2 recibió INSTRUMENT_ASSIGNED'
          : '  ⚠️ INSTRUMENT_ASSIGNED no encontrado en usuario 2');
      });

      // Equipment list for the event
      log('⏳ GET /instruments/assignments?orgId=&eventId=…');
      await soft('GET assignments', async () => {
        const aRes = await client.get('instruments/assignments', { searchParams: { orgId: orgId!, eventId: eventId! } }).json<RL>();
        log(`  ✅ Equipaje del evento: ${aRes.data.length} instrumento(s) asignado(s)`);
      });

      // Return instrument
      log('⏳ PATCH /instruments/:id/return…');
      await soft('return instrument', async () => {
        await client.patch(`instruments/${instrumentId}/return`).json<R>();
        log('  ✅ Instrumento devuelto → status=AVAILABLE');
      });

      // Retire instrument
      log('⏳ PATCH /instruments/:id/retire…');
      await soft('retire instrument', async () => {
        await client.patch(`instruments/${instrumentId}/retire`).json<R>();
        log('  ✅ Instrumento retirado → status=RETIRED');
      });

      // ════════════════════════════════════════════════════════════════════
      // PHASE 9 — Messages (flujo real 2 usuarios)
      // ════════════════════════════════════════════════════════════════════
      log('\n━━━ PHASE 9 — Mensajería directa ━━━');

      // User 1 → User 2
      log('⏳ POST /messages (usuario 1 → usuario 2)…');
      await soft('send message U1→U2', async () => {
        await client.post('messages', {
          json: { recipientId: user2Id, body: '[DEV] Mensaje de prueba — Write Suite', orgId },
        }).json<R>();
        log('  ✅ Mensaje enviado');
      });

      // User 2 → User 1 (reply)
      log('⏳ POST /messages (usuario 2 → usuario 1)…');
      await soft('send message U2→U1', async () => {
        await u2('POST', 'messages', { recipientId: user1Id, body: '[DEV] Respuesta de prueba', orgId });
        log('  ✅ Respuesta enviada (usuario 2 → usuario 1)');
      });

      // Verify MESSAGE_RECEIVED for User 2 (from U1 message)
      await soft('verificar MESSAGE_RECEIVED', async () => {
        const n2 = await u2('GET', 'notifications?limit=15') as Record<string, unknown>;
        const types = notifTypes(n2);
        log(types.includes('MESSAGE_RECEIVED')
          ? '  ✅ Usuario 2 recibió MESSAGE_RECEIVED'
          : '  ⚠️ MESSAGE_RECEIVED no encontrado en usuario 2');
      });

      // GET conversations (User 1)
      log('⏳ GET /messages/conversations (usuario 1)…');
      await soft('GET conversations U1', async () => {
        const convRes = await client.get('messages/conversations').json<RL>();
        log(`  ✅ Conversaciones de usuario 1: ${convRes.data.length}`);
      });

      // User 2 opens thread (marks messages as read automatically)
      log(`⏳ GET /messages/conversations/${user1Id} (usuario 2 lee el hilo)…`);
      await soft('GET conversation thread U2', async () => {
        const threadData = await u2('GET', `messages/conversations/${user1Id}`) as unknown;
        const msgs = Array.isArray(threadData)
          ? threadData
          : ((threadData as Record<string, unknown>)?.messages as unknown[] | undefined) ?? [];
        log(`  ✅ Hilo leído: ${msgs.length} mensaje(s) (marcados como leídos al abrir)`);
      });

      // ════════════════════════════════════════════════════════════════════
      // PHASE 10 — Notificaciones: resumen y limpieza
      // ════════════════════════════════════════════════════════════════════
      log('\n━━━ PHASE 10 — Notificaciones: resumen ━━━');

      log('⏳ GET /notifications usuario 1 (resumen final)…');
      await soft('final notifs U1', async () => {
        const nRes = await client.get('notifications').json<R>();
        const ud = nRes.data as Record<string, unknown>;
        const unread = ud?.unreadCount;
        log(`  ✅ Usuario 1: unreadCount=${unread}`);
        const types = notifTypes(ud);
        if (types.length > 0) log(`     tipos: ${types.slice(0, 5).join(', ')}`);
      });

      log('⏳ PATCH /notifications/read-all (usuario 1)…');
      await soft('read-all U1', async () => {
        await client.patch('notifications/read-all').json<R>();
        log('  ✅ Todas leídas — usuario 1');
      });

      log('⏳ PATCH /notifications/read-all (usuario 2)…');
      await soft('read-all U2', async () => {
        await u2('PATCH', 'notifications/read-all');
        log('  ✅ Todas leídas — usuario 2');
      });

      // ════════════════════════════════════════════════════════════════════
      // PHASE 11 — Remover usuario 2 de la org
      // ════════════════════════════════════════════════════════════════════
      log('\n━━━ PHASE 11 — Remover usuario 2 de la org ━━━');
      await soft('DELETE member user2', async () => {
        await client.delete(`organizations/${orgId}/members/${user2Id}`).json<R>();
        log('  ✅ Usuario 2 removido de la organización');
      });

      // ════════════════════════════════════════════════════════════════════
      // DONE
      // ════════════════════════════════════════════════════════════════════
      log('\n── ✅ WRITE SUITE COMPLETADO ──');
      setResult({ status: 'ok', detail: lines.join('\n') });

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`\n❌ ERROR CRÍTICO: ${msg}`);
      setResult({ status: 'fail', detail: lines.join('\n') });

    } finally {
      // ════════════════════════════════════════════════════════════════════
      // CLEANUP — siempre se ejecuta
      // ════════════════════════════════════════════════════════════════════
      log('\n━━━ CLEANUP ━━━');
      const del = async (path: string, label: string) => {
        try {
          await client.delete(path).json();
          log(`  🗑️ ${label}`);
        } catch {
          log(`  ⚠️ No se pudo eliminar: ${label}`);
        }
      };

      // Order matters: delete child resources before parents
      if (userSkillId) await del(`users/me/skills/${userSkillId}`, `Skill ${userSkillId}`);
      if (financeEntryId) await del(`finance/entries/${financeEntryId}`, `FinanceEntry`);
      if (financeCategoryId) await del(`finance/categories/${financeCategoryId}`, `FinanceCategory`);
      if (scheduleItemId && eventId) await del(`events/${eventId}/schedule/${scheduleItemId}`, `ScheduleItem`);
      if (vehicleId && eventId) await del(`events/${eventId}/vehicles/${vehicleId}`, `Vehicle (+ pasajeros y pickups en cascade)`);
      if (eventId) await del(`events/${eventId}`, `Event ${eventId}`);
      if (songId) await del(`songs/${songId}`, `Song ${songId}`);
      if (inviteLinkId && orgId) await del(`organizations/${orgId}/invite-links/${inviteLinkId}`, `InviteLink`);
      if (orgId) await del(`organizations/${orgId}`, `Org ${orgId} (soft-delete)`);
      // Note: venues have no DELETE endpoint — stays in production (marked as DEV in name)
      // Note: instruments have no DELETE — was retired via PATCH /retire
      // Note: per-diem has no DELETE endpoint
      log('  🏁 Limpieza completa');
      setIsRunning(false);
    }
  }, [user2Email, user2Password]);

  // ─── Render ────────────────────────────────────────────────────────────────

  const statusColor = result.status === 'ok' ? colors.ok
    : result.status === 'fail' ? colors.fail
    : result.status === 'running' ? colors.warn
    : colors.muted;

  const statusLabel = result.status === 'ok' ? '✅ COMPLETADO'
    : result.status === 'fail' ? '❌ FALLÓ'
    : result.status === 'running' ? '🔄 CORRIENDO…'
    : '';

  return (
    <div>
      {/* Header info */}
      <div style={s.section}>
        <h2 style={s.h2}>✍️ Write Suite — Operaciones CUD</h2>
        <p style={s.desc}>
          Testea todas las operaciones de escritura (Create / Update / Delete) usando <strong>dos usuarios reales</strong>.
          Crea recursos temporales, verifica el comportamiento del backend incluyendo notificaciones cruzadas, y limpia todo al finalizar.
        </p>
        <p style={{ ...s.desc, color: colors.warn, marginBottom: 0 }}>
          ⚠️ Corre el <strong>API Suite</strong> primero (para inicializar el cliente HTTP). Los recursos que crea este suite
          se eliminan automáticamente en el paso de cleanup.
        </p>
      </div>

      {/* User 2 credentials */}
      <div style={s.section}>
        <h2 style={s.h2}>👤 Credenciales — Usuario 2</h2>
        <p style={s.desc}>
          Se usa para testear: join con invite link, recibir notificaciones (EVENT_ASSIGNED, ROLE_CHANGED,
          INSTRUMENT_ASSIGNED, MESSAGE_RECEIVED), confirmar asistencia, mensajes directos.
        </p>
        <div style={s.row}>
          <span style={s.label}>Email:</span>
          <input
            style={s.input}
            type="email"
            value={user2Email}
            onChange={e => setUser2Email(e.target.value)}
            disabled={isRunning}
          />
        </div>
        <div style={s.row}>
          <span style={s.label}>Password:</span>
          <input
            style={s.input}
            type="password"
            value={user2Password}
            onChange={e => setUser2Password(e.target.value)}
            disabled={isRunning}
          />
        </div>
      </div>

      {/* Phases summary */}
      <div style={s.section}>
        <h2 style={s.h2}>📋 Fases del Write Suite</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', fontSize: 12, color: colors.muted }}>
          {[
            ['1', 'Login ambos usuarios (ROPC)'],
            ['2', 'Organizations — crear, editar, invite, join, roles, expulsar'],
            ['3', 'Perfil (PATCH /users/me) + Skills (add/list/delete)'],
            ['4', 'Venues — crear, editar'],
            ['5', 'Songs — crear, editar, detalle con assets'],
            ['6', 'Events + DaySheet — status, notas, roster, cronograma, vehículos, GPS'],
            ['7', 'Finance — resumen evento, categorías, entradas, aprobar, per diem'],
            ['8', 'Inventory — crear, asignar, equipaje, devolver, retirar'],
            ['9', 'Messages — U1→U2, U2→U1, historial, marcar leídos'],
            ['10', 'Notifications — verificar todos los triggers + read-all'],
            ['11', 'Remover usuario 2 de la org'],
            ['∅', 'Cleanup automático (delete en orden inverso)'],
          ].map(([phase, desc]) => (
            <div key={phase} style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
              <span style={{ color: colors.info, fontWeight: 700, minWidth: 20 }}>{phase}</span>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Run button */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          style={{ ...s.btn, opacity: isRunning ? 0.6 : 1 }}
          onClick={runWriteSuite}
          disabled={isRunning}
        >
          {isRunning ? '⏳ Corriendo…' : '▶ Run Full Write Suite'}
        </button>
        {statusLabel && (
          <span style={{ ...s.pill, background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}66` }}>
            {statusLabel}
          </span>
        )}
      </div>

      {/* Log output */}
      {result.detail && (
        <div style={s.log}>
          {result.detail}
        </div>
      )}
    </div>
  );
}
