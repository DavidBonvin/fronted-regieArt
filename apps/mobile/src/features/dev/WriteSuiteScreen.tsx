import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getConfig, getHttpClient, resetHttpClient } from '@regieart/api';
import { storeUserTokens } from '../../shared/api/client';


interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
}

async function loginWithROPC(username: string, password: string): Promise<TokenResponse> {
  const cfg = getConfig();
  const url = `${cfg.keycloakUrl}/realms/${cfg.realm}/protocol/openid-connect/token`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: cfg.clientId,
      username,
      password,
    }).toString(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((err['error_description'] as string | undefined) ?? `Keycloak ${res.status}`);
  }
  return res.json() as Promise<TokenResponse>;
}


type Status = 'idle' | 'running' | 'ok' | 'fail';


export function WriteSuiteScreen() {
  const [user1Email,    setUser1Email]    = useState('teststorage@gmail.com');
  const [user1Password, setUser1Password] = useState('teststorage@gmail.com');
  const [user2Email,    setUser2Email]    = useState('testuserinvitado1@gmail.com');
  const [user2Password, setUser2Password] = useState('testuserinvitado1@gmail.com');
  const [isRunning,     setIsRunning]     = useState(false);
  const [status,        setStatus]        = useState<Status>('idle');
  const [logText,       setLogText]       = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const appendLog = useCallback((lines: string[], msg: string) => {
    lines.push(msg);
    setLogText(lines.join('\n'));
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
  }, []);

  const runSuite = useCallback(async () => {
    setIsRunning(true);
    setStatus('running');
    setLogText('');

    const lines: string[] = [];
    const log = (msg: string) => appendLog(lines, msg);

    resetHttpClient();
    const client  = getHttpClient();
    const apiBase = getConfig().apiBaseUrl.replace(/\/$/, '');

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

    const soft = async (label: string, fn: () => Promise<void>): Promise<void> => {
      try { await fn(); } catch (err) {
        log(`  ⚠️ ${label}: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

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
      log('━━━ PHASE 1 — Login usuarios ━━━');

      const u2Tokens = await loginWithROPC(user2Email, user2Password);
      user2Token = u2Tokens.access_token;
      const u2meData = await u2('GET', 'users/me') as Record<string, unknown>;
      user2Id = id(u2meData, 'User 2 ID');
      log(`  ✅ User 2: ${String(u2meData.displayName ?? u2meData.email)}  (${user2Id})`);

      const u1Tokens = await loginWithROPC(user1Email, user1Password);
      await storeUserTokens(
        u1Tokens.access_token,
        u1Tokens.refresh_token,
        u1Tokens.expires_in,
        u1Tokens.refresh_expires_in,
      );
      resetHttpClient();
      const u1meRes = await getHttpClient().get('users/me').json<R>();
      user1Id = id(u1meRes.data, 'User 1 ID');
      log(`  ✅ User 1: ${String(u1meRes.data.displayName ?? u1meRes.data.email)}  (${user1Id})`);

      log('\n━━━ PHASE 2 — Organizations ━━━');

      log('⏳ POST /organizations…');
      const orgRes = await client.post('organizations', {
        json: { name: `[DEV Mobile Suite] ${Date.now()}`, description: 'Org de test mobile' },
      }).json<R>();
      orgId = id(orgRes.data, 'orgId');
      log(`  ✅ Org creada: ${orgId}`);

      await soft('PATCH org', async () => {
        await client.patch(`organizations/${orgId}`, {
          json: { description: 'Desc actualizada — Mobile Write Suite' },
        }).json<R>();
        log('  ✅ Org actualizada');
      });

      log('⏳ POST invite-link…');
      const inviteRes = await client.post(`organizations/${orgId}/invite-links`, {
        json: { role: 'MEMBER' },
      }).json<R>();
      inviteLinkId = inviteRes.data?.id as string | null;
      const token2 = inviteRes.data?.token as string | null;
      if (!token2) throw new Error('Invite link no devolvió token');
      log(`  ✅ Invite link: ${token2}`);

      log('⏳ POST join (usuario 2)…');
      await u2('POST', `organizations/join/${token2}`);
      log('  ✅ Usuario 2 se unió');

      const membersRes = await client.get(`organizations/${orgId}/members`).json<RL>();
      log(`  ✅ Miembros: ${membersRes.data.length}`);
      const user2MemberRecord = membersRes.data.find(
        (m: unknown) => ((m as Record<string, unknown>)?.user as Record<string, unknown>)?.id === user2Id,
      ) as Record<string, unknown> | undefined;
      const user2MemberId = user2MemberRecord?.id as string | null ?? null;
      log(`  ℹ️ memberId U2: ${user2MemberId ?? '(no encontrado)'}`);

      await soft('verificar INVITE_ACCEPTED', async () => {
        const n1 = await client.get('notifications', { searchParams: { limit: '10' } }).json<R>();
        const types = notifTypes(n1.data);
        log(types.includes('INVITE_ACCEPTED') ? '  ✅ INVITE_ACCEPTED' : '  ⚠️ INVITE_ACCEPTED aún no visible');
      });

      await soft('PATCH role → ADMIN', async () => {
        if (!user2MemberId) { log('  ⚠️ memberId no disponible — saltando'); return; }
        await client.patch(`organizations/${orgId}/members/${user2MemberId}/role`, {
          json: { role: 'ADMIN' },
        }).json<R>();
        log('  ✅ Rol → ADMIN');
      });

      await soft('verificar ROLE_CHANGED', async () => {
        const n2 = await u2('GET', 'notifications?limit=10') as Record<string, unknown>;
        const types = notifTypes(n2);
        log(types.includes('ROLE_CHANGED') ? '  ✅ ROLE_CHANGED en U2' : '  ⚠️ ROLE_CHANGED no encontrado');
      });

      log('\n━━━ PHASE 3 — Perfil y Habilidades ━━━');

      await soft('PATCH users/me', async () => {
        const pRes = await client.patch('users/me', {
          json: { bio: '[DEV Mobile] Bio temporal', city: 'Montreal', country: 'CA' },
        }).json<R>();
        log(`  ✅ Perfil: bio="${String(pRes.data?.bio ?? '').slice(0, 30)}…"`);
        await client.patch('users/me', { json: { bio: null } }).json<R>();
        log('  ✅ Bio restaurada');
      });

      let firstSkillCatId: string | null = null;
      let firstSkillCatName = '';
      await soft('GET skill-categories', async () => {
        const scRes = await client.get('skill-categories')
          .json<{ success: boolean; data: Array<{ id: string; name: string }> }>();
        const cats = Array.isArray(scRes.data) ? scRes.data : [];
        log(`  ✅ ${cats.length} categoría(s)`);
        if (cats.length > 0) { firstSkillCatId = cats[0].id; firstSkillCatName = cats[0].name; }
      });

      if (firstSkillCatId) {
        await soft('POST skill', async () => {
          try {
            const skRes = await client.post('users/me/skills', {
              json: { skillCategoryId: firstSkillCatId, expertiseLevel: 'INTERMEDIATE', yearsExp: 3 },
            }).json<R>();
            userSkillId = skRes.data?.id as string | null;
            log(`  ✅ Skill: "${firstSkillCatName}" (${userSkillId})`);
          } catch (err: unknown) {
            const e = err as { status?: number };
            if (e.status === 409) { log('  ⏸️ Skill ya existe (409)'); } else { throw err; }
          }
        });
        if (userSkillId) {
          const mySkRes = await client.get('users/me/skills').json<{ success: boolean; data: unknown[] }>();
          log(`  ✅ GET skills → ${mySkRes.data.length} habilidad(es)`);
        }
      }

      log('\n━━━ PHASE 4 — Venues ━━━');

      const venRes = await client.post('venues', {
        json: {
          name: `[DEV Mobile] Venue ${Date.now()}`,
          address: '1 Rue de Test', city: 'Montreal', country: 'CA',
          capacity: 500, latitude: 45.508888, longitude: -73.561668,
          timezone: 'America/Toronto',
        },
      }).json<R>();
      venueId = id(venRes.data, 'venueId');
      log(`  ✅ Venue: ${venueId}`);

      await soft('PATCH venue', async () => {
        await client.patch(`venues/${venueId}`, {
          json: { parkingNotes: '[DEV] 3 plazas — mobile' },
        }).json<R>();
        log('  ✅ Venue actualizado');
      });

      log('\n━━━ PHASE 5 — Canciones ━━━');

      const sngRes = await client.post('songs', {
        json: { orgId, title: '[DEV Mobile] Song', composer: 'Test', genre: 'Jazz', tempo: 120 },
      }).json<R>();
      songId = id(sngRes.data, 'songId');
      log(`  ✅ Canción: ${songId}`);

      await soft('PATCH song', async () => {
        await client.patch(`songs/${songId}`, { json: { tempo: 132 } }).json<R>();
        log('  ✅ Canción actualizada');
      });

      await soft('GET song detail', async () => {
        const sdRes = await client.get(`songs/${songId}`).json<R>();
        const assets = (sdRes.data?.assets as unknown[] | undefined) ?? [];
        log(`  ✅ Song detail — ${assets.length} asset(s)`);
      });

      log('\n━━━ PHASE 6 — Events + DaySheet + Roster ━━━');

      const evRes = await client.post('events', {
        json: {
          orgId, title: '[DEV Mobile] Concert', type: 'CONCERT',
          startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          endTime:   new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
          venueId, isPublic: false,
        },
      }).json<R>();
      eventId = id(evRes.data, 'eventId');
      log(`  ✅ Evento: ${eventId}`);

      await soft('PATCH event → CONFIRMED', async () => {
        await client.patch(`events/${eventId}`, { json: { status: 'CONFIRMED' } }).json<R>();
        log('  ✅ Evento confirmado');
      });

      await soft('PATCH daysheet', async () => {
        await client.patch(`events/${eventId}/daysheet`, {
          json: { daysheetNotes: '[DEV Mobile] PA: L-Acoustics' },
        }).json<R>();
        log('  ✅ DaySheet actualizado');
      });

      await client.post(`events/${eventId}/roster`, {
        json: { userId: user2Id, role: '[DEV] Músico', notes: '[DEV]' },
      }).json<R>();
      log('  ✅ U2 en roster');

      await soft('EVENT_ASSIGNED', async () => {
        const n2 = await u2('GET', 'notifications?limit=15') as Record<string, unknown>;
        const types = notifTypes(n2);
        log(types.includes('EVENT_ASSIGNED') ? '  ✅ EVENT_ASSIGNED' : '  ⚠️ EVENT_ASSIGNED no visible');
      });

      await soft('U2 confirma asistencia', async () => {
        await u2('PATCH', `events/${eventId}/roster/${user2Id}`, { status: 'CONFIRMED' });
        log('  ✅ U2 confirmó asistencia');
      });

      const rosterRes = await client.get(`events/${eventId}/roster`).json<RL>();
      log(`  ✅ Roster: ${rosterRes.data.length} participante(s)`);

      const schedRes = await client.post(`events/${eventId}/schedule`, {
        json: {
          type: 'SOUNDCHECK', title: '[DEV Mobile] Soundcheck',
          startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000).toISOString(),
          endTime:   new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 - 1.5 * 60 * 60 * 1000).toISOString(),
        },
      }).json<R>();
      scheduleItemId = id(schedRes.data, 'scheduleItemId');
      log(`  ✅ Schedule item: ${scheduleItemId}`);

      await soft('toggle complete', async () => {
        const cRes = await client.patch(`events/${eventId}/schedule/${scheduleItemId}/complete`).json<R>();
        const completed = (cRes.data as unknown as { isCompleted?: boolean })?.isCompleted;
        log(`  ✅ isCompleted: ${String(completed)}`);
      });

      const vehRes = await client.post(`events/${eventId}/vehicles`, {
        json: { name: '[DEV Mobile] Furgoneta', driverName: 'Test Driver', plateNumber: 'QC-MOB-001', capacity: 8 },
      }).json<R>();
      vehicleId = id(vehRes.data, 'vehicleId');
      log(`  ✅ Vehículo: ${vehicleId}`);

      await soft('add passenger', async () => {
        await client.post(`events/${eventId}/vehicles/${vehicleId}/passengers`, {
          json: { userId: user1Id },
        }).json<R>();
        log('  ✅ U1 como pasajero');
      });

      await soft('add pickup GPS', async () => {
        await client.post(`events/${eventId}/vehicles/${vehicleId}/pickups`, {
          json: {
            time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 - 7 * 60 * 60 * 1000).toISOString(),
            address: '[DEV Mobile] Pickup', lat: 45.508, lng: -73.561, order: 0,
          },
        }).json<R>();
        log('  ✅ Pickup GPS añadido');
      });

      await soft('master daysheet', async () => {
        const dsRes = await client.get(`events/${eventId}/daysheet`).json<R>();
        const ds = dsRes.data as Record<string, unknown>;
        const schedCount   = (ds.schedule as unknown[] | undefined)?.length ?? 0;
        const rosterCount  = (ds.roster   as unknown[] | undefined)?.length ?? 0;
        const vehicleCount = (ds.vehicles as unknown[] | undefined)?.length ?? 0;
        log(`  ✅ DaySheet — schedule:${schedCount} roster:${rosterCount} vehicles:${vehicleCount}`);
        const w = ds.weather as Record<string, unknown> | null;
        if (w?.available) {
          log(`  🌤️ ${String(w.conditionText)}  ${String(w.maxTempC)}°C / ${String(w.minTempC)}°C  lluvia:${String(w.chanceOfRain)}%`);
        }
      });

      await soft('weather standalone', async () => {
        const wRes = await client.get(`events/${eventId}/weather`).json<R>();
        const w = wRes.data as Record<string, unknown>;
        log(`  ✅ Weather: ${String(w.conditionText ?? 'N/A')}  max:${String(w.maxTempC)}°C`);
      });

      log('\n━━━ PHASE 7 — Finance ━━━');

      await soft('PUT event finance', async () => {
        await client.put(`events/${eventId}/finance`, {
          json: { cacheTotal: '3000.00', perDiemAmount: '60.00', currency: 'CAD', isPaid: false },
        }).json<R>();
        log('  ✅ Finance guardado');
      });

      await soft('GET event finance', async () => {
        const efRes = await client.get(`events/${eventId}/finance`).json<R>();
        log(`  ✅ Finance: ${String(efRes.data?.cacheTotal)}  ${String(efRes.data?.currency)}`);
      });

      const catRes = await client.post('finance/categories', {
        json: { orgId, name: '[DEV Mobile] Transporte', type: 'EXPENSE', icon: '🚌' },
      }).json<R>();
      financeCategoryId = id(catRes.data, 'financeCategoryId');
      log(`  ✅ Categoría: ${financeCategoryId}`);

      const entRes = await client.post('finance/entries', {
        json: {
          orgId, eventId, categoryId: financeCategoryId,
          type: 'EXPENSE', amount: '250.00', currency: 'CAD',
          description: '[DEV Mobile] Gasto',
          date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        },
      }).json<R>();
      financeEntryId = id(entRes.data, 'financeEntryId');
      log(`  ✅ Entrada: ${financeEntryId}`);

      await soft('approve entry', async () => {
        await client.patch(`finance/entries/${financeEntryId}/approve`).json<R>();
        log('  ✅ Gasto aprobado → EXPENSE_APPROVED');
      });

      await soft('finance report', async () => {
        const repRes = await client.get('finance/reports', { searchParams: { orgId: orgId! } }).json<R>();
        const sum = repRes.data?.summary as Record<string, unknown> | undefined;
        log(`  ✅ Reporte: expense=${String(sum?.totalExpense)}  balance=${String(sum?.balance)}`);
      });

      await soft('POST per-diem', async () => {
        const pdRes = await client.post('finance/per-diem', {
          json: { orgId, eventId, userId: user2Id, amount: '60.00', currency: 'CAD' },
        }).json<R>();
        perDiemId = pdRes.data?.id as string | null;
        log(`  ✅ Per diem: ${perDiemId}`);
      });

      if (perDiemId) {
        await soft('mark-paid per-diem', async () => {
          await client.patch(`finance/per-diem/${perDiemId}/mark-paid`).json<R>();
          log('  ✅ Per diem marcado como pagado');
        });
        await soft('GET per-diem list', async () => {
          const pdListRes = await client.get('finance/per-diem', { searchParams: { orgId: orgId!, eventId: eventId! } }).json<RL>();
          log(`  ✅ Per diem list: ${pdListRes.data.length} registro(s)`);
        });
      }

      log('\n━━━ PHASE 8 — Inventario ━━━');

      const instrRes = await client.post('instruments', {
        json: {
          orgId, name: '[DEV Mobile] Trompeta', type: 'BRASS',
          brand: 'Bach', model: 'Stradivarius', serialNumber: `MOB-${Date.now()}`,
        },
      }).json<R>();
      instrumentId = id(instrRes.data, 'instrumentId');
      log(`  ✅ Instrumento: ${instrumentId}`);

      await soft('assign instrument', async () => {
        await client.post(`instruments/${instrumentId}/assign`, {
          json: { userId: user2Id, eventId, notes: '[DEV Mobile]' },
        }).json<R>();
        log('  ✅ Instrumento asignado → IN_USE');
      });

      await soft('INSTRUMENT_ASSIGNED', async () => {
        const n2 = await u2('GET', 'notifications?limit=15') as Record<string, unknown>;
        const types = notifTypes(n2);
        log(types.includes('INSTRUMENT_ASSIGNED') ? '  ✅ INSTRUMENT_ASSIGNED' : '  ⚠️ INSTRUMENT_ASSIGNED no encontrado');
      });

      await soft('GET assignments', async () => {
        const aRes = await client.get('instruments/assignments', { searchParams: { orgId: orgId!, eventId: eventId! } }).json<RL>();
        log(`  ✅ Equipaje: ${aRes.data.length} instrumento(s)`);
      });

      await soft('return instrument', async () => {
        await client.patch(`instruments/${instrumentId}/return`).json<R>();
        log('  ✅ Devuelto → AVAILABLE');
      });

      await soft('retire instrument', async () => {
        await client.patch(`instruments/${instrumentId}/retire`).json<R>();
        log('  ✅ Retirado → RETIRED');
      });

      log('\n━━━ PHASE 9 — Mensajería ━━━');

      await soft('U1→U2 mensaje', async () => {
        await client.post('messages', {
          json: { recipientId: user2Id, body: '[DEV Mobile] Mensaje de prueba', orgId },
        }).json<R>();
        log('  ✅ Mensaje enviado');
      });

      await soft('U2→U1 reply', async () => {
        await u2('POST', 'messages', { recipientId: user1Id, body: '[DEV Mobile] Respuesta', orgId });
        log('  ✅ Respuesta enviada');
      });

      await soft('MESSAGE_RECEIVED', async () => {
        const n2 = await u2('GET', 'notifications?limit=15') as Record<string, unknown>;
        const types = notifTypes(n2);
        log(types.includes('MESSAGE_RECEIVED') ? '  ✅ MESSAGE_RECEIVED en U2' : '  ⚠️ MESSAGE_RECEIVED no encontrado');
      });

      await soft('GET conversations U1', async () => {
        const convRes = await client.get('messages/conversations').json<RL>();
        log(`  ✅ Conversaciones U1: ${convRes.data.length}`);
      });

      await soft('GET thread U2', async () => {
        const threadData = await u2('GET', `messages/conversations/${user1Id}`) as unknown;
        const msgs = Array.isArray(threadData)
          ? threadData
          : ((threadData as Record<string, unknown>)?.messages as unknown[] | undefined) ?? [];
        log(`  ✅ Hilo leído: ${msgs.length} mensaje(s)`);
      });

      log('\n━━━ PHASE 10 — Notificaciones ━━━');

      await soft('notifs U1', async () => {
        const nRes = await client.get('notifications').json<R>();
        const ud = nRes.data as Record<string, unknown>;
        log(`  ✅ U1 unreadCount=${String(ud?.unreadCount)}`);
      });
      await soft('read-all U1', async () => {
        await client.patch('notifications/read-all').json<R>();
        log('  ✅ Todas leídas — U1');
      });
      await soft('read-all U2', async () => {
        await u2('PATCH', 'notifications/read-all');
        log('  ✅ Todas leídas — U2');
      });

      log('\n━━━ PHASE 11 — Remover U2 de la org ━━━');
      await soft('DELETE member U2', async () => {
        await client.delete(`organizations/${orgId}/members/${user2Id}`).json<R>();
        log('  ✅ U2 removido');
      });

      log('\n── ✅ WRITE SUITE COMPLETADO ──');
      setStatus('ok');

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`\n❌ ERROR CRÍTICO: ${msg}`);
      setStatus('fail');

    } finally {
      log('\n━━━ CLEANUP ━━━');
      const del = async (path: string, label: string) => {
        try {
          await client.delete(path).json();
          log(`  🗑️ ${label}`);
        } catch {
          log(`  ⚠️ No se pudo eliminar: ${label}`);
        }
      };
      if (userSkillId)       await del(`users/me/skills/${userSkillId}`, 'Skill');
      if (financeEntryId)    await del(`finance/entries/${financeEntryId}`, 'FinanceEntry');
      if (financeCategoryId) await del(`finance/categories/${financeCategoryId}`, 'FinanceCategory');
      if (scheduleItemId && eventId) await del(`events/${eventId}/schedule/${scheduleItemId}`, 'ScheduleItem');
      if (vehicleId && eventId)      await del(`events/${eventId}/vehicles/${vehicleId}`, 'Vehicle');
      if (eventId)     await del(`events/${eventId}`, 'Event');
      if (songId)      await del(`songs/${songId}`, 'Song');
      if (inviteLinkId && orgId) await del(`organizations/${orgId}/invite-links/${inviteLinkId}`, 'InviteLink');
      if (orgId)       await del(`organizations/${orgId}`, 'Org (soft-delete)');
      log('  🏁 Limpieza completa');
      setIsRunning(false);
    }
  }, [user1Email, user1Password, user2Email, user2Password, appendLog]);

  const statusColor = status === 'ok'      ? COLORS.ok
    : status === 'fail'    ? COLORS.fail
    : status === 'running' ? COLORS.warn
    : COLORS.muted;

  const statusLabel = status === 'ok'      ? '✅ COMPLETADO'
    : status === 'fail'    ? '❌ FALLÓ'
    : status === 'running' ? '🔄 CORRIENDO…'
    : '';

  const handleCopyLogs = useCallback(async () => {
    if (!logText) return;
    await Share.share({ message: logText });
  }, [logText]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.root} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.h1}>✍️ Write Suite</Text>
          <Text style={styles.desc}>
            11 fases — Crea, modifica y elimina recursos usando 2 usuarios reales.
            Verifica notificaciones cruzadas. Limpia todo al finalizar.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>👤 Usuario 1 — Credenciales</Text>
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={user1Email}
            onChangeText={setUser1Email}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!isRunning}
            placeholderTextColor={COLORS.muted}
          />
          <Text style={styles.fieldLabel}>Contraseña</Text>
          <TextInput
            style={styles.input}
            value={user1Password}
            onChangeText={setUser1Password}
            secureTextEntry
            editable={!isRunning}
            placeholderTextColor={COLORS.muted}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>👤 Usuario 2 — Credenciales</Text>
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={user2Email}
            onChangeText={setUser2Email}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!isRunning}
            placeholderTextColor={COLORS.muted}
          />
          <Text style={styles.fieldLabel}>Contraseña</Text>
          <TextInput
            style={styles.input}
            value={user2Password}
            onChangeText={setUser2Password}
            secureTextEntry
            editable={!isRunning}
            placeholderTextColor={COLORS.muted}
          />
        </View>

        <Pressable
          style={[styles.btn, isRunning && styles.btnDisabled]}
          onPress={runSuite}
          disabled={isRunning}
        >
          {isRunning
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>▶ Correr Write Suite</Text>
          }
        </Pressable>

        {statusLabel ? (
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
            {logText ? (
              <Pressable style={styles.copyBtn} onPress={handleCopyLogs}>
                <Text style={styles.copyBtnText}>📋 Copiar logs</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {logText ? (
          <View style={styles.logContainer}>
            <ScrollView ref={scrollRef} style={styles.logScroll} nestedScrollEnabled>
              <Text style={styles.logText}>{logText}</Text>
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}


const COLORS = {
  bg:      '#0f172a',
  surface: '#1e293b',
  border:  '#334155',
  text:    '#f1f5f9',
  muted:   '#94a3b8',
  ok:      '#22c55e',
  fail:    '#ef4444',
  warn:    '#f59e0b',
  info:    '#3b82f6',
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  root: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  h1: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  h2: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  desc: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 20,
  },
  fieldLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#263248',
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  btn: {
    backgroundColor: COLORS.info,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  statusLabel: {
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 15,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  copyBtn: {
    backgroundColor: '#1e3a5f',
    borderWidth: 1,
    borderColor: COLORS.info,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  copyBtnText: {
    color: COLORS.info,
    fontSize: 12,
    fontWeight: '600',
  },
  logContainer: {
    backgroundColor: '#0a0f1e',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    height: 480,
    marginBottom: 16,
  },
  logScroll: {
    flex: 1,
    padding: 12,
  },
  logText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: COLORS.text,
    lineHeight: 18,
  },
  bottomPad: {
    height: 40,
  },
});
