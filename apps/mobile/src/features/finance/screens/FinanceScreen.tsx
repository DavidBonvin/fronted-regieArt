import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function FinanceScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Finanzas</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 24, fontWeight: 'bold' },
});
