import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getMe, getMySkills, getMyProfileUrls, updateMe, addSkill, removeSkill,
  listSkillCategories, searchAssets, getUserById, getUserSkills, getUserProfileUrls, resolveImageUrl,
} from '@regieart/api';
import type { User, UserPublic, UserSkill, SkillCategory, ExpertiseLevel, Asset } from '@regieart/types';
import {
  AvatarSourceModal, AvatarCropModal, WebcamCaptureModal,
  R2GalleryModal, AvatarUploadingModal, runAvatarUpload,
  BannerSourceModal, BannerCropModal, BannerR2GalleryModal, runBannerUpload,
} from './AvatarFlowModals';
import type { AvatarFlowMode, BannerFlowMode } from './AvatarFlowModals';
import { ProfileMediaViewer } from './ProfileMediaViewer';
import type { ProfileMediaKind } from './ProfileMediaViewer';
import {
  avatarCacheKey, bannerCacheKey, readProfileMedia, writeProfileMedia, removeProfileMedia,
} from '../../../shared/utils/profileMediaCache';
import p from '../../../shared/layout/page.module.scss';
import s from './MusicianProfilePage.module.scss';

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

const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: 'Débutant',
  INTERMEDIATE: 'Intermédiaire',
  ADVANCED: 'Avancé',
  PROFESSIONAL: 'Professionnel',
};

const PROFILE_FIELD_LABEL: Record<string, string> = {
  displayName: 'Nom affiché',
  bio: 'Biographie',
  city: 'Ville',
  country: 'Pays',
  phone: 'Téléphone',
};

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Propriétaire', ADMIN: 'Administrateur', MEMBER: 'Membre', EXTERNAL_TECH: 'Technicien externe',
};

const ASSET_ICONS: Record<string, string> = {
  'music-score': '📄',
  'reference-video': '🎬',
  'audio-track': '🎵',
  'user-avatar': '👤',
};

export function MusicianProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const isOwn = userId === 'me';

  const [user, setUser] = useState<User | UserPublic | null>(null);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [mediaTab, setMediaTab] = useState<MediaTab>('gallery');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [viewer, setViewer] = useState<ProfileMediaKind | null>(null);

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
    let cancelled = false;
    setAvatarUrl(null);
    setBannerUrl(null);
    const userPromise = isOwn ? getMe() : getUserById(userId);
    const skillsPromise = isOwn ? getMySkills() : getUserSkills(userId);
    const urlsPromise = (isOwn ? getMyProfileUrls() : getUserProfileUrls(userId))
      .catch(() => ({ avatarUrl: null, bannerUrl: null }));
    Promise.all([
      userPromise,
      skillsPromise,
      searchAssets({ limit: 24 }).catch(() => ({ assets: [] as Asset[] })),
      urlsPromise,
    ])
      .then(([u, sk, media, urls]) => {
        if (cancelled) return;
        setUser(u); setSkills(sk); setAssets(media.assets ?? []);

        const aKey = avatarCacheKey(u.id);
        const bKey = bannerCacheKey(u.id);

        // Show the cache of THIS user only, then revalidate against the server.
        const cachedAvatar = readProfileMedia(aKey);
        if (cachedAvatar) setAvatarUrl(cachedAvatar);
        const cachedBanner = readProfileMedia(bKey);
        if (cachedBanner) setBannerUrl(cachedBanner);

        if (urls.avatarUrl) {
          resolveImageUrl(urls.avatarUrl)
            .then((signedUrl) => fetch(signedUrl!))
            .then((r) => r.blob())
            .then(blobToDataUrl)
            .then((dataUrl) => {
              writeProfileMedia(aKey, dataUrl);
              if (!cancelled) setAvatarUrl(dataUrl);
            })
            .catch(() => {});
        } else {
          removeProfileMedia(aKey);
          setAvatarUrl(null);
        }

        if (urls.bannerUrl) {
          resolveImageUrl(urls.bannerUrl)
            .then((signedUrl) => fetch(signedUrl!))
            .then((r) => r.blob())
            .then(blobToDataUrl)
            .then((dataUrl) => {
              writeProfileMedia(bKey, dataUrl);
              if (!cancelled) setBannerUrl(dataUrl);
            })
            .catch(() => {});
        } else {
          removeProfileMedia(bKey);
          setBannerUrl(null);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, isOwn]);

  async function handleBannerBlob(blob: Blob) {
    const dataUrl = await blobToDataUrl(blob);
    setBannerUrl(dataUrl);
    if (user) writeProfileMedia(bannerCacheKey(user.id), dataUrl);
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
    if (user) writeProfileMedia(avatarCacheKey(user.id), dataUrl);

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
  if (!user) return <div className={p.page}><div className={p.card}><span className={s.empty}>Introuvable</span></div></div>;

  const initials = user.displayName.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  const totalYears = skills.reduce((max, sk) => Math.max(max, sk.yearsExp ?? 0), 0);
  const memberships = 'memberships' in user ? user.memberships : [];

  const avatarActionable = Boolean(avatarUrl) || isOwn;
  const bannerActionable = Boolean(bannerUrl) || isOwn;

  // With a picture the click opens the viewer; without one it goes straight to the upload flow.
  function handleAvatarClick() {
    if (avatarUrl) setViewer('avatar');
    else if (isOwn) setAvatarMode('source');
  }

  function handleBannerClick() {
    if (bannerUrl) setViewer('banner');
    else if (isOwn) setBannerMode('source');
  }

  return (
    <div className={s.root}>
      <div
        className={`${s.banner} ${bannerActionable ? s.bannerClickable : ''}`}
        role={bannerActionable ? 'button' : undefined}
        tabIndex={bannerActionable ? 0 : undefined}
        aria-label={bannerUrl ? 'Agrandir la bannière' : 'Ajouter une bannière'}
        onClick={bannerActionable ? handleBannerClick : undefined}
        onKeyDown={bannerActionable
          ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleBannerClick(); } }
          : undefined}
      >
        {bannerUrl
          ? <>
              <img src={bannerUrl} className={s.bannerImg} alt="" />
              <div className={s.bannerScrim} />
              <span className={s.bannerViewHint}>⤢ Agrandir</span>
            </>
          : <div className={s.bannerOverlay} />
        }
        {isOwn && (
          <button
            className={s.bannerEditBtn}
            onClick={(e) => { e.stopPropagation(); setBannerMode('source'); }}
            title="Changer la bannière"
          >
            📷 {bannerUrl ? 'Changer la bannière du profil' : 'Ajouter une bannière'}
          </button>
        )}
      </div>

      <div className={s.heroWrap}>
        <div className={s.heroLeft}>
          <div
            className={`${s.avatarWrap} ${avatarActionable ? s.avatarClickable : ''}`}
            role={avatarActionable ? 'button' : undefined}
            tabIndex={avatarActionable ? 0 : undefined}
            aria-label={avatarUrl ? 'Agrandir la photo de profil' : 'Ajouter une photo de profil'}
            onClick={avatarActionable ? handleAvatarClick : undefined}
            onKeyDown={avatarActionable
              ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAvatarClick(); } }
              : undefined}
          >
            <div className={s.avatarInner}>
              {avatarUrl
                ? <img
                    src={avatarUrl}
                    className={s.avatarImg}
                    alt={user.displayName}
                    onError={() => {
                      removeProfileMedia(avatarCacheKey(user.id));
                      setAvatarUrl(null);
                    }}
                  />
                : <span className={s.avatarInitials}>{initials}</span>
              }
            </div>
            {avatarActionable && (
              <div className={s.avatarEditOverlay} aria-hidden>
                <span className={s.avatarCamIcon}>{avatarUrl ? '⤢' : '📷'}</span>
                <span className={s.avatarCamText}>{avatarUrl ? 'Agrandir' : 'Ajouter'}</span>
              </div>
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
          <div className={s.statBox}><span className={s.statNum}>{memberships.length}</span><span className={s.statLabel}>Groupes</span></div>
          <div className={s.statDivider} />
          <div className={s.statBox}><span className={s.statNum}>{skills.length}</span><span className={s.statLabel}>Compétences</span></div>
          <div className={s.statDivider} />
          <div className={s.statBox}><span className={s.statNum}>{totalYears}</span><span className={s.statLabel}>Années exp.</span></div>
        </div>
      </div>

      <div className={s.actionBar}>
        {isOwn ? (
          <>
            <button className={s.actionBtn} onClick={() => setShowEditModal(true)}>✏ Modifier le profil</button>
            <button className={s.actionBtn} onClick={() => setAvatarMode('source')}>
              📷 {avatarUrl ? 'Changer la photo de profil' : 'Ajouter une photo de profil'}
            </button>
            <button className={s.actionBtn} onClick={() => setShowSkillModal(true)}>Ajouter une compétence</button>
            <button className={s.actionBtnSecondary}>Exporter le CV</button>
          </>
        ) : (
          <button className={s.actionBtnPrimary} onClick={() => navigate(`/messages/direct/${userId}`)}>Envoyer un message</button>
        )}
      </div>

      <div className={s.body}>
        <aside className={s.aside}>
          {skills.length > 0 && (
            <div className={s.card}>
              <div className={s.sectionTitle}>Compétences</div>
              <div className={s.skillList}>
                {skills.map((sk) => (
                  <div key={sk.id} className={s.skillRow}>
                    <div className={s.skillDot} style={{ background: LEVEL_COLOR[sk.expertiseLevel] }} />
                    <div className={s.skillInfo}>
                      <span className={s.skillName}>{sk.skillCategory?.name ?? ''}</span>
                      <span className={s.skillLevel} style={{ color: LEVEL_COLOR[sk.expertiseLevel] }}>{LEVEL_LABEL[sk.expertiseLevel] ?? sk.expertiseLevel}</span>
                      {sk.yearsExp ? <span className={s.skillYears}>{sk.yearsExp} ans</span> : null}
                    </div>
                    {isOwn && (
                      <button className={s.skillDelete} onClick={() => handleRemoveSkill(sk.id)} title="Supprimer">✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {memberships.length > 0 && (
            <div className={s.card}>
              <div className={s.sectionTitle}>Organisations</div>
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
                    <span className={s.roleChip} data-role={m.role}>{ROLE_LABEL[m.role] ?? m.role}</span>
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
                  {tab === 'gallery' ? '🔲 Galerie' : tab === 'scores' ? '📄 Partitions' : '🎬 Vidéos'}
                </button>
              ))}
            </div>
            {filteredAssets.length === 0
              ? (
                <div className={s.emptyMedia}>
                  <span className={s.emptyMediaIcon} aria-hidden>
                    {mediaTab === 'scores' ? '📄' : mediaTab === 'videos' ? '🎬' : '🔲'}
                  </span>
                  <span className={s.emptyMediaTitle}>
                    {mediaTab === 'scores' ? 'Aucune partition' : mediaTab === 'videos' ? 'Aucune vidéo' : 'Aucun média'}
                  </span>
                  <span className={s.emptyMediaHint}>
                    {isOwn
                      ? 'Les fichiers que vous importez dans vos groupes et vos événements apparaîtront ici.'
                      : 'Ce profil n’a encore rien publié dans cette catégorie.'}
                  </span>
                </div>
              )
              : (
                <div className={s.assetGrid}>
                  {filteredAssets.map((a) => (
                    <div key={a.id} className={s.assetCell}>
                      <div className={s.assetThumb} style={{ background: assetBg(a.assetType) }}>
                        <span className={s.assetIcon}>{ASSET_ICONS[a.assetType] ?? '📁'}</span>
                      </div>
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
              .then(d => { writeProfileMedia(bannerCacheKey(user.id), d); setBannerUrl(d); })
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
                writeProfileMedia(avatarCacheKey(user.id), dataUrl);
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

      {viewer && (
        <ProfileMediaViewer
          src={(viewer === 'avatar' ? avatarUrl : bannerUrl)!}
          kind={viewer}
          userName={user.displayName}
          canEdit={isOwn}
          onEdit={() => {
            const kind = viewer;
            setViewer(null);
            if (kind === 'avatar') setAvatarMode('source');
            else setBannerMode('source');
          }}
          onClose={() => setViewer(null)}
        />
      )}
      {showEditModal && isOwn && 'phone' in user && (
        <EditProfileModal user={user as User} onSave={handleSaveProfile} onClose={() => setShowEditModal(false)} />
      )}
      {showSkillModal && isOwn && (
        <AddSkillModal onAdd={handleAddSkill} onClose={() => setShowSkillModal(false)} />
      )}
    </div>
  );
}

function EditProfileModal({ user, onSave, onClose }: {
  user: User;
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
        <div className={s.modalTitle}>Modifier le profil</div>
        {(['displayName', 'bio', 'city', 'country', 'phone'] as const).map((k) => (
          <div key={k} className={s.modalField}>
            <label className={s.modalLabel}>{PROFILE_FIELD_LABEL[k]}</label>
            {k === 'bio'
              ? <textarea className={s.modalInput} value={form[k]} onChange={field(k)} rows={3} />
              : <input className={s.modalInput} value={form[k]} onChange={field(k)} />}
          </div>
        ))}
        <div className={s.modalFooter}>
          <button className={s.modalCancelBtn} onClick={onClose}>Annuler</button>
          <button className={s.modalSaveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer le profil'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddSkillModal({ onAdd, onClose }: {
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
      .catch(() => setCategoryError('Impossible de charger les catégories. Veuillez réessayer.'))
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
        <div className={s.modalTitle}>Ajouter une compétence</div>
        <div className={s.modalField}>
          <label className={s.modalLabel}>Choisir une catégorie</label>
          {loadingCategories ? (
            <div className={s.categoryStatus}>Chargement des catégories…</div>
          ) : categoryError ? (
            <div className={s.categoryStatusError}>{categoryError}</div>
          ) : categories.length === 0 ? (
            <div className={s.categoryStatusError}>Aucune catégorie disponible.</div>
          ) : (
            <div className={s.catGrid} role="group" aria-label="Choisir une catégorie">
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
          {selected && <div className={s.selectedCategory}>Catégorie choisie : <strong>{selected.name}</strong></div>}
        </div>
        <div className={s.modalField}>
          <label className={s.modalLabel}>Niveau</label>
          <div className={s.levelRow}>
            {EXPERTISE_LEVELS.map((lv) => (
              <button key={lv} className={`${s.levelChip} ${level === lv ? s.levelChipActive : ''}`}
                style={level === lv ? { background: LEVEL_COLOR[lv], borderColor: LEVEL_COLOR[lv] } : {}}
                onClick={() => setLevel(lv)}>{LEVEL_LABEL[lv]}
              </button>
            ))}
          </div>
        </div>
        <div className={s.modalField}>
          <label className={s.modalLabel}>Années d’expérience</label>
          <input className={s.modalInput} type="number" value={years} onChange={(e) => setYears(e.target.value)} placeholder="5" />
        </div>
        <div className={s.modalFooter}>
          <button className={s.modalCancelBtn} onClick={onClose}>Annuler</button>
          <button className={s.modalSaveBtn} onClick={handleAdd} disabled={!selected || saving}>
            {saving ? 'Chargement...' : 'Ajouter une compétence'}
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