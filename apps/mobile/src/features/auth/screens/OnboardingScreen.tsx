import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export function OnboardingScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Bienvenido a RégieArt</Text>
      {__DEV__ && (
        <View style={styles.devSection}>
          <Text style={styles.devLabel}>DEV TOOLS</Text>
          <Pressable
            style={styles.devBtn}
            onPress={() => navigation.navigate('DevPlayground')}
          >
            <Text style={styles.devBtnText}>✍️ Write Suite (11 fases)</Text>
          </Pressable>
          <Pressable
            style={[styles.devBtn, styles.devBtnSecondary]}
            onPress={() => navigation.navigate('DevTools')}
          >
            <Text style={[styles.devBtnText, styles.devBtnTextSecondary]}>🛠️ DevTools — Request Log</Text>
          </Pressable>
          <Pressable
            style={[styles.devBtn, styles.devBtnStorage]}
            onPress={() => navigation.navigate('StorageSuite')}
          >
            <Text style={[styles.devBtnText, styles.devBtnTextStorage]}>📦 Storage Suite — Upload R2</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 40,
  },
  devSection: {
    alignItems: 'stretch',
    width: '80%',
    gap: 10,
  },
  devLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 4,
  },
  devBtn: {
    backgroundColor: '#1e3a5f',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
  },
  devBtnSecondary: {
    backgroundColor: '#1a2a1a',
    borderColor: '#22c55e',
  },
  devBtnStorage: {
    backgroundColor: '#1a1a2a',
    borderColor: '#f59e0b',
  },
  devBtnText: {
    color: '#3b82f6',
    fontWeight: '700',
    fontSize: 14,
  },
  devBtnTextSecondary: {
    color: '#22c55e',
  },
  devBtnTextStorage: {
    color: '#f59e0b',
  },
});
