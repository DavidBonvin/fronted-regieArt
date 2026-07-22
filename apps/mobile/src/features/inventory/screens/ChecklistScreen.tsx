import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Checklist'>;

export function ChecklistScreen({ route }: Props) {
  const { daysheetId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Checklist de Equipamiento</Text>
      <Text style={styles.id}>{daysheetId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 24, fontWeight: 'bold' },
  id: { fontSize: 14, marginTop: 8 },
});
