import React, { useCallback, useEffect, useRef, useState } from 'react';
import { searchAssets, getDownloadUrl, uploadFile, getMyProfileUrls } from '@regieart/api';
import type { Asset, AssetType } from '@regieart/types';
import s from './AvatarFlowModals.module.scss';


const CANVAS_SIZE = 420;
const CROP_RADIUS = 192;
const CANVAS_CENTER = CANVAS_SIZE / 2;


interface AvatarSourceModalProps {
  onFile: (src: string) => void;
  onWebcam: () => void;
  onR2: () => void;
  onClose: () => void;
}

export function AvatarSourceModal({ onFile, onWebcam, onR2, onClose }: AvatarSourceModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onFile(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <span className={s.modalTitle}>Actualizar Foto de Perfil</span>
          <button className={s.closeBtn} onClick={onClose}>✕</button>
        </div>
        <p className={s.modalSub}>
          Selecciona cómo deseas cargar tu nueva imagen para el perfil de RégieArt.
        </p>

        <div className={s.optionsList}>
          <button className={s.optionCard} onClick={() => fileInputRef.current?.click()}>
            <span className={s.optionIcon}>📁</span>
            <div className={s.optionInfo}>
              <span className={s.optionTitle}>Cargar desde el Equipo</span>
              <span className={s.optionSub}>
                Selecciona una foto (JPG, PNG, WebP) desde tus archivos locales.
              </span>
            </div>
            <span className={s.optionArrow}>›</span>
          </button>

          <button className={s.optionCard} onClick={onR2}>
            <span className={s.optionIcon}>☁️</span>
            <div className={s.optionInfo}>
              <span className={s.optionTitle}>Seleccionar de la Galería de RégieArt</span>
              <span className={s.optionSub}>
                Elige entre las fotos e imágenes subidas en tus bandas y eventos.
              </span>
            </div>
            <span className={s.optionArrow}>›</span>
          </button>

          <button className={s.optionCard} onClick={onWebcam}>
            <span className={s.optionIcon}>📸</span>
            <div className={s.optionInfo}>
              <span className={s.optionTitle}>Usar Cámara Web (WebCam)</span>
              <span className={s.optionSub}>
                Toma una fotografía al instante con la cámara de tu computadora.
              </span>
            </div>
            <span className={s.optionArrow}>›</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div className={s.modalFooter}>
          <div />
          <button className={s.cancelBtn} onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}


interface AvatarCropModalProps {
  imageSrc: string;
  userName: string;
  userRole?: string;
  onConfirm: (blob: Blob) => void;
  onChangeImage: () => void;
  onCancel: () => void;
}

export function AvatarCropModal({
  imageSrc,
  userName,
  userRole,
  onConfirm,
  onChangeImage,
  onCancel,
}: AvatarCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const imgEl = useRef<HTMLImageElement | null>(null);

  const offsetRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const rotRef = useRef(0);

  const [sliderScale, setSliderScale] = useState(1);
  const [cursorGrab, setCursorGrab] = useState(false);

  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragOrigin = useRef({ x: 0, y: 0 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgEl.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d')!;
    const CX = CANVAS_CENTER, CY = CANVAS_CENTER, R = CROP_RADIUS;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.save();
    ctx.translate(CX + offsetRef.current.x, CY + offsetRef.current.y);
    ctx.rotate((rotRef.current * Math.PI) / 180);
    ctx.scale(scaleRef.current, scaleRef.current);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i <= 2; i++) {
      const y = CY - R + (R * 2 / 3) * i;
      ctx.moveTo(CX - R, y); ctx.lineTo(CX + R, y);
      const x = CX - R + (R * 2 / 3) * i;
      ctx.moveTo(x, CY - R); ctx.lineTo(x, CY + R);
    }
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = 'rgba(74,130,126,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.stroke();

    const preview = previewRef.current;
    if (!preview) return;
    const pCtx = preview.getContext('2d')!;
    const PW = preview.width;
    pCtx.clearRect(0, 0, PW, PW);
    pCtx.save();
    pCtx.beginPath();
    pCtx.arc(PW / 2, PW / 2, PW / 2, 0, Math.PI * 2);
    pCtx.clip();
    pCtx.drawImage(canvas, CX - R, CY - R, R * 2, R * 2, 0, 0, PW, PW);
    pCtx.restore();
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgEl.current = img;
      const minDim = Math.min(img.naturalWidth, img.naturalHeight);
      const fitScale = (CROP_RADIUS * 2) / minDim;
      scaleRef.current = fitScale;
      offsetRef.current = { x: 0, y: 0 };
      rotRef.current = 0;
      setSliderScale(fitScale);
      draw();
    };
    img.src = imageSrc;
  }, [imageSrc, draw]);

  function handleMouseDown(e: React.MouseEvent) {
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragOrigin.current = { ...offsetRef.current };
    setCursorGrab(true);
  }
  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging.current) return;
    offsetRef.current = {
      x: dragOrigin.current.x + (e.clientX - dragStart.current.x),
      y: dragOrigin.current.y + (e.clientY - dragStart.current.y),
    };
    draw();
  }
  function handleMouseUp() { dragging.current = false; setCursorGrab(false); }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    scaleRef.current = Math.max(0.15, Math.min(5, scaleRef.current + (e.deltaY > 0 ? -0.06 : 0.06)));
    setSliderScale(scaleRef.current);
    draw();
  }

  function rotate(deg: number) {
    rotRef.current = (rotRef.current + deg) % 360;
    draw();
  }

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    scaleRef.current = Number(e.target.value);
    setSliderScale(scaleRef.current);
    draw();
  }

  function resetTransform() {
    const img = imgEl.current;
    if (!img) return;
    const minDim = Math.min(img.naturalWidth, img.naturalHeight);
    scaleRef.current = (CROP_RADIUS * 2) / minDim;
    offsetRef.current = { x: 0, y: 0 };
    rotRef.current = 0;
    setSliderScale(scaleRef.current);
    draw();
  }

  function handleSave() {
    const img = imgEl.current;
    if (!img) return;
    const out = document.createElement('canvas');
    out.width = 512; out.height = 512;
    const ctx = out.getContext('2d')!;
    ctx.beginPath();
    ctx.arc(256, 256, 256, 0, Math.PI * 2);
    ctx.clip();
    ctx.save();
    ctx.translate(256 + offsetRef.current.x * (512 / CANVAS_SIZE), 256 + offsetRef.current.y * (512 / CANVAS_SIZE));
    ctx.rotate((rotRef.current * Math.PI) / 180);
    const outputScale = scaleRef.current * (512 / (CROP_RADIUS * 2));
    ctx.scale(outputScale, outputScale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
    out.toBlob((blob) => { if (blob) onConfirm(blob); }, 'image/jpeg', 0.9);
  }

  return (
    <div className={s.overlay} onClick={onCancel}>
      <div className={s.modalWide} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <span className={s.modalTitle}>Ajustar y Encuadrar Fotografía</span>
          <button className={s.closeBtn} onClick={onCancel}>✕</button>
        </div>

        <div className={s.cropBody}>
          <div className={s.cropCanvasWrap}>
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className={s.cropCanvas}
              style={{ cursor: cursorGrab ? 'grabbing' : 'grab' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            />
            <p className={s.cropHint}>Arrastra para mover · Rueda para zoom</p>
          </div>

          <div className={s.cropPreviewCol}>
            <p className={s.previewLabel}>PREVISUALIZACIÓN EN VIVO</p>
            <div className={s.previewCircleWrap}>
              <canvas ref={previewRef} width={128} height={128} className={s.previewCanvas} />
            </div>
            <div className={s.previewName}>{userName}</div>
            {userRole && <div className={s.previewRole}>{userRole}</div>}
            <p className={s.previewHint}>
              Así te verán tus compañeros en los DaySheets y en el Roster de la banda.
            </p>
          </div>
        </div>

        <div className={s.cropControls}>
          <span className={s.controlLabel}>Zoom:</span>
          <button className={s.controlBtn} onClick={() => { scaleRef.current = Math.max(0.15, scaleRef.current - 0.1); setSliderScale(scaleRef.current); draw(); }}>−</button>
          <input
            type="range" min={0.15} max={4} step={0.01} value={sliderScale}
            className={s.zoomSlider}
            onChange={handleSliderChange}
          />
          <button className={s.controlBtn} onClick={() => { scaleRef.current = Math.min(4, scaleRef.current + 0.1); setSliderScale(scaleRef.current); draw(); }}>+</button>
          <span className={s.controlSep} />
          <span className={s.controlLabel}>Rotación:</span>
          <button className={s.controlBtn} onClick={() => rotate(-90)}>⟲ 90°</button>
          <button className={s.controlBtn} onClick={() => rotate(90)}>⟳ 90°</button>
          <button className={s.controlBtn} onClick={resetTransform}>🔄 Reset</button>
        </div>

        <div className={s.modalFooter}>
          <button className={s.changeImgBtn} onClick={onChangeImage}>📂 Cambiar Imagen</button>
          <div className={s.footerRight}>
            <button className={s.cancelBtn} onClick={onCancel}>Cancelar</button>
            <button className={s.primaryBtn} onClick={handleSave}>GUARDAR Y SUBIR ✓</button>
          </div>
        </div>
      </div>
    </div>
  );
}


interface WebcamCaptureModalProps {
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
}

export function WebcamCaptureModal({ onCapture, onCancel }: WebcamCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const startCamera = useCallback(async (deviceId?: string) => {
    setReady(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setReady(true);
      }
      const all = await navigator.mediaDevices.enumerateDevices();
      const vids = all.filter((d) => d.kind === 'videoinput');
      setDevices(vids);
      if (!deviceId && vids[0]) setSelectedId(vids[0].deviceId);
    } catch {
      setError('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, [startCamera]);

  function handleCapture() {
    const video = videoRef.current;
    if (!video || !ready) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCapture(canvas.toDataURL('image/jpeg', 0.92));
  }

  function handleDeviceChange(id: string) {
    setSelectedId(id);
    startCamera(id);
  }

  return (
    <div className={s.overlay} onClick={onCancel}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <span className={s.modalTitle}>Tomar Foto con WebCam</span>
          <button className={s.closeBtn} onClick={onCancel}>✕</button>
        </div>

        <div className={s.webcamWrap}>
          {error ? (
            <div className={s.webcamError}>{error}</div>
          ) : (
            <div className={s.webcamVideoWrap}>
              <video ref={videoRef} autoPlay playsInline muted className={s.webcamVideo} />
              <div className={s.webcamCircleGuide} />
            </div>
          )}

          {devices.length > 1 && (
            <div className={s.webcamDeviceRow}>
              <label className={s.webcamDeviceLabel}>Dispositivo de Cámara:</label>
              <select
                className={s.webcamDeviceSelect}
                value={selectedId}
                onChange={(e) => handleDeviceChange(e.target.value)}
              >
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Cámara ${d.deviceId.slice(0, 8)}…`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className={s.modalFooter}>
          <div />
          <div className={s.footerRight}>
            <button className={s.cancelBtn} onClick={onCancel}>Cancelar</button>
            <button className={s.primaryBtn} onClick={handleCapture} disabled={!ready || !!error}>
              📸 TOMAR FOTO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


type R2Tab = 'avatars' | 'all';

interface R2GalleryModalProps {
  onSelect: (downloadUrl: string) => void;
  onCancel: () => void;
}

export function R2GalleryModal({ onSelect, onCancel }: R2GalleryModalProps) {
  const [tab, setTab] = useState<R2Tab>('avatars');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Asset | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setSelected(null);
      const types: AssetType[] = tab === 'avatars' ? ['user-avatar'] : ['user-avatar', 'user-banner'];
      const res = await searchAssets({ assetType: types, limit: 32 }).catch(() => ({
        assets: [] as Asset[],
      }));
      if (cancelled) return;
      setAssets(res.assets);
      const entries = await Promise.all(
        res.assets.map((a) =>
          getDownloadUrl(a.id)
            .then((r) => [a.id, r.downloadUrl] as const)
            .catch(() => null),
        ),
      );
      if (!cancelled) {
        setThumbs(Object.fromEntries(entries.filter(Boolean) as [string, string][]));
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [tab]);

  function handleUse() {
    if (!selected || !thumbs[selected.id]) return;
    onSelect(thumbs[selected.id]);
  }

  return (
    <div className={s.overlay} onClick={onCancel}>
      <div className={s.modalWide} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <span className={s.modalTitle}>Seleccionar Imagen de RégieArt</span>
          <button className={s.closeBtn} onClick={onCancel}>✕</button>
        </div>

        <div className={s.r2TabBar}>
          {([['avatars', 'Mis Avatares'], ['all', 'Subidas R2']] as [R2Tab, string][]).map(
            ([key, label]) => (
              <button
                key={key}
                className={`${s.r2Tab} ${tab === key ? s.r2TabActive : ''}`}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ),
          )}
        </div>

        <div className={s.r2Grid}>
          {loading ? (
            <div className={s.r2Loading}><div className={s.spinnerEl} /></div>
          ) : assets.length === 0 ? (
            <div className={s.r2Empty}>
              No tienes imágenes subidas aún. Usa &quot;Cargar desde el Equipo&quot; para subir tu primera foto.
            </div>
          ) : (
            assets.map((asset) => (
              <button
                key={asset.id}
                className={`${s.r2Cell} ${selected?.id === asset.id ? s.r2CellSelected : ''}`}
                onClick={() => setSelected(asset)}
                title={asset.displayName ?? asset.originalName}
              >
                {thumbs[asset.id] ? (
                  <img
                    src={thumbs[asset.id]}
                    alt={asset.displayName ?? asset.originalName}
                    className={s.r2CellImg}
                  />
                ) : (
                  <span className={s.r2CellIcon}>📁</span>
                )}
                {selected?.id === asset.id && (
                  <span className={s.r2CellCheck}>✓</span>
                )}
              </button>
            ))
          )}
        </div>

        <div className={s.modalFooter}>
          <div />
          <div className={s.footerRight}>
            <button className={s.cancelBtn} onClick={onCancel}>Cancelar</button>
            <button className={s.primaryBtn} onClick={handleUse} disabled={!selected}>
              USAR COMO AVATAR ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


const UPLOAD_STEPS = [
  'Generando presigned URL seguras...',
  'Transferencia binaria en proceso...',
  'Confirmando y actualizando perfil...',
];

interface AvatarUploadingModalProps {
  progress: number;  // 0–100
  step: number;      // 0 | 1 | 2
}

export function AvatarUploadingModal({ progress, step }: AvatarUploadingModalProps) {
  return (
    <div className={s.overlay}>
      <div className={s.modal}>
        <div className={s.modalHeader}>
          <span className={s.modalTitle}>Subiendo Fotografía de Perfil...</span>
        </div>

        <div className={s.uploadingBody}>
          <div className={s.uploadSpinner} />
          <p className={s.uploadingLabel}>
            Optimizando y subiendo directamente a Cloudflare R2...
          </p>
          <div className={s.progressTrack}>
            <div className={s.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <div className={s.progressPct}>{Math.round(progress)}%</div>
          <div className={s.stepsList}>
            {UPLOAD_STEPS.map((label, i) => (
              <div
                key={i}
                className={`${s.stepItem} ${i < step ? s.stepDone : i === step ? s.stepActive : ''}`}
              >
                <span className={s.stepIcon}>{i < step ? '✓' : i === step ? '…' : '•'}</span>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


export type AvatarFlowMode = null | 'source' | 'crop' | 'webcam' | 'r2' | 'uploading';
export type BannerFlowMode = null | 'source' | 'crop' | 'r2' | 'uploading';

export async function runAvatarUpload(
  blob: Blob,
  onProgress: (p: number, step: number) => void,
): Promise<string | null> {
  onProgress(10, 0);
  await new Promise((r) => setTimeout(r, 150));
  onProgress(35, 1);
  await uploadFile(blob, 'user-avatar', 'image/jpeg', {
    displayName: `avatar-${Date.now()}.jpg`,
    originalName: `avatar-${Date.now()}.jpg`,
  });
  onProgress(80, 2);
  const urls = await getMyProfileUrls().catch(() => ({ avatarUrl: null, bannerUrl: null }));
  onProgress(100, 2);
  await new Promise((r) => setTimeout(r, 400));
  return urls.avatarUrl;
}

export async function runBannerUpload(
  blob: Blob,
  onProgress: (p: number, step: number) => void,
): Promise<void> {
  onProgress(10, 0);
  await new Promise((r) => setTimeout(r, 150));
  onProgress(35, 1);
  await uploadFile(blob, 'user-banner', 'image/jpeg', {
    displayName: `banner-${Date.now()}.jpg`,
    originalName: `banner-${Date.now()}.jpg`,
  });
  onProgress(90, 2);
  await new Promise((r) => setTimeout(r, 400));
  onProgress(100, 2);
}


interface BannerSourceModalProps {
  onFile: (src: string) => void;
  onR2: () => void;
  onClose: () => void;
}

export function BannerSourceModal({ onFile, onR2, onClose }: BannerSourceModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // eslint-disable-next-line sonarjs/no-identical-functions
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onFile(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <span className={s.modalTitle}>Cambiar Banner de Perfil</span>
          <button className={s.closeBtn} onClick={onClose}>✕</button>
        </div>
        <p className={s.modalSub}>
          Selecciona la imagen para tu cabecera. Proporción recomendada: 16:5.
        </p>

        <div className={s.optionsList}>
          <button className={s.optionCard} onClick={() => fileInputRef.current?.click()}>
            <span className={s.optionIcon}>📁</span>
            <div className={s.optionInfo}>
              <span className={s.optionTitle}>Cargar desde el Equipo</span>
              <span className={s.optionSub}>
                Selecciona una imagen (JPG, PNG, WebP) de tus archivos locales.
              </span>
            </div>
            <span className={s.optionArrow}>›</span>
          </button>

          <button className={s.optionCard} onClick={onR2}>
            <span className={s.optionIcon}>☁️</span>
            <div className={s.optionInfo}>
              <span className={s.optionTitle}>Seleccionar de la Galería de RégieArt</span>
              <span className={s.optionSub}>
                Elige entre banners e imágenes subidas en tus bandas y eventos.
              </span>
            </div>
            <span className={s.optionArrow}>›</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div className={s.modalFooter}>
          <div />
          <button className={s.cancelBtn} onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}


const BANNER_W = 640;
const BANNER_H = 200; // exactly 16:5

interface BannerCropModalProps {
  imageSrc: string;
  onConfirm: (blob: Blob) => void;
  onChangeImage: () => void;
  onCancel: () => void;
}

export function BannerCropModal({ imageSrc, onConfirm, onChangeImage, onCancel }: BannerCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const imgEl = useRef<HTMLImageElement | null>(null);

  const offsetRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const rotRef = useRef(0);

  const [sliderScale, setSliderScale] = useState(1);
  const [cursorGrab, setCursorGrab] = useState(false);

  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragOrigin = useRef({ x: 0, y: 0 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgEl.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d')!;
    const W = BANNER_W, H = BANNER_H, CX = W / 2, CY = H / 2;

    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.translate(CX + offsetRef.current.x, CY + offsetRef.current.y);
    ctx.rotate((rotRef.current * Math.PI) / 180);
    ctx.scale(scaleRef.current, scaleRef.current);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i <= 2; i++) {
      ctx.moveTo((W / 3) * i, 0); ctx.lineTo((W / 3) * i, H);
      ctx.moveTo(0, (H / 3) * i); ctx.lineTo(W, (H / 3) * i);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(74,130,126,0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    const preview = previewRef.current;
    if (!preview) return;
    const pCtx = preview.getContext('2d')!;
    pCtx.clearRect(0, 0, preview.width, preview.height);
    pCtx.drawImage(canvas, 0, 0, W, H, 0, 0, preview.width, preview.height);
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgEl.current = img;
      scaleRef.current = Math.max(BANNER_W / img.naturalWidth, BANNER_H / img.naturalHeight);
      offsetRef.current = { x: 0, y: 0 };
      rotRef.current = 0;
      setSliderScale(scaleRef.current);
      draw();
    };
    img.src = imageSrc;
  }, [imageSrc, draw]);

  // eslint-disable-next-line sonarjs/no-identical-functions
  function handleMouseDown(e: React.MouseEvent) {
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragOrigin.current = { ...offsetRef.current };
    setCursorGrab(true);
  }
  // eslint-disable-next-line sonarjs/no-identical-functions
  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging.current) return;
    offsetRef.current = {
      x: dragOrigin.current.x + (e.clientX - dragStart.current.x),
      y: dragOrigin.current.y + (e.clientY - dragStart.current.y),
    };
    draw();
  }
  // eslint-disable-next-line sonarjs/no-identical-functions
  function handleMouseUp() { dragging.current = false; setCursorGrab(false); }
  // eslint-disable-next-line sonarjs/no-identical-functions
  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    scaleRef.current = Math.max(0.15, Math.min(5, scaleRef.current + (e.deltaY > 0 ? -0.06 : 0.06)));
    setSliderScale(scaleRef.current);
    draw();
  }
  // eslint-disable-next-line sonarjs/no-identical-functions
  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    scaleRef.current = Number(e.target.value);
    setSliderScale(scaleRef.current);
    draw();
  }
  function rotate(deg: number) { rotRef.current = (rotRef.current + deg) % 360; draw(); }
  function resetTransform() {
    const img = imgEl.current;
    if (!img) return;
    scaleRef.current = Math.max(BANNER_W / img.naturalWidth, BANNER_H / img.naturalHeight);
    offsetRef.current = { x: 0, y: 0 };
    rotRef.current = 0;
    setSliderScale(scaleRef.current);
    draw();
  }

  function handleSave() {
    const img = imgEl.current;
    if (!img) return;
    const out = document.createElement('canvas');
    out.width = BANNER_W * 2;
    out.height = BANNER_H * 2;
    const ctx = out.getContext('2d')!;
    const CX = BANNER_W, CY = BANNER_H; // center at 2×
    ctx.save();
    ctx.translate(CX + offsetRef.current.x * 2, CY + offsetRef.current.y * 2);
    ctx.rotate((rotRef.current * Math.PI) / 180);
    ctx.scale(scaleRef.current * 2, scaleRef.current * 2);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
    out.toBlob((blob) => { if (blob) onConfirm(blob); }, 'image/jpeg', 0.9);
  }

  return (
    <div className={s.overlay} onClick={onCancel}>
      <div className={s.modalWide} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <span className={s.modalTitle}>Ajustar Banner de Perfil</span>
          <button className={s.closeBtn} onClick={onCancel}>✕</button>
        </div>

        <div className={s.bannerCropBody}>
          <canvas
            ref={canvasRef}
            width={BANNER_W}
            height={BANNER_H}
            className={s.bannerCanvas}
            style={{ cursor: cursorGrab ? 'grabbing' : 'grab' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          />
          <p className={s.cropHint}>Arrastra para mover · Rueda para zoom</p>

          <div className={s.bannerPreviewWrap}>
            <p className={s.previewLabel}>PREVISUALIZACIÓN EN VIVO</p>
            <canvas ref={previewRef} width={320} height={100} className={s.bannerPreviewCanvas} />
          </div>
        </div>

        <div className={s.cropControls}>
          <span className={s.controlLabel}>Zoom:</span>
          <button className={s.controlBtn} onClick={() => { scaleRef.current = Math.max(0.15, scaleRef.current - 0.1); setSliderScale(scaleRef.current); draw(); }}>−</button>
          <input type="range" min={0.15} max={4} step={0.01} value={sliderScale} className={s.zoomSlider} onChange={handleSliderChange} />
          <button className={s.controlBtn} onClick={() => { scaleRef.current = Math.min(4, scaleRef.current + 0.1); setSliderScale(scaleRef.current); draw(); }}>+</button>
          <span className={s.controlSep} />
          <span className={s.controlLabel}>Rotación:</span>
          <button className={s.controlBtn} onClick={() => rotate(-90)}>⟲ 90°</button>
          <button className={s.controlBtn} onClick={() => rotate(90)}>⟳ 90°</button>
          <button className={s.controlBtn} onClick={resetTransform}>🔄 Reset</button>
        </div>

        <div className={s.modalFooter}>
          <button className={s.changeImgBtn} onClick={onChangeImage}>📂 Cambiar Imagen</button>
          <div className={s.footerRight}>
            <button className={s.cancelBtn} onClick={onCancel}>Cancelar</button>
            <button className={s.primaryBtn} onClick={handleSave}>GUARDAR Y SUBIR ✓</button>
          </div>
        </div>
      </div>
    </div>
  );
}


interface BannerR2GalleryModalProps {
  onSelect: (downloadUrl: string) => void;
  onCancel: () => void;
}

export function BannerR2GalleryModal({ onSelect, onCancel }: BannerR2GalleryModalProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Asset | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await searchAssets({
        assetType: ['user-banner', 'user-avatar'],
        limit: 32,
      }).catch(() => ({ assets: [] as Asset[] }));
      if (cancelled) return;
      setAssets(res.assets);
      const entries = await Promise.all(
        res.assets.map((a) =>
          getDownloadUrl(a.id).then((r) => [a.id, r.downloadUrl] as const).catch(() => null),
        ),
      );
      if (!cancelled) {
        setThumbs(Object.fromEntries(entries.filter(Boolean) as [string, string][]));
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  function handleUse() {
    if (!selected || !thumbs[selected.id]) return;
    onSelect(thumbs[selected.id]);
  }

  return (
    <div className={s.overlay} onClick={onCancel}>
      <div className={s.modalWide} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <span className={s.modalTitle}>Seleccionar Banner de RégieArt</span>
          <button className={s.closeBtn} onClick={onCancel}>✕</button>
        </div>

        <div className={s.r2Grid}>
          {loading ? (
            <div className={s.r2Loading}><div className={s.spinnerEl} /></div>
          ) : assets.length === 0 ? (
            <div className={s.r2Empty}>
              No tienes imágenes subidas aún. Usa &quot;Cargar desde el Equipo&quot; para subir tu primer banner.
            </div>
          ) : (
            assets.map((asset) => (
              <button
                key={asset.id}
                className={`${s.r2Cell} ${selected?.id === asset.id ? s.r2CellSelected : ''}`}
                onClick={() => setSelected(asset)}
                title={asset.displayName ?? asset.originalName}
              >
                {thumbs[asset.id]
                  ? <img src={thumbs[asset.id]} alt="" className={s.r2CellImg} />
                  : <span className={s.r2CellIcon}>🖼</span>}
                {selected?.id === asset.id && <span className={s.r2CellCheck}>✓</span>}
              </button>
            ))
          )}
        </div>

        <div className={s.modalFooter}>
          <div />
          <div className={s.footerRight}>
            <button className={s.cancelBtn} onClick={onCancel}>Cancelar</button>
            <button className={s.primaryBtn} onClick={handleUse} disabled={!selected}>
              USAR COMO BANNER ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


export type OrgLogoFlowMode = null | 'source' | 'crop' | 'r2' | 'uploading';
export type OrgBannerFlowMode = null | 'source' | 'crop' | 'r2' | 'uploading';

export async function runOrgLogoUpload(
  blob: Blob,
  orgId: string,
  onProgress: (p: number, step: number) => void,
): Promise<void> {
  onProgress(10, 0);
  await new Promise((r) => setTimeout(r, 150));
  onProgress(35, 1);
  await uploadFile(blob, 'org-banner', 'image/jpeg', {
    orgId,
    displayName: `org-logo-${Date.now()}.jpg`,
    originalName: `org-logo-${Date.now()}.jpg`,
  });
  onProgress(90, 2);
  await new Promise((r) => setTimeout(r, 400));
  onProgress(100, 2);
}

export async function runOrgBannerUpload(
  blob: Blob,
  orgId: string,
  onProgress: (p: number, step: number) => void,
): Promise<void> {
  onProgress(10, 0);
  await new Promise((r) => setTimeout(r, 150));
  onProgress(35, 1);
  await uploadFile(blob, 'org-banner', 'image/jpeg', {
    orgId,
    displayName: `org-banner-${Date.now()}.jpg`,
    originalName: `org-banner-${Date.now()}.jpg`,
  });
  onProgress(90, 2);
  await new Promise((r) => setTimeout(r, 400));
  onProgress(100, 2);
}


interface OrgR2GalleryModalProps {
  orgId: string;
  onSelect: (downloadUrl: string) => void;
  onCancel: () => void;
}

export function OrgR2GalleryModal({ orgId, onSelect, onCancel }: OrgR2GalleryModalProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Asset | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await searchAssets({
        assetType: ['org-banner'],
        orgId,
        limit: 32,
      }).catch(() => ({ assets: [] as Asset[] }));
      if (cancelled) return;
      setAssets(res.assets);
      const entries = await Promise.all(
        res.assets.map((a) =>
          getDownloadUrl(a.id).then((r) => [a.id, r.downloadUrl] as const).catch(() => null),
        ),
      );
      if (!cancelled) {
        setThumbs(Object.fromEntries(entries.filter(Boolean) as [string, string][]));
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [orgId]);

  return (
    <div className={s.overlay} onClick={onCancel}>
      <div className={s.modalWide} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <span className={s.modalTitle}>Seleccionar Imagen de Organización</span>
          <button className={s.closeBtn} onClick={onCancel}>✕</button>
        </div>

        <div className={s.r2Grid}>
          {loading ? (
            <div className={s.r2Loading}><div className={s.spinnerEl} /></div>
          ) : assets.length === 0 ? (
            <div className={s.r2Empty}>
              No hay imágenes para esta organización aún. Sube la primera desde tu equipo.
            </div>
          ) : (
            assets.map((asset) => (
              <button
                key={asset.id}
                className={`${s.r2Cell} ${selected?.id === asset.id ? s.r2CellSelected : ''}`}
                onClick={() => setSelected(asset)}
                title={asset.displayName ?? asset.originalName}
              >
                {thumbs[asset.id]
                  ? <img src={thumbs[asset.id]} alt="" className={s.r2CellImg} />
                  : <span className={s.r2CellIcon}>🖼</span>}
                {selected?.id === asset.id && <span className={s.r2CellCheck}>✓</span>}
              </button>
            ))
          )}
        </div>

        <div className={s.modalFooter}>
          <div />
          <div className={s.footerRight}>
            <button className={s.cancelBtn} onClick={onCancel}>Cancelar</button>
            <button
              className={s.primaryBtn}
              onClick={() => { if (selected && thumbs[selected.id]) onSelect(thumbs[selected.id]); }}
              disabled={!selected}
            >
              USAR IMAGEN ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
