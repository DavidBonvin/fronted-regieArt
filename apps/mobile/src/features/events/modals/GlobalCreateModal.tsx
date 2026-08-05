import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  BackHandler,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;


const ACTIONS = [
  {
    id: 'event',
    icon: '📅',
    accentHex: '#4A827E',
    title: 'Nuevo Evento',
    sub: 'Concierto, ensayo, audición...',
    available: true,
  },
  {
    id: 'song',
    icon: '🎵',
    accentHex: '#7E7B4A',
    title: 'Nueva Canción',
    sub: 'Agregar al repertorio',
    available: true,
  },
  {
    id: 'upload',
    icon: '📤',
    accentHex: '#4A6E7E',
    title: 'Subir Archivo',
    sub: 'Partitura, audio, documento técnico',
    available: false,
  },
  {
    id: 'finance',
    icon: '💰',
    accentHex: '#7E4F4A',
    title: 'Registrar Gasto',
    sub: 'Añadir viático o gasto de banda',
    available: false,
  },
  {
    id: 'message',
    icon: '💬',
    accentHex: '#4A4A8E',
    title: 'Nuevo Mensaje',
    sub: 'Escribir a un músico',
    available: false,
  },
  {
    id: 'invite',
    icon: '👥',
    accentHex: '#6E4A7E',
    title: 'Generar Invitación',
    sub: 'Link de acceso a la banda',
    available: false,
  },
] as const;


interface Props {
  onClose: () => void;
}


export function GlobalCreateModal({ onClose }: Props) {
  const navigation = useNavigation<Nav>();
  const { bottom } = useSafeAreaInsets();

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(340)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        tension: 68,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, sheetTranslateY]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 380,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(onClose);
  }, [backdropOpacity, sheetTranslateY, onClose]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => sub.remove();
  }, [handleClose]);

  const handleAction = useCallback(
    (id: string, available: boolean) => {
      if (!available) return;
      handleClose();
      setTimeout(() => {
        if (id === 'event') {
          navigation.navigate('CreateEventWizard');
        } else if (id === 'song') {
          navigation.navigate('CreateSongWizard');
        }
      }, 220);
    },
    [handleClose, navigation],
  );

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents="auto"
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={handleClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: bottom + 12, transform: [{ translateY: sheetTranslateY }] },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.handle} />

        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>¿Qué querés crear?</Text>
          <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={10}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.actionList}>
          {ACTIONS.map((action) => (
            <Pressable
              key={action.id}
              style={({ pressed }) => [
                styles.actionRow,
                !action.available && styles.actionRowDisabled,
                pressed && action.available && styles.actionRowPressed,
              ]}
              onPress={() => handleAction(action.id, action.available)}
              accessibilityRole="button"
              accessibilityState={{ disabled: !action.available }}
            >
              <View
                style={[
                  styles.actionIconBadge,
                  { backgroundColor: action.accentHex + '26' },
                ]}
              >
                <Text style={styles.actionIcon}>{action.icon}</Text>
              </View>

              <View style={styles.actionText}>
                <Text
                  style={[
                    styles.actionTitle,
                    !action.available && styles.actionTitleDisabled,
                  ]}
                >
                  {action.title}
                </Text>
                <Text style={styles.actionSub}>{action.sub}</Text>
              </View>

              {action.available ? (
                <View style={[styles.actionArrow, { backgroundColor: action.accentHex }]}>
                  <Text style={styles.actionArrowIcon}>›</Text>
                </View>
              ) : (
                <Text style={styles.actionLock}>🔒</Text>
              )}
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}


const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 10, 12, 0.72)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1C2127',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 24,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3A4049',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F6F8F9',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2C3240',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#8A96A8',
    fontSize: 14,
    fontWeight: '600',
  },
  actionList: {
    gap: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  actionRowDisabled: {
    opacity: 0.45,
  },
  actionRowPressed: {
    backgroundColor: '#262D38',
  },
  actionIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 22,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E8ECF0',
    letterSpacing: -0.1,
  },
  actionTitleDisabled: {
    color: '#6B7685',
  },
  actionSub: {
    fontSize: 12,
    color: '#6B7685',
    marginTop: 1,
  },
  actionArrow: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionArrowIcon: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  actionLock: {
    fontSize: 14,
    opacity: 0.6,
  },
});
