import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import {
  Camera,
  CheckCircle2,
  Download,
  QrCode,
  ScanLine,
  StopCircle,
  Upload,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import {
  buildDeviceQrPayload,
  parseDeviceQrPayload,
  ParsedDeviceQrPayload,
} from '../utils/industrialMath';

export interface SampleQrSpec {
  name: string;
  ipAddress: string;
  area: string;
  resolution?: string;
  code?: 'CO' | 'NO2' | 'SO2' | 'PM2_5' | 'PM10' | 'NOISE';
  type?: string;
}

interface DeviceQrPanelProps {
  module: 'camera' | 'sensor' | 'machine';
  accentColor: 'cyan' | 'emerald' | 'amber';
  defaultSample: SampleQrSpec;
  onDecoded: (parsed: ParsedDeviceQrPayload) => void;
  onConnectImmediate?: (parsed: ParsedDeviceQrPayload) => Promise<void> | void;
  language: Language;
}

const ACCENT_STYLES = {
  cyan: {
    border: 'border-cyan-800/70',
    bgSoft: 'bg-cyan-950/30',
    btnPrimary: 'bg-cyan-600 hover:bg-cyan-500 text-white',
    btnOutline: 'border-cyan-500/40 bg-cyan-950/50 text-cyan-300 hover:bg-cyan-900/50',
    text: 'text-cyan-400',
    focus: 'focus:border-cyan-500',
  },
  emerald: {
    border: 'border-emerald-800/70',
    bgSoft: 'bg-emerald-950/30',
    btnPrimary: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    btnOutline: 'border-emerald-500/40 bg-emerald-950/50 text-emerald-300 hover:bg-emerald-900/50',
    text: 'text-emerald-400',
    focus: 'focus:border-emerald-500',
  },
  amber: {
    border: 'border-amber-800/70',
    bgSoft: 'bg-amber-950/30',
    btnPrimary: 'bg-amber-600 hover:bg-amber-500 text-white',
    btnOutline: 'border-amber-500/40 bg-amber-950/50 text-amber-300 hover:bg-amber-900/50',
    text: 'text-amber-400',
    focus: 'focus:border-amber-500',
  },
};

export const DeviceQrPanel: React.FC<DeviceQrPanelProps> = ({
  module,
  accentColor,
  defaultSample,
  onDecoded,
  onConnectImmediate,
  language,
}) => {
  const t = translations[language];
  const theme = ACCENT_STYLES[accentColor];

  const [isScanning, setIsScanning] = useState(false);
  const [qrInputText, setQrInputText] = useState('');
  const [sampleQrDataUrl, setSampleQrDataUrl] = useState<string | null>(null);
  const [samplePayloadText, setSamplePayloadText] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCameraScan = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      stopCameraScan();
    };
  }, []);

  const handleParsedString = (raw: string): ParsedDeviceQrPayload | null => {
    const parsed = parseDeviceQrPayload(raw);
    if (!parsed.valid) {
      setFeedback({ type: 'err', text: t.deviceConnect.qrDecodeError });
      return null;
    }
    setQrInputText(raw);
    setFeedback({ type: 'ok', text: t.deviceConnect.qrDecodedOk });
    onDecoded(parsed);
    return parsed;
  };

  const startCameraScan = async () => {
    setFeedback(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setFeedback({ type: 'err', text: t.deviceConnect.cameraAccessDenied });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setIsScanning(true);

      const scanLoop = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || !streamRef.current) return;

        if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imgData.data, imgData.width, imgData.height, {
              inversionAttempts: 'dontInvert',
            });
            if (code?.data) {
              stopCameraScan();
              handleParsedString(code.data);
              return;
            }
          }
        }
        rafRef.current = requestAnimationFrame(scanLoop);
      };

      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          void videoRef.current.play().catch(() => {});
          rafRef.current = requestAnimationFrame(scanLoop);
        }
      }, 60);
    } catch {
      stopCameraScan();
      setFeedback({ type: 'err', text: t.deviceConnect.cameraAccessDenied });
    }
  };

  const handleUploadQrImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFeedback(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setFeedback({ type: 'err', text: t.deviceConnect.qrDecodeError });
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'attemptBoth',
        });
        if (code?.data) {
          handleParsedString(code.data);
        } else {
          setFeedback({ type: 'err', text: t.deviceConnect.qrDecodeError });
        }
      } finally {
        URL.revokeObjectURL(objectUrl);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setFeedback({ type: 'err', text: t.deviceConnect.qrDecodeError });
    };
    img.src = objectUrl;
  };

  const handleGenerateSampleQr = async () => {
    setFeedback(null);
    const payload = buildDeviceQrPayload({
      module,
      name: defaultSample.name,
      ipAddress: defaultSample.ipAddress,
      area: defaultSample.area,
      resolution: defaultSample.resolution,
      code: defaultSample.code,
      type: defaultSample.type,
    });
    const url = await QRCode.toDataURL(payload, {
      width: 200,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    });
    setSamplePayloadText(payload);
    setSampleQrDataUrl(url);
  };

  const handleApplyText = () => {
    setFeedback(null);
    handleParsedString(qrInputText);
  };

  const handleConnectFromSample = async () => {
    if (!samplePayloadText) return;
    const parsed = handleParsedString(samplePayloadText);
    if (parsed && onConnectImmediate) {
      await onConnectImmediate(parsed);
    }
  };

  return (
    <div className={`rounded-xl border ${theme.border} ${theme.bgSoft} p-4 space-y-3`}>
      <div className="flex flex-wrap items-center gap-2">
        {!isScanning ? (
          <button
            type="button"
            onClick={startCameraScan}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${theme.btnOutline}`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>{t.deviceConnect.scanCameraBtn}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={stopCameraScan}
            className="flex items-center gap-1.5 rounded-lg border border-rose-500/50 bg-rose-950/70 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-900/70 transition-colors"
          >
            <StopCircle className="h-3.5 w-3.5" />
            <span>{t.deviceConnect.stopCameraBtn}</span>
          </button>
        )}

        <label className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 cursor-pointer transition-colors">
          <Upload className="h-3.5 w-3.5" />
          <span>{t.deviceConnect.uploadQrImageBtn}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUploadQrImage}
            className="hidden"
          />
        </label>

        <button
          type="button"
          onClick={handleGenerateSampleQr}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <QrCode className={`h-3.5 w-3.5 ${theme.text}`} />
          <span>{t.deviceConnect.generateSampleQrBtn}</span>
        </button>
      </div>

      {/* Live Video Scanner Viewport */}
      {isScanning && (
        <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-black max-w-sm">
          <video ref={videoRef} playsInline muted className="w-full h-48 object-cover" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-32 w-32 border-2 border-dashed border-cyan-400 rounded-lg flex items-center justify-center">
              <ScanLine className="h-6 w-6 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Sample Scannable QR Sticker Preview */}
      {sampleQrDataUrl && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-lg border border-slate-800 bg-slate-950/90 p-3">
          <img
            src={sampleQrDataUrl}
            alt="Device QR Sticker"
            className="h-28 w-28 rounded-lg bg-white p-1 shrink-0"
          />
          <div className="space-y-2 min-w-0 flex-1">
            <div className="text-xs font-semibold text-white">
              {t.deviceConnect.qrStickerTitle}
            </div>
            <div className="text-[11px] font-mono text-slate-400 break-all bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800">
              {samplePayloadText}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleConnectFromSample}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${theme.btnPrimary}`}
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>{t.deviceConnect.connectFromQrBtn}</span>
              </button>
              <a
                href={sampleQrDataUrl}
                download={`neurofactory-${module}-qr.png`}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{t.deviceConnect.downloadQrBtn}</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Manual QR Payload Input */}
      <div className="space-y-1">
        <label className="block text-[11px] text-slate-400">
          {t.deviceConnect.qrPayloadLabel}
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={qrInputText}
            onChange={(e) => setQrInputText(e.target.value)}
            placeholder={t.deviceConnect.qrPayloadPlaceholder}
            className={`flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-white placeholder-slate-500 ${theme.focus} focus:outline-none`}
          />
          <button
            type="button"
            onClick={handleApplyText}
            disabled={!qrInputText.trim()}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap"
          >
            {t.deviceConnect.applyQrBtn}
          </button>
        </div>
      </div>

      {/* Feedback alert */}
      {feedback && (
        <div
          className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
            feedback.type === 'ok'
              ? 'border border-emerald-800 bg-emerald-950/60 text-emerald-300'
              : 'border border-rose-800 bg-rose-950/60 text-rose-300'
          }`}
        >
          {feedback.type === 'ok' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}
    </div>
  );
};

interface DeviceQrStickerButtonProps {
  module: 'camera' | 'sensor' | 'machine';
  deviceName: string;
  ipAddress?: string;
  area: string;
  resolution?: string;
  code?: string;
  type?: string;
  language: Language;
}

export const DeviceQrStickerButton: React.FC<DeviceQrStickerButtonProps> = ({
  module,
  deviceName,
  ipAddress,
  area,
  resolution,
  code,
  type,
  language,
}) => {
  const t = translations[language];
  const [open, setOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const payload = buildDeviceQrPayload({
    module,
    name: deviceName,
    ipAddress: ipAddress || '192.168.10.10',
    area,
    resolution,
    code,
    type,
  });

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && !qrUrl) {
      const url = await QRCode.toDataURL(payload, {
        width: 220,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      setQrUrl(url);
    }
    setOpen((prev) => !prev);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        title={t.deviceConnect.qrStickerTitle}
        className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
      >
        <QrCode className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <QrCode className="h-4 w-4 text-cyan-400" />
                <span>{t.deviceConnect.qrStickerTitle}</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-0.5">
              <div className="font-semibold text-white">{deviceName}</div>
              <div className="text-slate-400">{area}</div>
              {ipAddress && (
                <div className="font-mono text-cyan-300 text-[11px]">{ipAddress}</div>
              )}
            </div>

            {qrUrl && (
              <div className="flex justify-center">
                <img
                  src={qrUrl}
                  alt={deviceName}
                  className="h-44 w-44 rounded-lg bg-white p-2"
                />
              </div>
            )}

            <div className="text-[10px] font-mono text-slate-400 break-all rounded bg-slate-950 p-2 border border-slate-800">
              {payload}
            </div>

            <div className="flex justify-end gap-2">
              {qrUrl && (
                <a
                  href={qrUrl}
                  download={`${deviceName.replace(/[^a-zA-Z0-9_-]/g, '_')}-qr.png`}
                  className="flex items-center gap-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{t.deviceConnect.downloadQrBtn}</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
