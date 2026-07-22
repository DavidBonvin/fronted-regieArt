import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'BandChat'>;

export function BandChatScreen({ route }: Props) {
  const { channelId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Chat de Banda</Text>
      <Text style={styles.id}>{channelId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 24, fontWeight: 'bold' },
  id: { fontSize: 14, marginTop: 8 },
});
