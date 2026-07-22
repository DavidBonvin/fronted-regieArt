import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function TalentSearchScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Búsqueda de Talentos</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 24, fontWeight: 'bold' },
});
