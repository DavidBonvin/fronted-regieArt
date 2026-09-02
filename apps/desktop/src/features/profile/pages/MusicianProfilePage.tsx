import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getMe, getMySkills, getMyProfileUrls, updateMe, addSkill, removeSkill,
  listSkillCategories, searchAssets, getUserById, getUserSkills, resolveImageUrl,
} from '@regieart/api';
import type { User, UserPublic, UserSkill, SkillCategory, ExpertiseLevel, Asset } from '@regieart/types';
import {
  AvatarSourceModal, AvatarCropModal, WebcamCaptureModal,
  R2GalleryModal, AvatarUploadingModal, runAvatarUpload,
  BannerSourceModal, BannerCropModal, BannerR2GalleryModal, runBannerUpload,
} from './AvatarFlowModals';
import type { AvatarFlowMode, BannerFlowMode } from './AvatarFlowModals';
import p from '../../../shared/layout/page.module.scss';
import s from './MusicianProfilePage.module.scss';

const AVATAR_CACHE_KEY = 'regieart:myAvatarCache';
const BANNER_CACHE_KEY = 'regieart:myBannerCache';

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

type MediaTab = 'gallery' | 'scores' | 'videos';

const LEVEL_COLOR: Record<string, string> = {
  BEGINNER: '#565D63',
  INTERMEDIATE: '#649D98',
  ADVANCED: '#4A827E',
  PROFESSIONAL: '#F59E0B',
};

const EXPERTISE_LEVELS: ExpertiseLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL'];

const ASSET_ICONS: Record<string, string> = {
  'music-score': '📄',
  'reference-video': '🎬',
  'audio-track': '🎵',
  'user-avatar': '👤',
};

export function MusicianProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isOwn = userId === 'me';

  const [user, setUser] = useState<User | UserPublic | null>(null);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [mediaTab, setMediaTab] = useState<MediaTab>('gallery');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    try { return localStorage.getItem(AVATAR_CACHE_KEY); } catch { return null; }
  });
  const [bannerUrl, setBannerUrl] = useState<string | null>(() => {
    try { return localStorage.getItem(BANNER_CACHE_KEY); } catch { return null; }
  });

  const [bannerMode, setBannerMode] = useState<BannerFlowMode>(null);
  const [bannerCropSrc, setBannerCropSrc] = useState<string | null>(null);
  const [bannerProgress, setBannerProgress] = useState(0);
  const [bannerStep, setBannerStep] = useState(0);
  const [avatarMode, setAvatarMode] = useState<AvatarFlowMode>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const userPromise = isOwn ? getMe() : getUserById(userId);
    const skillsPromise = isOwn ? getMySkills() : getUserSkills(userId);
    const urlsPromise = isOwn
      ? getMyProfileUrls().catch(() => ({ avatarUrl: null, bannerUrl: null }))
      : Promise.resolve({ avatarUrl: null, bannerUrl: null });
    Promise.all([
      userPromise,
      skillsPromise,
      searchAssets({ limit: 24 }).catch(() => ({ assets: [] as Asset[] })),
      urlsPromise,
    ])
      .then(([u, sk, media, urls]) => {
        setUser(u); setSkills(sk); setAssets(media.assets ?? []);
        const hasCachedAvatar = Boolean(localStorage.getItem(AVATAR_CACHE_KEY));
        if (!hasCachedAvatar && urls.avatarUrl) {
          resolveImageUrl(urls.avatarUrl)
            .then((signedUrl) => fetch(signedUrl!))
            .then((r) => r.blob())
            .then(blobToDataUrl)
            .then((dataUrl) => {
              try { localStorage.setItem(AVATAR_CACHE_KEY, dataUrl); } catch { /* ignore */ }
              setAvatarUrl(dataUrl);
            })
            .catch(() => {});
        }
        const hasBannerCache = Boolean(localStorage.getItem(BANNER_CACHE_KEY));
        if (!hasBannerCache && urls.bannerUrl) {
          resolveImageUrl(urls.bannerUrl)
            .then((signedUrl) => fetch(signedUrl!))
            .then((r) => r.blob())
            .then(blobToDataUrl)
            .then((dataUrl) => {
              try { localStorage.setItem(BANNER_CACHE_KEY, dataUrl); } catch { /* ignore */ }
              setBannerUrl(dataUrl);
            })
            .catch(() => {});
        }
      })
      .finally(() => setLoading(false));
  }, [userId, isOwn]);

  async function handleBannerBlob(blob: Blob) {
    const dataUrl = await blobToDataUrl(blob);
    setBannerUrl(dataUrl);
    try { localStorage.setItem(BANNER_CACHE_KEY, dataUrl); } catch { /* ignore */ }
    setBannerMode('uploading');
    setBannerProgress(0);
    setBannerStep(0);
    try {
      await runBannerUpload(blob, (p, step) => {
        setBannerProgress(p);
        setBannerStep(step);
      });
    } catch { /* local display already updated */ }
    finally { setBannerMode(null); }
  }

  async function handleUploadBlob(blob: Blob) {
    const dataUrl = await blobToDataUrl(blob);
    setAvatarUrl(dataUrl);
    try { localStorage.setItem(AVATAR_CACHE_KEY, dataUrl); } catch { /* ignore */ }

    setAvatarMode('uploading');
    setUploadProgress(0);
    setUploadStep(0);
    try {
      await runAvatarUpload(blob, (p, step) => {
        setUploadProgress(p);
        setUploadStep(step);
      });
    } catch { /* display already updated, upload failed silently */ }
    finally { setAvatarMode(null); }
  }

  async function handleSaveProfile(dto: Record<string, string>) {
    const updated = await updateMe(dto as Parameters<typeof updateMe>[0]);
    setUser(updated);
    setShowEditModal(false);
  }

  async function handleAddSkill(newSkill: UserSkill) {
    setSkills((prev) => [...prev, newSkill]);
    setShowSkillModal(false);
  }

  async function handleRemoveSkill(skillId: string) {
    await removeSkill(skillId);
    setSkills((prev) => prev.filter((sk) => sk.id !== skillId));
  }

  const filteredAssets = assets.filter((a) => {
    if (mediaTab === 'scores') return a.assetType === 'music-score';
    if (mediaTab === 'videos') return a.assetType === 'reference-video';
    return true;
  });

  if (loading) return <div className={p.spinner} style={{ margin: '48px auto' }} />;
  if (!user) return <div className={p.page}><div className={p.card}><span className={s.empty}>{t('common.not_found')}</span></div></div>;

  const initials = user.displayName.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  const totalYears = skills.reduce((max, sk) => Math.max(max, sk.yearsExp ?? 0), 0);
  const memberships = 'memberships' in user ? user.memberships : [];

  return (
    <div className={s.root}>
      <div
        className={s.banner}
        style={bannerUrl ? { backgroundImage: `url("${bannerUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        <div className={s.bannerOverlay} />
        {isOwn && (
          <button
            className={s.bannerEditBtn}
            onClick={() => setBannerMode('source')}
            title="Cambiar banner"
          >
            📷 Cambiar banner de perfil
          </button>
        )}
      </div>

      <div className={s.heroWrap}>
        <div className={s.heroLeft}>
          <div className={s.avatarWrap}>
            {avatarUrl
              ? <img
                  src={avatarUrl}
                  className={s.avatarImg}
                  alt={user.displayName}
                  onError={() => {
                    try { localStorage.removeItem(AVATAR_CACHE_KEY); } catch { /* ignore */ }
                    setAvatarUrl(null);
                  }}
                />
              : <div className={s.avatarCircle}>{initials}</div>
            }
            {isOwn && (
              <button
                className={s.avatarEditOverlay}
                onClick={() => setAvatarMode('source')}
                title="Cambiar foto de perfil"
              >
                <span className={s.avatarCamIcon}>📷</span>
                <span className={s.avatarCamText}>Cambiar foto</span>
              </button>
            )}
          </div>
          <div className={s.heroMeta}>
            <div className={s.heroName}>{user.displayName}</div>
            {user.bio && <div className={s.heroBio}>{user.bio}</div>}
            <div className={s.heroLocation}>
              {user.city && <span>📍 {[user.city, user.country].filter(Boolean).join(', ')}</span>}
              {'phone' in user && user.phone && <span>📱 {user.phone}</span>}
            </div>
          </div>
        </div>
        <div className={s.heroStats}>
          <div className={s.statBox}><span className={s.statNum}>{memberships.length}</span><span className={s.statLabel}>{t('profile.bands_label')}</span></div>
          <div className={s.statDivider} />
          <div className={s.statBox}><span className={s.statNum}>{skills.length}</span><span className={s.statLabel}>Skills</span></div>
          <div className={s.statDivider} />
          <div className={s.statBox}><span className={s.statNum}>{totalYears}</span><span className={s.statLabel}>Años exp.</span></div>
        </div>
      </div>

      <div className={s.actionBar}>
        {isOwn ? (
          <>
            <button className={s.actionBtn} onClick={() => setShowEditModal(true)}>✏ {t('profile.edit_profile')}</button>
            <button className={s.actionBtn} onClick={() => setAvatarMode('source')}>📷 Cambiar Foto de Perfil</button>
            <button className={s.actionBtn} onClick={() => setShowSkillModal(true)}>{t('profile.add_skill')}</button>
            <button className={s.actionBtnSecondary}>{t('profile.export_cv')}</button>
          </>
        ) : (
          <button className={s.actionBtnPrimary} onClick={() => navigate(`/messages/direct/${userId}`)}>{t('profile.message_btn')}</button>
        )}
      </div>

      <div className={s.body}>
        <aside className={s.aside}>
          {skills.length > 0 && (
            <div className={s.card}>
              <div className={s.sectionTitle}>{t('profile.skills_section')}</div>
              <div className={s.skillList}>
                {skills.map((sk) => (
                  <div key={sk.id} className={s.skillRow}>
                    <div className={s.skillDot} style={{ background: LEVEL_COLOR[sk.expertiseLevel] }} />
                    <div className={s.skillInfo}>
                      <span className={s.skillName}>{sk.skillCategory?.name ?? ''}</span>
                      <span className={s.skillLevel} style={{ color: LEVEL_COLOR[sk.expertiseLevel] }}>{sk.expertiseLevel}</span>
                      {sk.yearsExp ? <span className={s.skillYears}>{sk.yearsExp}y</span> : null}
                    </div>
                    {isOwn && (
                      <button className={s.skillDelete} onClick={() => handleRemoveSkill(sk.id)} title="Remove">✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {memberships.length > 0 && (
            <div className={s.card}>
              <div className={s.sectionTitle}>{t('profile.orgs_section')}</div>
              <div className={s.orgList}>
                {memberships.map((m: { organization: { id: string; name: string }; role: string }) => (
                  <div key={m.organization.id} className={s.orgRow}
                    onClick={() => navigate(`/organization/${m.organization.id}`)}
                    role="button" tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/organization/${m.organization.id}`)}
                  >
                    <div className={s.orgAvatar}>
                      {m.organization.name.split(' ').slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? '').join('')}
                    </div>
                    <span className={s.orgName}>{m.organization.name}</span>
                    <span className={s.roleChip} data-role={m.role}>{m.role}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        <main className={s.main}>
          <div className={s.card}>
            <div className={s.mediaTabs}>
              {(['gallery', 'scores', 'videos'] as MediaTab[]).map((tab) => (
                <button key={tab} className={`${s.mediaTab} ${mediaTab === tab ? s.mediaTabActive : ''}`} onClick={() => setMediaTab(tab)}>
                  {tab === 'gallery' ? `🔲 ${t('profile.tab_grid')}` : tab === 'scores' ? `📄 ${t('profile.tab_scores')}` : `🎬 ${t('profile.tab_videos')}`}
                </button>
              ))}
            </div>
            {filteredAssets.length === 0
              ? <div className={s.emptyMedia}>{t('profile.no_media')}</div>
              : (
                <div className={s.assetGrid}>
                  {filteredAssets.map((a) => (
                    <div key={a.id} className={s.assetCell} style={{ background: assetBg(a.assetType) }}>
                      <span className={s.assetIcon}>{ASSET_ICONS[a.assetType] ?? '📁'}</span>
                      <span className={s.assetName}>{a.displayName ?? a.originalName}</span>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </main>
      </div>

      {bannerMode === 'source' && (
        <BannerSourceModal
          onFile={(src) => { setBannerCropSrc(src); setBannerMode('crop'); }}
          onR2={() => setBannerMode('r2')}
          onClose={() => setBannerMode(null)}
        />
      )}
      {bannerMode === 'crop' && bannerCropSrc && (
        <BannerCropModal
          imageSrc={bannerCropSrc}
          onConfirm={(blob) => handleBannerBlob(blob)}
          onChangeImage={() => setBannerMode('source')}
          onCancel={() => setBannerMode(null)}
        />
      )}
      {bannerMode === 'r2' && (
        <BannerR2GalleryModal
          onSelect={(url) => {
            setBannerUrl(url);
            fetch(url).then(r => r.blob()).then(blobToDataUrl)
              .then(d => { try { localStorage.setItem(BANNER_CACHE_KEY, d); } catch { /* ignore */ } setBannerUrl(d); })
              .catch(() => {});
            setBannerMode(null);
          }}
          onCancel={() => setBannerMode('source')}
        />
      )}
      {bannerMode === 'uploading' && (
        <AvatarUploadingModal progress={bannerProgress} step={bannerStep} />
      )}

      {avatarMode === 'source' && (
        <AvatarSourceModal
          onFile={(src) => { setCropSrc(src); setAvatarMode('crop'); }}
          onWebcam={() => setAvatarMode('webcam')}
          onR2={() => setAvatarMode('r2')}
          onClose={() => setAvatarMode(null)}
        />
      )}
      {avatarMode === 'crop' && cropSrc && (
        <AvatarCropModal
          imageSrc={cropSrc}
          userName={user.displayName}
          userRole={user.bio ?? undefined}
          onConfirm={(blob) => handleUploadBlob(blob)}
          onChangeImage={() => setAvatarMode('source')}
          onCancel={() => setAvatarMode(null)}
        />
      )}
      {avatarMode === 'webcam' && (
        <WebcamCaptureModal
          onCapture={(dataUrl) => { setCropSrc(dataUrl); setAvatarMode('crop'); }}
          onCancel={() => setAvatarMode('source')}
        />
      )}
      {avatarMode === 'r2' && (
        <R2GalleryModal
          onSelect={(url) => {
            setAvatarUrl(url);
            fetch(url)
              .then((r) => r.blob())
              .then(blobToDataUrl)
              .then((dataUrl) => {
                try { localStorage.setItem(AVATAR_CACHE_KEY, dataUrl); } catch { /* ignore */ }
                setAvatarUrl(dataUrl);
              })
              .catch(() => {});
            setAvatarMode(null);
          }}
          onCancel={() => setAvatarMode('source')}
        />
      )}
      {avatarMode === 'uploading' && (
        <AvatarUploadingModal progress={uploadProgress} step={uploadStep} />
      )}
      {showEditModal && isOwn && 'phone' in user && (
        <EditProfileModal user={user as User} t={t} onSave={handleSaveProfile} onClose={() => setShowEditModal(false)} />
      )}
      {showSkillModal && isOwn && (
        <AddSkillModal t={t} onAdd={handleAddSkill} onClose={() => setShowSkillModal(false)} />
      )}
    </div>
  );
}

function EditProfileModal({ user, t, onSave, onClose }: {
  user: User;
  t: ReturnType<typeof import('react-i18next').useTranslation>['t'];
  onSave: (dto: Record<string, string>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ displayName: user.displayName, bio: user.bio ?? '', city: user.city ?? '', country: user.country ?? '', phone: user.phone ?? '' });
  const [saving, setSaving] = useState(false);
  function field(k: keyof typeof form) { return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value })); }
  async function handleSave() { setSaving(true); try { await onSave(form); } finally { setSaving(false); } }
  return (
    <div className={s.modalOverlay} onClick={onClose}>
      <div className={s.modalBox} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalTitle}>{t('profile.edit_title')}</div>
        {(['displayName', 'bio', 'city', 'country', 'phone'] as const).map((k) => (
          <div key={k} className={s.modalField}>
            <label className={s.modalLabel}>{t(`profile.field_${k === 'displayName' ? 'display_name' : k}`)}</label>
            {k === 'bio'
              ? <textarea className={s.modalInput} value={form[k]} onChange={field(k)} rows={3} />
              : <input className={s.modalInput} value={form[k]} onChange={field(k)} />}
          </div>
        ))}
        <div className={s.modalFooter}>
          <button className={s.modalCancelBtn} onClick={onClose}>{t('common.cancel')}</button>
          <button className={s.modalSaveBtn} onClick={handleSave} disabled={saving}>
            {saving ? t('profile.saving_profile') : t('profile.save_profile')}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddSkillModal({ t, onAdd, onClose }: {
  t: ReturnType<typeof import('react-i18next').useTranslation>['t'];
  onAdd: (skill: UserSkill) => Promise<void>;
  onClose: () => void;
}) {
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [selected, setSelected] = useState<SkillCategory | null>(null);
  const [level, setLevel] = useState<ExpertiseLevel>('INTERMEDIATE');
  const [years, setYears] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState('');

  useEffect(() => {
    listSkillCategories()
      .then(setCategories)
      .catch(() => setCategoryError('No se pudieron cargar las categorías. Intenta de nuevo.'))
      .finally(() => setLoadingCategories(false));
  }, []);

  async function handleAdd() {
    if (!selected || saving) return;
    setSaving(true);
    try {
      const sk = await addSkill({ skillCategoryId: selected.id, expertiseLevel: level, yearsExp: years ? parseInt(years, 10) : undefined });
      await onAdd(sk);
    } finally { setSaving(false); }
  }
  return (
    <div className={s.modalOverlay} onClick={onClose}>
      <div className={s.modalBox} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalTitle}>{t('skills.add_btn')}</div>
        <div className={s.modalField}>
          <label className={s.modalLabel}>{t('skills.pick_category')}</label>
          {loadingCategories ? (
            <div className={s.categoryStatus}>Cargando categorías…</div>
          ) : categoryError ? (
            <div className={s.categoryStatusError}>{categoryError}</div>
          ) : categories.length === 0 ? (
            <div className={s.categoryStatusError}>No hay categorías disponibles.</div>
          ) : (
            <div className={s.catGrid} role="group" aria-label={t('skills.pick_category')}>
              {categories.map((c) => {
                const isSelected = selected?.id === c.id;
                return (
                  <button
                    type="button"
                    key={c.id}
                    className={`${s.catChip} ${isSelected ? s.catChipActive : ''}`}
                    onClick={() => setSelected(c)}
                    aria-pressed={isSelected}
                  >
                    {c.icon && <span className={s.catChipIcon}>{c.icon}</span>}
                    <span>{c.name}</span>
                    {isSelected && <span className={s.catChipCheck}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
          {selected && <div className={s.selectedCategory}>Categoría elegida: <strong>{selected.name}</strong></div>}
        </div>
        <div className={s.modalField}>
          <label className={s.modalLabel}>Nivel</label>
          <div className={s.levelRow}>
            {EXPERTISE_LEVELS.map((lv) => (
              <button key={lv} className={`${s.levelChip} ${level === lv ? s.levelChipActive : ''}`}
                style={level === lv ? { background: LEVEL_COLOR[lv], borderColor: LEVEL_COLOR[lv] } : {}}
                onClick={() => setLevel(lv)}>{t(`profile.expertise_levels.${lv}`)}
              </button>
            ))}
          </div>
        </div>
        <div className={s.modalField}>
          <label className={s.modalLabel}>Años de experiencia</label>
          <input className={s.modalInput} type="number" value={years} onChange={(e) => setYears(e.target.value)} placeholder="5" />
        </div>
        <div className={s.modalFooter}>
          <button className={s.modalCancelBtn} onClick={onClose}>{t('common.cancel')}</button>
          <button className={s.modalSaveBtn} onClick={handleAdd} disabled={!selected || saving}>
            {saving ? t('common.loading') : t('profile.add_skill')}
          </button>
        </div>
      </div>
    </div>
  );
}

function assetBg(type: string): string {
  const m: Record<string, string> = { 'music-score': '#1A3A5C20', 'reference-video': '#3A1A5C20', 'audio-track': '#1A5C3A20' };
  return m[type] ?? 'var(--surface-raised)';
}