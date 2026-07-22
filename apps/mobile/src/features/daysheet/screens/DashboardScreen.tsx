import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function DashboardScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>RégieArt</Text>
        <Text style={styles.subtitle}>Mobile — Expo + React Native</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>✓ Metro Bundler activo en puerto 8081</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f0f',
  },
  card: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 40,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginHorizontal: 24,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 24,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 9999,
    backgroundColor: '#1a3a2a',
  },
  badgeText: {
    color: '#4ade80',
    fontSize: 13,
    fontWeight: '500',
  },
});
