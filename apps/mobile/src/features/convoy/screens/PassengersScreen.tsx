import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Passengers'>;

export function PassengersScreen({ route }: Props) {
  const { vehicleId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Pasajeros y GPS Pickups</Text>
      <Text style={styles.id}>{vehicleId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 24, fontWeight: 'bold' },
  id: { fontSize: 14, marginTop: 8 },
});
