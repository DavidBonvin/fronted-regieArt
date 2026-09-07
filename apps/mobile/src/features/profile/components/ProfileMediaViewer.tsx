import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ThemeColors } from '@regieart/ui';

export type ProfileMediaKind = 'avatar' | 'banner';

type ProfileMediaViewerProps = {
  visible: boolean;
  src: string | null;
  kind: ProfileMediaKind;
  userName: string;
  theme: ThemeColors;
  canEdit: boolean;
  onEdit: () => void;
  onClose: () => void;
};

const TITLE: Record<ProfileMediaKind, string> = {
  avatar: 'Foto de perfil',
  banner: 'Banner del perfil',
};

const EDIT_LABEL: Record<ProfileMediaKind, string> = {
  avatar: 'Cambiar la foto',
  banner: 'Cambiar el banner',
};

const SCREEN = Dimensions.get('window');
const AVATAR_SIZE = Math.min(SCREEN.width - 64, 340);
const BANNER_WIDTH = SCREEN.width - 32;

export function ProfileMediaViewer({
  visible, src, kind, userName, theme, canEdit, onEdit, onClose,
}: ProfileMediaViewerProps) {
  const enter = useRef(new Animated.Value(0)).current;
  const s = makeStyles(theme);

  useEffect(() => {
    if (!visible) { enter.setValue(0); return; }
    Animated.timing(enter, {
      toValue: 1,
      duration: 320,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: true,
    }).start();
  }, [visible, enter]);

  if (!src) return null;

  const stageStyle = {
    opacity: enter,
    transform: [
      { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
      { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
    ],
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={s.overlay} onPress={onClose} accessibilityLabel="Cerrar">
        <Pressable style={s.shell} onPress={() => {}}>
          <Animated.View style={[s.shellInner, stageStyle]}>
            <View style={s.caption}>
              <Text style={s.captionTitle}>{TITLE[kind]}</Text>
              <Text style={s.captionSub} numberOfLines={1}>{userName}</Text>
            </View>

            <View style={kind === 'avatar' ? s.avatarFrame : s.bannerFrame}>
              <Image
                source={{ uri: src }}
                style={kind === 'avatar' ? s.avatarImg : s.bannerImg}
                resizeMode={kind === 'avatar' ? 'cover' : 'contain'}
                accessibilityLabel={`${TITLE[kind]} de ${userName}`}
              />
            </View>

            <View style={s.actions}>
              {canEdit && (
                <Pressable style={s.btnPrimary} onPress={onEdit} accessibilityRole="button">
                  <Text style={s.btnPrimaryLabel}>📷  {EDIT_LABEL[kind]}</Text>
                </Pressable>
              )}
              <Pressable style={s.btn} onPress={onClose} accessibilityRole="button">
                <Text style={s.btnLabel}>Cerrar</Text>
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>

      <Pressable style={s.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar">
        <Text style={s.closeBtnText}>✕</Text>
      </Pressable>
    </Modal>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(10,12,13,0.92)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    shell: { width: '100%', alignItems: 'center' },
    shellInner: { width: '100%', alignItems: 'center', gap: 20 },
    caption: { alignItems: 'center', gap: 3 },
    captionTitle: { fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
    captionSub: { fontSize: 13, color: 'rgba(255,255,255,0.62)' },

    avatarFrame: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      overflow: 'hidden',
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    avatarImg: { width: '100%', height: '100%' },

    bannerFrame: {
      width: BANNER_WIDTH,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    bannerImg: { width: '100%', aspectRatio: 16 / 5 },

    actions: { width: '100%', gap: 10, paddingHorizontal: 8 },
    btnPrimary: {
      height: 46,
      borderRadius: 12,
      backgroundColor: theme.actionBrand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnPrimaryLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },
    btn: {
      height: 46,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnLabel: { fontSize: 14, fontWeight: '600', color: '#fff' },

    closeBtn: {
      position: 'absolute',
      top: 48,
      right: 16,
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      backgroundColor: 'rgba(255,255,255,0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: { fontSize: 15, color: '#fff' },
  });
}
