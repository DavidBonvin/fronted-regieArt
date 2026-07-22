import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'DirectMessage'>;

export function DirectMessageScreen({ route }: Props) {
  const { userId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Chat 1 a 1</Text>
      <Text style={styles.id}>{userId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 24, fontWeight: 'bold' },
  id: { fontSize: 14, marginTop: 8 },
});
