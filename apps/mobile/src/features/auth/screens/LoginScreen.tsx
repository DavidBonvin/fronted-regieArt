import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Iniciar sesión</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
  },
});
