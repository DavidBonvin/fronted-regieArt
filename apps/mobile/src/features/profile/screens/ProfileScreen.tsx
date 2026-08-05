import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getMe, getMySkills, getMyProfileUrls, updateMe, addSkill, removeSkill,
  listSkillCategories, searchAssets, getDownloadUrl, logout, getConfig, uploadFile,
  resolveImageUrl,
} from '@regieart/api';
import type { User, UserSkill, SkillCategory, ExpertiseLevel, Asset } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';
import type { RootStackParamList } from '../../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type MediaTab = 'grid' | 'scores' | 'videos';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 4) / 3);

const EXPERTISE_COLORS: Record<ExpertiseLevel, string> = {
  BEGINNER: '#565D63',
  INTERMEDIATE: '#649D98',
  ADVANCED: '#4A827E',
  PROFESSIONAL: '#F59E0B',
};

const ASSET_ICONS: Partial<Record<string, string>> = {
  'music-score': '📄',
  'reference-video': '🎬',
  'audio-track': '🎵',
  'user-avatar': '👤',
  'user-banner': '🖼',
  'org-banner': '🏷',
};

const EXPERTISE_LEVELS: ExpertiseLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL'];

const AVATAR_CACHE_KEY = '@regieart:myAvatarCache';
const BANNER_CACHE_KEY = '@regieart:myBannerCache';

export function ProfileScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const s = makeStyles(theme);

  const [user, setUser] = useState<User | null>(null);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mediaTab, setMediaTab] = useState<MediaTab>('grid');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [avatarPickerMode, setAvatarPickerMode] = useState<null | 'main' | 'r2'>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerPickerMode, setBannerPickerMode] = useState<null | 'main' | 'r2'>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const cached = await AsyncStorage.getItem(AVATAR_CACHE_KEY).catch(() => null);
    if (cached) setAvatarUrl(cached);
    const cachedBanner = await AsyncStorage.getItem(BANNER_CACHE_KEY).catch(() => null);
    if (cachedBanner) setBannerUrl(cachedBanner);

    const [u, sk, media] = await Promise.all([
      getMe(),
      getMySkills(),
      searchAssets({ limit: 18 }).catch(() => ({ assets: [] as Asset[] })),
    ]);
    setUser({ ...u, memberships: u.memberships ?? [] });
    setSkills(sk);
    setAssets(media.assets ?? []);

    if (!cached || !cachedBanner) {
      const urls = await getMyProfileUrls().catch(() => ({ avatarUrl: null, bannerUrl: null }));
      if (!cached && urls.avatarUrl) {
        resolveImageUrl(urls.avatarUrl)
          .then((signed) => fetch(signed!))
          .then((r) => r.blob())
          .then((blob) => new Promise<string>((res, rej) => {
            const reader = new (globalThis as any).FileReader();
            reader.onloadend = () => res(reader.result as string);
            reader.onerror = rej;
            reader.readAsDataURL(blob);
          }))
          .then((dataUri) => {
            AsyncStorage.setItem(AVATAR_CACHE_KEY, dataUri).catch(() => {});
            setAvatarUrl(dataUri);
          })
          .catch(() => {});
      }
      if (!cachedBanner && urls.bannerUrl) {
        resolveImageUrl(urls.bannerUrl)
          .then((signed) => fetch(signed!))
          .then((r) => r.blob())
          .then((blob) => new Promise<string>((res, rej) => {
            const reader = new (globalThis as any).FileReader();
            reader.onloadend = () => res(reader.result as string);
            reader.onerror = rej;
            reader.readAsDataURL(blob);
          }))
          .then((dataUri) => {
            AsyncStorage.setItem(BANNER_CACHE_KEY, dataUri).catch(() => {});
            setBannerUrl(dataUri);
          })
          .catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleSignOut() {
    try {
      const { tokenAdapter } = getConfig();
      const tokens = await tokenAdapter.getTokens();
      if (tokens) await logout(tokens.refreshToken);
      await tokenAdapter.clearTokens();
    } catch {
      // eslint-disable-next-line no-empty
      try { await getConfig().tokenAdapter.clearTokens(); } catch { /* ignore */ }
    }
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }

  async function handleDeleteSkill(skillId: string) {
    await removeSkill(skillId);
    setSkills((prev) => prev.filter((sk) => sk.id !== skillId));
  }

  const filteredAssets = assets.filter((a) => {
    if (mediaTab === 'scores') return a.assetType === 'music-score';
    if (mediaTab === 'videos') return a.assetType === 'reference-video';
    return true;
  });

  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}><ActivityIndicator color={theme.actionBrand} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!user) return null;

  const initials = user.displayName.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  const totalYearsExp = skills.reduce((max, sk) => Math.max(max, sk.yearsExp ?? 0), 0);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.topNav}>
        <Text style={s.topNavUsername} numberOfLines={1}>{user.displayName}</Text>
        <Pressable onPress={handleSignOut} style={s.topNavBtn} accessibilityRole="button">
          <Text style={s.topNavBtnText}>⇥</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.actionBrand} />}
      >
        <Pressable
          style={s.banner}
          onPress={() => setBannerPickerMode('main')}
          accessibilityRole="button"
          accessibilityLabel="Cambiar banner de perfil"
        >
          {bannerUrl && (
            <Image
              source={{ uri: bannerUrl }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          )}
          <View style={[s.bannerGradient, bannerUrl ? s.bannerGradientDark : null]} />
          <View style={s.bannerEditHint}>
            <Text style={s.bannerEditHintText}>📷</Text>
          </View>
        </Pressable>

        <View style={s.headerRow}>
          <Pressable style={s.avatarWrap} onPress={() => setAvatarPickerMode('main')} accessibilityRole="button">
            {avatarUrl
              ? <Image source={{ uri: avatarUrl }} style={s.avatar} />
              : <View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View>
            }
            <View style={s.avatarEditBadge}><Text style={s.avatarEditBadgeText}>✎</Text></View>
          </Pressable>
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={s.statNum}>{user.memberships?.length ?? 0}</Text>
              <Text style={s.statLabel}>{t('profile.bands_label')}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statNum}>{skills.length}</Text>
              <Text style={s.statLabel}>{'Skills'}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statNum}>{totalYearsExp}</Text>
              <Text style={s.statLabel}>{'Años Exp.'}</Text>
            </View>
          </View>
        </View>

        <View style={s.bio}>
          <Text style={s.displayName}>{user.displayName}</Text>
          {user.bio ? <Text style={s.bioText}>{user.bio}</Text> : null}
          {(user.city || user.country) && (
            <Text style={s.location}>📍 {[user.city, user.country].filter(Boolean).join(', ')}</Text>
          )}
          {user.phone && <Text style={s.location}>📱 {user.phone}</Text>}
        </View>

        <View style={s.actionRow}>
          <Pressable style={s.actionBtn} onPress={() => setShowEditModal(true)}>
            <Text style={s.actionBtnLabel}>✏ {t('profile.edit_profile')}</Text>
          </Pressable>
          <Pressable style={s.actionBtn} onPress={() => setShowSkillModal(true)}>
            <Text style={s.actionBtnLabel}>{t('profile.add_skill')}</Text>
          </Pressable>
          <Pressable style={s.actionBtnIcon} onPress={() => navigation.navigate('TalentSearch')}>
            <Text style={s.actionBtnIconText}>⊕</Text>
          </Pressable>
        </View>

        {skills.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('profile.skills_section')}</Text>
            <View style={s.skillChips}>
              {skills.map((sk) => (
                <Pressable
                  key={sk.id}
                  style={[s.skillChip, { borderColor: EXPERTISE_COLORS[sk.expertiseLevel] }]}
                  onLongPress={() => handleDeleteSkill(sk.id)}
                >
                  <Text style={s.skillChipName}>{sk.skillCategory.name}</Text>
                  <Text style={[s.skillChipLevel, { color: EXPERTISE_COLORS[sk.expertiseLevel] }]}>
                    {' '}{t(`profile.expertise_levels.${sk.expertiseLevel}`)}
                  </Text>
                  {sk.yearsExp ? <Text style={s.skillChipYears}> · {sk.yearsExp}y</Text> : null}
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {(user.memberships?.length ?? 0) > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('profile.orgs_section')}</Text>
            {(user.memberships ?? []).map((m) => (
              <Pressable
                key={m.organization.id}
                style={s.orgRow}
                onPress={() => navigation.navigate('OrganizationDetail', { organizationId: m.organization.id })}
              >
                <View style={s.orgAvatar}>
                  <Text style={s.orgAvatarText}>
                    {m.organization.name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')}
                  </Text>
                </View>
                <Text style={s.orgName}>{m.organization.name}</Text>
                <View style={[s.roleChip, { backgroundColor: m.role === 'OWNER' ? '#F59E0B' : m.role === 'ADMIN' ? theme.actionBrand : theme.surfaceCard }]}>
                  <Text style={s.roleChipText}>{m.role}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <View style={s.mediaSection}>
          <View style={s.mediaTabBar}>
            {(['grid', 'scores', 'videos'] as MediaTab[]).map((tab) => (
              <Pressable key={tab} style={[s.mediaTab, mediaTab === tab && s.mediaTabActive]} onPress={() => setMediaTab(tab)}>
                <Text style={[s.mediaTabLabel, mediaTab === tab && s.mediaTabLabelActive]}>
                  {tab === 'grid' ? `🔲 ${t('profile.tab_grid')}` : tab === 'scores' ? `📄 ${t('profile.tab_scores')}` : `🎬 ${t('profile.tab_videos')}`}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={s.mediaTabLine} />
          {filteredAssets.length === 0
            ? <Text style={s.noMediaText}>{t('profile.no_media')}</Text>
            : (
              <View style={s.grid}>
                {filteredAssets.map((asset, idx) => (
                  <Pressable key={asset.id} style={[s.gridCell, idx % 3 !== 0 && s.gridCellGap]}>
                    <View style={[s.gridCellInner, { backgroundColor: assetBgColor(asset.assetType) }]}>
                      <Text style={s.gridCellIcon}>{ASSET_ICONS[asset.assetType] ?? '📁'}</Text>
                      <Text style={s.gridCellName} numberOfLines={2}>{asset.displayName ?? asset.originalName}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )
          }
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {avatarPickerMode === 'main' && (
        <AvatarPickerModal
          theme={theme} t={t}
          onUploaded={async (dataUri) => {
            await AsyncStorage.setItem(AVATAR_CACHE_KEY, dataUri).catch(() => {});
            setAvatarUrl(dataUri);
            setAvatarPickerMode(null);
          }}
          onR2Pick={() => setAvatarPickerMode('r2')}
          onClose={() => setAvatarPickerMode(null)}
        />
      )}
      {avatarPickerMode === 'r2' && (
        <R2AssetPickerModal
          theme={theme}
          onSelected={(url) => { setAvatarUrl(url); setAvatarPickerMode(null); }}
          onBack={() => setAvatarPickerMode('main')}
        />
      )}

      {bannerPickerMode === 'main' && (
        <BannerPickerModal
          theme={theme} t={t}
          onUploaded={async (dataUri) => {
            await AsyncStorage.setItem(BANNER_CACHE_KEY, dataUri).catch(() => {});
            setBannerUrl(dataUri);
            setBannerPickerMode(null);
          }}
          onR2Pick={() => setBannerPickerMode('r2')}
          onClose={() => setBannerPickerMode(null)}
        />
      )}
      {bannerPickerMode === 'r2' && (
        <R2AssetPickerModal
          theme={theme}
          onSelected={async (url) => {
            try {
              const res = await fetch(url);
              const blob = await res.blob();
              const reader = new (globalThis as any).FileReader();
              reader.onloadend = async () => {
                const dataUri = reader.result as string;
                await AsyncStorage.setItem(BANNER_CACHE_KEY, dataUri).catch(() => {});
                setBannerUrl(dataUri);
              };
              reader.readAsDataURL(blob);
            } catch { setBannerUrl(url); }
            setBannerPickerMode(null);
          }}
          onBack={() => setBannerPickerMode('main')}
        />
      )}
      {showEditModal && user && (
        <EditProfileModal
          user={user} theme={theme} t={t}
          onSave={async (dto) => {
            const updated = await updateMe(dto);
            setUser((prev) => ({ ...updated, memberships: updated.memberships ?? prev?.memberships ?? [] }));
            setShowEditModal(false);
          }}
          onClose={() => setShowEditModal(false)}
        />
      )}
      {showSkillModal && (
        <AddSkillModal
          theme={theme} t={t}
          onAdd={async (newSkill) => { setSkills((prev) => [...prev, newSkill]); setShowSkillModal(false); }}
          onClose={() => setShowSkillModal(false)}
        />
      )}
    </SafeAreaView>
  );
}

function AvatarPickerModal({ theme, t, onUploaded, onR2Pick, onClose }: {
  theme: ThemeColors;
  t: ReturnType<typeof useTranslation>['t'];
  onUploaded: (dataUri: string) => Promise<void>;
  onR2Pick: () => void;
  onClose: () => void;
}) {
  const s = makeStyles(theme);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(source: 'gallery' | 'camera') {
    setError(null);
    const permFn = source === 'camera'
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync;
    const { status } = await permFn();
    if (status !== 'granted') { setError('Permiso denegado'); return; }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: true });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';
    const dataUri = asset.base64
      ? `data:${mimeType};base64,${asset.base64}`
      : asset.uri;

    setUploading(true);
    try {
      await uploadFile(asset.uri, 'user-avatar', mimeType, {
        displayName: `avatar-${Date.now()}.jpg`,
        originalName: `avatar-${Date.now()}.jpg`,
      });
      await onUploaded(dataUri);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir imagen');
      setUploading(false);
    }
  }

  return (
    <Modal visible animationType="slide" transparent>
      <Pressable style={s.modalBg} onPress={onClose}>
        <Pressable style={[s.modalSheet, { paddingBottom: Platform.OS === 'ios' ? 40 : 24 }]} onPress={(e) => e.stopPropagation()}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>{t('profile.edit_profile')}</Text>

          {uploading ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <ActivityIndicator color={theme.actionBrand} size="large" />
              <Text style={[s.modalFieldLabel, { marginTop: 12, textAlign: 'center' }]}>Subiendo imagen…</Text>
            </View>
          ) : (
            <>
              <Pressable style={s.avatarPickerOption} onPress={() => pick('gallery')}>
                <Text style={s.avatarPickerIcon}>🖼️</Text>
                <View style={s.avatarPickerInfo}>
                  <Text style={s.avatarPickerTitle}>Biblioteca del dispositivo</Text>
                  <Text style={s.avatarPickerSub}>Elige una foto de tus álbumes</Text>
                </View>
              </Pressable>
              <Pressable style={s.avatarPickerOption} onPress={() => pick('camera')}>
                <Text style={s.avatarPickerIcon}>📸</Text>
                <View style={s.avatarPickerInfo}>
                  <Text style={s.avatarPickerTitle}>Tomar una fotografía</Text>
                  <Text style={s.avatarPickerSub}>Usa la cámara frontal o trasera</Text>
                </View>
              </Pressable>
              <Pressable style={s.avatarPickerOption} onPress={onR2Pick}>
                <Text style={s.avatarPickerIcon}>☁️</Text>
                <View style={s.avatarPickerInfo}>
                  <Text style={s.avatarPickerTitle}>Fotos de la App y Organizaciones</Text>
                  <Text style={s.avatarPickerSub}>Elige entre imágenes que ya has subido</Text>
                </View>
              </Pressable>
            </>
          )}

          {error && <Text style={[s.modalFieldLabel, { color: '#E05252', textAlign: 'center', marginTop: 8 }]}>{error}</Text>}
          <Pressable onPress={onClose} style={s.modalCancelBtn}>
            <Text style={s.modalCancelLabel}>{t('common.cancel')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function R2AssetPickerModal({ theme, onSelected, onBack }: {
  theme: ThemeColors;
  onSelected: (downloadUrl: string) => void;
  onBack: () => void;
}) {
  const s = makeStyles(theme);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await searchAssets({
        assetType: ['user-avatar', 'user-banner'],
        limit: 30,
      }).catch(() => ({ assets: [] as Asset[] }));
      setAssets(res.assets);
      const entries = await Promise.all(
        res.assets.map((a) =>
          getDownloadUrl(a.id)
            .then((r) => [a.id, r.downloadUrl] as const)
            .catch(() => null),
        ),
      );
      setThumbs(Object.fromEntries(entries.filter(Boolean) as [string, string][]));
      setLoading(false);
    }
    load();
  }, []);

  async function handleUse() {
    if (!selected) return;
    setApplying(true);
    const url = thumbs[selected.id];
    if (url) { onSelected(url); } else { setApplying(false); }
  }

  return (
    <Modal visible animationType="slide">
      <SafeAreaView style={[s.root, { flex: 1 }]} edges={['top']}>
        <View style={s.topNav}>
          <Pressable onPress={onBack} style={s.topNavBtn} accessibilityRole="button">
            <Text style={s.topNavBtnText}>←</Text>
          </Pressable>
          <Text style={[s.topNavUsername, { flex: 1, textAlign: 'center' }]}>Imágenes en RégieArt</Text>
          <View style={{ width: 32 }} />
        </View>

        {loading ? (
          <View style={s.center}><ActivityIndicator color={theme.actionBrand} size="large" /></View>
        ) : assets.length === 0 ? (
          <View style={s.center}>
            <Text style={s.noMediaText}>{'No tienes imágenes subidas aún.\nUsa "Galería" o "Cámara" para subir tu primera foto.'}</Text>
          </View>
        ) : (
          <>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[s.sectionTitle, { paddingHorizontal: 16, paddingTop: 14 }]}>
                Fotos subidas previamente a RégieArt
              </Text>
              <View style={s.grid}>
                {assets.map((asset, idx) => {
                  const isSelected = selected?.id === asset.id;
                  return (
                    <Pressable
                      key={asset.id}
                      style={[
                        s.gridCell,
                        idx % 3 !== 0 && s.gridCellGap,
                        isSelected && s.r2CellSelected,
                      ]}
                      onPress={() => setSelected(asset)}
                    >
                      {thumbs[asset.id] ? (
                        <Image
                          source={{ uri: thumbs[asset.id] }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[s.gridCellInner, { backgroundColor: assetBgColor(asset.assetType) }]}>
                          <Text style={s.gridCellIcon}>{ASSET_ICONS[asset.assetType] ?? '📁'}</Text>
                          <Text style={s.gridCellName} numberOfLines={1}>
                            {asset.displayName ?? asset.originalName}
                          </Text>
                        </View>
                      )}
                      {isSelected && (
                        <View style={s.r2SelectedBadge}>
                          <Text style={s.r2SelectedCheck}>✓</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ height: 100 }} />
            </ScrollView>

            <View style={s.r2Footer}>
              <Pressable
                style={[s.modalSaveBtn, (!selected || applying) && s.modalSaveBtnDisabled]}
                onPress={handleUse}
                disabled={!selected || applying}
              >
                <Text style={s.modalSaveBtnLabel}>
                  {applying ? 'Aplicando…' : 'USAR FOTO SELECCIONADA'}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function BannerPickerModal({ theme, t, onUploaded, onR2Pick, onClose }: {
  theme: ThemeColors;
  t: ReturnType<typeof useTranslation>['t'];
  onUploaded: (dataUri: string) => Promise<void>;
  onR2Pick: () => void;
  onClose: () => void;
}) {
  const s = makeStyles(theme);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    setError(null);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { setError('Permiso denegado'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 5],
      quality: 0.85,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';
    const dataUri = asset.base64
      ? `data:${mimeType};base64,${asset.base64}`
      : asset.uri;

    setUploading(true);
    try {
      await uploadFile(asset.uri, 'user-banner', mimeType, {
        displayName: `banner-${Date.now()}.jpg`,
        originalName: `banner-${Date.now()}.jpg`,
      });
      await onUploaded(dataUri);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir imagen');
      setUploading(false);
    }
  }

  return (
    <Modal visible animationType="slide" transparent>
      <Pressable style={s.modalBg} onPress={onClose}>
        <Pressable style={[s.modalSheet, { paddingBottom: Platform.OS === 'ios' ? 40 : 24 }]} onPress={(e) => e.stopPropagation()}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>Cambiar Banner de Perfil</Text>

          {uploading ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <ActivityIndicator color={theme.actionBrand} size="large" />
              <Text style={[s.modalFieldLabel, { marginTop: 12, textAlign: 'center' }]}>Subiendo banner…</Text>
            </View>
          ) : (
            <>
              <Pressable style={s.avatarPickerOption} onPress={pick}>
                <Text style={s.avatarPickerIcon}>🖼️</Text>
                <View style={s.avatarPickerInfo}>
                  <Text style={s.avatarPickerTitle}>Biblioteca del dispositivo</Text>
                  <Text style={s.avatarPickerSub}>Elige una foto horizontal (proporción 16:5)</Text>
                </View>
              </Pressable>
              <Pressable style={s.avatarPickerOption} onPress={onR2Pick}>
                <Text style={s.avatarPickerIcon}>☁️</Text>
                <View style={s.avatarPickerInfo}>
                  <Text style={s.avatarPickerTitle}>Galería de RégieArt</Text>
                  <Text style={s.avatarPickerSub}>Elige entre imágenes subidas a la app</Text>
                </View>
              </Pressable>
            </>
          )}

          {error && (
            <Text style={[s.modalFieldLabel, { color: '#E05252', textAlign: 'center', marginTop: 8 }]}>{error}</Text>
          )}
          <Pressable onPress={onClose} style={s.modalCancelBtn}>
            <Text style={s.modalCancelLabel}>{t('common.cancel')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function EditProfileModal({ user, theme, t, onSave, onClose }: {
  user: User; theme: ThemeColors;
  t: ReturnType<typeof useTranslation>['t'];
  onSave: (dto: Record<string, string>) => Promise<void>;
  onClose: () => void;
}) {
  const s = makeStyles(theme);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio ?? '');
  const [city, setCity] = useState(user.city ?? '');
  const [country, setCountry] = useState(user.country ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [saving, setSaving] = useState(false);
  async function handleSave() {
    setSaving(true);
    try { await onSave({ displayName: displayName.trim(), bio: bio.trim(), city: city.trim(), country: country.trim(), phone: phone.trim() }); }
    finally { setSaving(false); }
  }
  return (
    <Modal visible animationType="slide" transparent>
      <KeyboardAvoidingView style={s.modalBg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>{t('profile.edit_title')}</Text>
          {[
            { key: 'dn', value: displayName, set: setDisplayName, label: t('profile.field_display_name') },
            { key: 'bio', value: bio, set: setBio, label: t('profile.field_bio'), multi: true },
            { key: 'city', value: city, set: setCity, label: t('profile.field_city') },
            { key: 'country', value: country, set: setCountry, label: t('profile.field_country') },
            { key: 'phone', value: phone, set: setPhone, label: t('profile.field_phone') },
          ].map(({ key, value, set, label, multi }) => (
            <View key={key} style={s.modalField}>
              <Text style={s.modalFieldLabel}>{label}</Text>
              <TextInput style={[s.modalInput, multi && s.modalTextarea]} value={value} onChangeText={set} multiline={multi} numberOfLines={multi ? 3 : 1} placeholderTextColor={theme.textMuted} />
            </View>
          ))}
          <Pressable style={[s.modalSaveBtn, saving && s.modalSaveBtnDisabled]} onPress={handleSave} disabled={saving}>
            <Text style={s.modalSaveBtnLabel}>{saving ? t('profile.saving_profile') : t('profile.save_profile')}</Text>
          </Pressable>
          <Pressable onPress={onClose} style={s.modalCancelBtn}><Text style={s.modalCancelLabel}>{t('common.cancel')}</Text></Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AddSkillModal({ theme, t, onAdd, onClose }: {
  theme: ThemeColors;
  t: ReturnType<typeof useTranslation>['t'];
  onAdd: (skill: UserSkill) => Promise<void>;
  onClose: () => void;
}) {
  const s = makeStyles(theme);
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [selected, setSelected] = useState<SkillCategory | null>(null);
  const [level, setLevel] = useState<ExpertiseLevel>('INTERMEDIATE');
  const [years, setYears] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { listSkillCategories().then(setCategories).catch(() => {}); }, []);
  async function handleAdd() {
    if (!selected) return;
    setSaving(true);
    try {
      const newSkill = await addSkill({ skillCategoryId: selected.id, expertiseLevel: level, yearsExp: years ? parseInt(years, 10) : undefined });
      await onAdd(newSkill);
    } finally { setSaving(false); }
  }
  return (
    <Modal visible animationType="slide" transparent>
      <KeyboardAvoidingView style={s.modalBg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>{t('skills.add_btn')}</Text>
          <Text style={s.modalFieldLabel}>{t('skills.pick_category')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {categories.map((cat) => (
              <Pressable key={cat.id} style={[s.catChip, selected?.id === cat.id && s.catChipActive]} onPress={() => setSelected(cat)}>
                <Text style={[s.catChipLabel, selected?.id === cat.id && s.catChipLabelActive]}>{cat.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={s.levelRow}>
            {EXPERTISE_LEVELS.map((lv) => (
              <Pressable key={lv} style={[s.levelChip, level === lv && { backgroundColor: EXPERTISE_COLORS[lv] }]} onPress={() => setLevel(lv)}>
                <Text style={[s.levelChipLabel, level === lv && { color: '#fff' }]}>{t(`profile.expertise_levels.${lv}`)}</Text>
              </Pressable>
            ))}
          </View>
          <View style={s.modalField}>
            <Text style={s.modalFieldLabel}>{'Años de experiencia'}</Text>
            <TextInput style={s.modalInput} value={years} onChangeText={setYears} keyboardType="number-pad" placeholder="5" placeholderTextColor={theme.textMuted} />
          </View>
          <Pressable style={[s.modalSaveBtn, (!selected || saving) && s.modalSaveBtnDisabled]} onPress={handleAdd} disabled={!selected || saving}>
            <Text style={s.modalSaveBtnLabel}>{saving ? t('common.loading') : t('profile.add_skill')}</Text>
          </Pressable>
          <Pressable onPress={onClose} style={s.modalCancelBtn}><Text style={s.modalCancelLabel}>{t('common.cancel')}</Text></Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function assetBgColor(type: string): string {
  const map: Record<string, string> = { 'music-score': '#1A3A5C30', 'reference-video': '#3A1A5C30', 'audio-track': '#1A5C3A30' };
  return map[type] ?? '#3A3A3A25';
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.surfaceApp },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
    topNavUsername: { fontSize: 16, fontWeight: '700', color: theme.textHeading, flex: 1 },
    topNavBtn: { padding: 6 },
    topNavBtnText: { fontSize: 20, color: theme.textSecondary },
    banner: { height: 140, overflow: 'hidden', position: 'relative' },
    bannerGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.actionBrand, opacity: 0.25 },
    bannerGradientDark: { opacity: 0.35 },
    bannerEditHint: {
      position: 'absolute', bottom: 8, right: 12,
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.42)',
      borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    },
    bannerEditHintText: { fontSize: 16, color: '#fff' },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: -32, marginBottom: 12, gap: 16 },
    avatarWrap: { borderRadius: 44, borderWidth: 3, borderColor: theme.surfaceApp, alignSelf: 'flex-start', position: 'relative' },
    avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: theme.actionBrand, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: theme.surfaceCard, borderWidth: 2, borderColor: theme.surfaceApp, alignItems: 'center', justifyContent: 'center' },
    avatarEditBadgeText: { fontSize: 11, color: theme.textSecondary },
    avatarPickerOption: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.borderSubtle },
    avatarPickerIcon: { fontSize: 28, width: 36, textAlign: 'center' },
    avatarPickerInfo: { flex: 1 },
    avatarPickerTitle: { fontSize: 15, fontWeight: '600', color: theme.textHeading },
    avatarPickerSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
    avatarText: { fontSize: 26, fontWeight: '800', color: '#fff' },
    statsRow: { flex: 1, flexDirection: 'row', alignItems: 'center', marginTop: 38 },
    statItem: { flex: 1, alignItems: 'center' },
    statNum: { fontSize: 20, fontWeight: '700', color: theme.textHeading, letterSpacing: -0.3 },
    statLabel: { fontSize: 11, color: theme.textMuted, marginTop: 2, textAlign: 'center' },
    statDivider: { width: 1, height: 26, backgroundColor: theme.borderSubtle },
    bio: { paddingHorizontal: 16, marginBottom: 14 },
    displayName: { fontSize: 17, fontWeight: '700', color: theme.textHeading, letterSpacing: -0.2, marginBottom: 4 },
    bioText: { fontSize: 14, color: theme.textBody, lineHeight: 20, marginBottom: 3 },
    location: { fontSize: 13, color: theme.textSecondary, marginBottom: 2 },
    actionRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 20 },
    actionBtn: { flex: 1, borderWidth: 1, borderColor: theme.borderSubtle, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
    actionBtnLabel: { fontSize: 13, fontWeight: '600', color: theme.textBody },
    actionBtnIcon: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: theme.borderSubtle, alignItems: 'center', justifyContent: 'center' },
    actionBtnIconText: { fontSize: 20, color: theme.textSecondary },
    section: { paddingHorizontal: 16, marginBottom: 20 },
    sectionTitle: { fontSize: 11, fontWeight: '700', color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
    skillChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    skillChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.surfaceCard },
    skillChipName: { fontSize: 13, fontWeight: '600', color: theme.textHeading },
    skillChipLevel: { fontSize: 11, fontWeight: '700' },
    skillChipYears: { fontSize: 11, color: theme.textMuted },
    orgRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surfaceCard, borderRadius: 12, padding: 12, marginBottom: 8, gap: 12 },
    orgAvatar: { width: 36, height: 36, borderRadius: 10, backgroundColor: `${theme.actionBrand}30`, alignItems: 'center', justifyContent: 'center' },
    orgAvatarText: { fontSize: 12, fontWeight: '700', color: theme.actionBrand },
    orgName: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.textHeading },
    roleChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    roleChipText: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
    mediaSection: { borderTopWidth: 1, borderTopColor: theme.borderSubtle },
    mediaTabBar: { flexDirection: 'row' },
    mediaTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    mediaTabActive: { borderBottomColor: theme.actionBrand },
    mediaTabLabel: { fontSize: 13, color: theme.textMuted },
    mediaTabLabelActive: { color: theme.actionBrand, fontWeight: '700' },
    mediaTabLine: { height: 1, backgroundColor: theme.borderSubtle },
    noMediaText: { fontSize: 14, color: theme.textMuted, textAlign: 'center', padding: 32 },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    gridCell: { width: CELL_SIZE, height: CELL_SIZE, marginBottom: 2 },
    gridCellGap: { marginLeft: 2 },
    gridCellInner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 8 },
    gridCellIcon: { fontSize: 28, marginBottom: 4 },
    gridCellName: { fontSize: 10, color: theme.textSecondary, textAlign: 'center' },
    r2CellSelected: { borderWidth: 3, borderColor: theme.actionBrand },
    r2SelectedBadge: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: theme.actionBrand, alignItems: 'center', justifyContent: 'center' },
    r2SelectedCheck: { fontSize: 13, color: '#fff', fontWeight: '700' },
    r2Footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: theme.surfaceApp, borderTopWidth: 1, borderTopColor: theme.borderSubtle },
    modalBg: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalSheet: { backgroundColor: theme.surfaceCard, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, maxHeight: '90%' },
    modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: theme.borderSubtle, alignSelf: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: theme.textHeading, marginBottom: 20 },
    modalField: { marginBottom: 14 },
    modalFieldLabel: { fontSize: 11, fontWeight: '700', color: theme.textMuted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 },
    modalInput: { backgroundColor: theme.surfaceApp, borderRadius: 10, borderWidth: 1, borderColor: theme.borderSubtle, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: theme.textBody },
    modalTextarea: { height: 72, textAlignVertical: 'top', paddingTop: 11 },
    modalSaveBtn: { backgroundColor: theme.actionBrand, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4, marginBottom: 10 },
    modalSaveBtnDisabled: { opacity: 0.5 },
    modalSaveBtnLabel: { fontSize: 15, fontWeight: '700', color: '#fff' },
    modalCancelBtn: { alignItems: 'center', paddingVertical: 8 },
    modalCancelLabel: { fontSize: 14, color: theme.textSecondary },
    catChip: { borderWidth: 1, borderColor: theme.borderSubtle, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: theme.surfaceApp },
    catChipActive: { borderColor: theme.actionBrand, backgroundColor: `${theme.actionBrand}20` },
    catChipLabel: { fontSize: 13, color: theme.textSecondary },
    catChipLabelActive: { color: theme.actionBrand, fontWeight: '700' },
    levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    levelChip: { borderWidth: 1, borderColor: theme.borderSubtle, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: theme.surfaceApp },
    levelChipLabel: { fontSize: 12, color: theme.textSecondary, fontWeight: '600' },
  });
}
