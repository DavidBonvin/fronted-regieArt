import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  clearLog,
  getKeycloakRefreshCount,
  getLogEntries,
  subscribeToLog,
  type RequestLogEntry,
} from './requestLog';

// ─── Colors ──────────────────────────────────────────────────────────────────

const C = {
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

// ─── Status badge color ───────────────────────────────────────────────────────

function statusColor(status: number | null): string {
  if (status === null) return C.fail;
  if (status >= 500)   return C.fail;
  if (status >= 400)   return C.warn;
  if (status >= 200)   return C.ok;
  return C.muted;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DevToolsScreen() {
  const [entries,        setEntries]        = useState<readonly RequestLogEntry[]>(getLogEntries());
  const [refreshCount,   setRefreshCount]   = useState(getKeycloakRefreshCount());
  const scrollRef = useRef<ScrollView>(null);

  // Subscribe to log updates
  useEffect(() => {
    const unsub = subscribeToLog(() => {
      setEntries([...getLogEntries()]);
      setRefreshCount(getKeycloakRefreshCount());
    });
    return unsub;
  }, []);

  const handleClear = useCallback(() => {
    clearLog();
    setEntries([]);
    setRefreshCount(0);
  }, []);

  const handleCopy = useCallback(async () => {
    const lines = entries.map(e =>
      `${e.timeLabel}  ${e.method.padEnd(7)} ${e.url}  →${e.status ?? 'ERR'}  ${e.duration}ms${e.hasAuth ? '  🔑' : ''}`,
    );
    const text = [
      `Keycloak refreshes: ${refreshCount}`,
      '',
      ...lines,
    ].join('\n');
    await Share.share({ message: text });
  }, [entries, refreshCount]);

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.title}>🛠️ DevTools</Text>
          <Text style={s.subtitle}>
            Keycloak refreshes: <Text style={s.highlight}>{refreshCount}</Text>
          </Text>
        </View>
        <View style={s.headerBtns}>
          <Pressable style={[s.btn, s.btnCopy]} onPress={handleCopy}>
            <Text style={s.btnText}>📋 Copiar</Text>
          </Pressable>
          <Pressable style={[s.btn, s.btnClear]} onPress={handleClear}>
            <Text style={s.btnText}>🗑️ Limpiar</Text>
          </Pressable>
        </View>
      </View>

      {/* Legend */}
      <View style={s.legend}>
        <Text style={s.legendText}>
          <Text style={{ color: C.muted }}>ℹ️ X-Request-ID y Accept-Language no están configurados en httpClient.ts</Text>
        </Text>
      </View>

      {/* Log table header */}
      <View style={s.tableHeader}>
        <Text style={[s.col, s.colTime]}>Hora</Text>
        <Text style={[s.col, s.colMethod]}>Method</Text>
        <Text style={[s.col, s.colStatus]}>Status</Text>
        <Text style={[s.col, s.colDuration]}>ms</Text>
        <Text style={[s.col, s.colUrl]}>URL</Text>
      </View>

      {/* Log entries */}
      {entries.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>Sin entradas aún. Corre el Write Suite para ver requests.</Text>
        </View>
      ) : (
        <ScrollView ref={scrollRef} style={s.logScroll}>
          {entries.map(entry => (
            <View key={entry.id} style={[s.row, entry.isKeycloakRefresh && s.rowKc]}>
              <Text style={[s.col, s.colTime, s.cellText]}>{entry.timeLabel}</Text>
              <Text style={[s.col, s.colMethod, s.cellText, s.methodText]}>{entry.method}</Text>
              <Text style={[s.col, s.colStatus, s.cellText, { color: statusColor(entry.status) }]}>
                {entry.status ?? 'ERR'}
              </Text>
              <Text style={[s.col, s.colDuration, s.cellText]}>{entry.duration}</Text>
              <Text
                style={[s.col, s.colUrl, s.cellText, s.urlText]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {entry.hasAuth ? '🔑 ' : ''}{entry.url}
              </Text>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.surface,
  },
  headerLeft: {
    flex: 1,
  },
  headerBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  subtitle: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
  highlight: {
    color: C.warn,
    fontWeight: '700',
  },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  btnCopy: {
    backgroundColor: '#1e3a5f',
    borderColor: C.info,
  },
  btnClear: {
    backgroundColor: '#3d1515',
    borderColor: C.fail,
  },
  btnText: {
    color: C.text,
    fontSize: 12,
    fontWeight: '600',
  },
  legend: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#131f35',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  legendText: {
    fontSize: 11,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 6,
    paddingVertical: 6,
    backgroundColor: '#263248',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2540',
  },
  rowKc: {
    backgroundColor: '#1a2f1a',
  },
  col: {
    paddingHorizontal: 2,
  },
  colTime:     { width: 72 },
  colMethod:   { width: 50 },
  colStatus:   { width: 42 },
  colDuration: { width: 40 },
  colUrl:      { flex: 1 },
  cellText: {
    fontSize: 11,
    color: C.text,
  },
  methodText: {
    color: C.info,
    fontWeight: '600',
  },
  urlText: {
    color: C.muted,
    fontSize: 10,
  },
  logScroll: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: C.muted,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
