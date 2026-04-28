'use client';

import React, { DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';

type SupportedFormat = 'jpeg' | 'png' | 'webp';
type TaskStatus = 'pending' | 'queued' | 'processing' | 'completed' | 'error';

interface ConversionTask {
  id: string;
  file: File;
  status: TaskStatus;
  progress: number;
  message?: string;
  converted?: File;
  error?: string;
  fallback?: boolean;
  previewUrl?: string;
  orientation?: number;
  originalSize: number;
  convertedSize?: number;
  // 予測計算のために元の解像度を保持
  originalWidth?: number;
  originalHeight?: number;
}

interface ConversionOptions {
  targetFormat: SupportedFormat;
  quality: number;
  longSide: number | null;
  backgroundColor: string;
  targetSizeMB?: number | null;
  useTargetSize?: boolean;
}

const MAX_BROWSER_FILE_MB = 25;
const MAX_SERVER_FILE_MB = 50;
const MAX_CONCURRENT = 3;
const MAX_FILES = 100;

const FORMAT_DESCRIPTIONS = [
  {
    key: 'jpeg',
    title: 'JPEG（.jpg）',
    summary: '非可逆圧縮でファイルサイズが小さく、写真向き。',
    suitedFor: '写真・リアル画像・中間成果物の共有。',
    caution: '透過を扱えず繰り返し保存で劣化します。',
  },
  {
    key: 'png',
    title: 'PNG（.png）',
    summary: '可逆圧縮で透過・輪郭再現に強い。',
    suitedFor: '図面キャプチャ、UI、透過が必要なロゴやサイン。',
    caution: '写真などグラデーションが多い画像は容量が大きくなりがち。',
  },
  {
    key: 'webp',
    title: 'WebP（.webp）',
    summary: '高圧縮率と透過対応を両立する次世代形式。',
    suitedFor: 'Web表示全般（JPEG/PNGより小さいファイルを目指したい時）。',
    caution: '古いブラウザでは非対応。印刷向きではありません。',
  },
  {
    key: 'gif',
    title: 'GIF（.gif）',
    summary: '256色までの可逆圧縮。アニメーションも可能。',
    suitedFor: 'アイコン・シンプルな図。アニメは先頭フレームだけ静止画化します。',
    caution: '写真には不向き。色数制限でバンディングが出やすい。',
  },
  {
    key: 'svg',
    title: 'SVG（.svg）',
    summary: 'ベクター形式。拡大縮小しても劣化しない。',
    suitedFor: 'ロゴ・アイコン・図面の線図。ラスター化してJPEG/PNGへ。',
    caution: '複雑なフィルターが含まれる場合は正しく描画できないことがあります。',
  },
  {
    key: 'heic',
    title: 'HEIC / HEIF',
    summary: 'Appleデバイス標準の高圧縮画像形式。',
    suitedFor: 'iPhone/iPadで撮影された写真の保存向き。',
    caution: 'ブラウザによっては表示不可。変換はサーバ経由で行います。',
  },
  {
    key: 'raw',
    title: 'RAW（CR2 / NEF など）',
    summary: '一眼カメラ用の非圧縮／可逆圧縮データ。',
    suitedFor: '現像・編集を前提としたプロ／ハイアマ用途。',
    caution: 'ブラウザでは直接扱えないため、サーバでJPEG/PNGに変換します。',
  },
];

const ACCEPTED_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'svg',
  'heic',
  'heif',
  'heics',
  'heifs',
  'cr2',
  'nef',
  'tif',
  'tiff',
];

function generateId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getExtension(file: File) {
  const match = /\.([a-zA-Z0-9]+)$/.exec(file.name);
  if (match) return match[1].toLowerCase();
  if (file.type) {
    const subtype = file.type.split('/')[1];
    if (subtype) return subtype.toLowerCase();
  }
  return '';
}

function shouldUseServer(ext: string, type: string) {
  const lower = ext.toLowerCase();
  if (['heic', 'heif', 'heics', 'heifs'].includes(lower)) return true;
  if (['cr2', 'nef', 'raw'].includes(lower)) return true;
  if (type === 'image/heic' || type === 'image/heif') return true;
  return false;
}

function needsBackground(format: SupportedFormat) {
  return format === 'jpeg';
}

function formatBytes(size: number) {
  if (!Number.isFinite(size)) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let idx = 0;
  let value = size;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function resizeToLongSide(width: number, height: number, longSide: number | null) {
  if (!longSide || longSide <= 0) return { width, height };
  const maxSide = Math.max(width, height);
  if (maxSide <= longSide) return { width, height };
  const ratio = longSide / maxSide;
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

async function readOrientation(file: File): Promise<number> {
  try {
    const exifr = await import('exifr');
    const data = await exifr.parse(file, { translateValues: false, pick: ['Orientation'] });
    const value = Array.isArray(data) ? data[0]?.Orientation : data?.Orientation;
    return typeof value === 'number' ? value : 1;
  } catch (error) {
    return 1;
  }
}

// 画像の寸法を読み取るヘルパー関数を追加
async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  // ブラウザで扱える画像のみ対象
  if (!file.type.startsWith('image/')) return null;
  if (file.type === 'image/heic' || file.type === 'image/heif') return null; // 軽量化のためHEICはスキップ
  
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

async function loadImageBitmap(file: File) {
  if ('createImageBitmap' in window) {
    const blob = file.slice(0, file.size, file.type || 'image/*');
    return await createImageBitmap(blob);
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function applyOrientationTransform(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  orientation: number,
) {
  switch (orientation) {
    case 2:
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      break;
    case 3:
      ctx.translate(width, height);
      ctx.rotate(Math.PI);
      break;
    case 4:
      ctx.translate(0, height);
      ctx.scale(1, -1);
      break;
    case 5:
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(1, -1);
      break;
    case 6:
      ctx.translate(width, 0);
      ctx.rotate(0.5 * Math.PI);
      break;
    case 7:
      ctx.translate(width, height);
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(-1, 1);
      break;
    case 8:
      ctx.translate(0, height);
      ctx.rotate(-0.5 * Math.PI);
      break;
    default:
      break;
  }
}

// 指定されたスケールで画像をリサイズ・圧縮するヘルパー関数
async function processImageWithScale(
  image: ImageBitmap | HTMLImageElement,
  scale: number,
  options: ConversionOptions,
  orientation: number,
  naturalWidth: number,
  naturalHeight: number,
): Promise<Blob | null> {
  const needSwap = orientation >= 5 && orientation <= 8;
  const targetWidthRaw = Math.round(naturalWidth * scale);
  const targetHeightRaw = Math.round(naturalHeight * scale);
  const targetWidth = needSwap ? targetHeightRaw : targetWidthRaw;
  const targetHeight = needSwap ? targetWidthRaw : targetHeightRaw;

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (needsBackground(options.targetFormat)) {
    ctx.fillStyle = options.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  ctx.save();
  applyOrientationTransform(ctx, canvas.width, canvas.height, orientation);

  if ('transferFromImageBitmap' in ctx && image instanceof ImageBitmap) {
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.drawImage(image as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  }
  ctx.restore();

  const mime =
    options.targetFormat === 'jpeg'
      ? 'image/jpeg'
      : options.targetFormat === 'png'
        ? 'image/png'
        : 'image/webp';

  const maybeConvertToBlob =
    typeof (canvas as any).convertToBlob === 'function'
      ? ((canvas as any).convertToBlob as (opts: { type: string; quality?: number }) => Promise<Blob>)
      : undefined;

  return maybeConvertToBlob
    ? await maybeConvertToBlob({
        type: mime,
        quality: options.targetFormat === 'png' ? undefined : options.quality / 100,
      })
    : await new Promise<Blob | null>((resolve) => {
        (canvas as HTMLCanvasElement).toBlob(
          b => resolve(b),
          mime,
          options.targetFormat === 'png' ? undefined : options.quality / 100,
        );
      });
}

async function convertInBrowser(
  task: ConversionTask,
  options: ConversionOptions,
  resize: {
    mode: 'original' | 'longer' | 'longer-shorten' | 'custom';
    customWidth?: number | null;
    customHeight?: number | null;
    allowUpscale?: boolean;
  },
): Promise<File> {
  const image = await loadImageBitmap(task.file);
  const orientation = task.orientation || 1;
  const naturalWidth = 'width' in image ? image.width : (image as ImageBitmap).width;
  const naturalHeight = 'height' in image ? image.height : (image as ImageBitmap).height;

  const needSwap = orientation >= 5 && orientation <= 8;
  let targetWidthRaw = naturalWidth;
  let targetHeightRaw = naturalHeight;
  let initialScale = 1;

  // ステップ1: ユーザー指定の幅・高さに基づく初期スケール計算
  if (resize.mode === 'longer') {
    if (options.longSide && options.longSide > 0) {
      const maxSide = Math.max(naturalWidth, naturalHeight);
      if (options.longSide >= maxSide) {
        targetWidthRaw = naturalWidth;
        targetHeightRaw = naturalHeight;
        initialScale = 1;
      } else {
        const { width, height } = resizeToLongSide(
          naturalWidth,
          naturalHeight,
          options.longSide,
        );
        targetWidthRaw = width;
        targetHeightRaw = height;
        initialScale = width / naturalWidth;
      }
    }
  }

  let finalScale = initialScale;

  // ステップ2: 目標ファイルサイズが指定されている場合のスケール調整 (二分探索 + 強制リトライ)
  if (options.useTargetSize && options.targetSizeMB && options.targetSizeMB > 0) {
    const userLimitBytes = options.targetSizeMB * 1024 * 1024;
    // 安全マージン: 目標の95%をターゲットにして、ギリギリのオーバーを防ぐ
    const safeTargetBytes = userLimitBytes * 0.95;
    
    let minScale = 0.01; // 下限1%
    let maxScale = initialScale; // 上限は現在の設定値
    let bestScale = minScale; // 初期値は最小スケール

    // 精度向上のため探索回数を20回に増加
    for (let i = 0; i < 20; i++) {
      const midScale = (minScale + maxScale) / 2;
      const blob = await processImageWithScale(
        image,
        midScale,
        options,
        orientation,
        naturalWidth,
        naturalHeight,
      );

      if (blob) {
        if (blob.size <= safeTargetBytes) {
          bestScale = midScale; // 目標(95%)以下なら採用。もっと大きくできるか試す。
          minScale = midScale;
        } else {
          maxScale = midScale; // オーバーしたら小さくする。
        }
      } else {
        // Blob生成に失敗した場合は、より小さなスケールを試す
        maxScale = midScale;
      }
    }
    finalScale = bestScale;

    // 【重要】最終強制チェック (Fail-safe)
    // 探索で見つけた値でも、圧縮のブレで微妙に超えることがあるため、
    // 実際に生成して userLimitBytes を超えていたら、下回るまで強制的に縮小ループを回す。
    let safetyLoopCount = 0;
    while (safetyLoopCount < 10) {
      const blob = await processImageWithScale(
        image,
        finalScale,
        options,
        orientation,
        naturalWidth,
        naturalHeight,
      );
      if (blob && blob.size <= userLimitBytes) {
        break; // OKならループ抜け
      }
      // オーバーしていたらスケールを 5% ずつ落とす
      finalScale *= 0.95;
      safetyLoopCount++;
    }
  }

  // ステップ3: 最終的なスケールで変換
  const blob = await processImageWithScale(
    image,
    finalScale,
    options,
    orientation,
    naturalWidth,
    naturalHeight,
  );

  if (!blob) {
    throw new Error('Blob生成に失敗しました');
  }

  const newName = task.file.name.replace(/\.[^.]+$/, '') + `_conv.${options.targetFormat}`;
  return new File([blob], newName, { type: blob.type });
}

async function convertViaServer(file: File, targetFormat: SupportedFormat) {
  const endpoint = '/api/convert/heic';
  const params = new URLSearchParams();
  params.set('target', targetFormat);
  const res = await fetch(`${endpoint}?${params.toString()}`, {
    method: 'POST',
    body: file,
  });
  if (!res.ok) {
    throw new Error(`サーバ変換に失敗しました (HTTP ${res.status})`);
  }
  const buffer = await res.arrayBuffer();
  const mime = targetFormat === 'jpeg' ? 'image/jpeg' : targetFormat === 'png' ? 'image/png' : 'image/webp';
  const newName = file.name.replace(/\.[^.]+$/, '') + `_conv.${targetFormat}`;
  return new File([buffer], newName, { type: mime });
}

// 予測サイズ計算ロジック
function estimateFileSize(
  task: ConversionTask,
  options: ConversionOptions,
  resizeMode: string
): string {
  // すでに変換完了している場合は実測値を返す
  if (task.convertedSize) return formatBytes(task.convertedSize);
  
  // 目標サイズ設定が有効な場合
  if (options.useTargetSize && options.targetSizeMB) {
    return `≤ ${options.targetSizeMB} MB`;
  }

  // 解像度が取得できていない場合は予測不可
  if (!task.originalWidth || !task.originalHeight) {
    return '予測中...';
  }

  let estimatedBytes = task.originalSize;

  // 1. リサイズ係数
  let resizeRatio = 1.0;
  if (resizeMode !== 'original') {
    const targetLongSide = parseInt(resizeMode, 10);
    const currentLongSide = Math.max(task.originalWidth, task.originalHeight);
    if (targetLongSide < currentLongSide) {
      // 面積比で計算 (スケールの2乗)
      resizeRatio = Math.pow(targetLongSide / currentLongSide, 2);
    }
  }
  estimatedBytes *= resizeRatio;

  // 2. フォーマット＆品質係数 (経験則に基づくヒューリスティック)
  const isOriginalJpeg = task.file.type === 'image/jpeg';
  const isOriginalPng = task.file.type === 'image/png';

  let formatFactor = 1.0;
  
  if (options.targetFormat === 'jpeg') {
    // PNG -> JPEG: 大きく減る
    if (isOriginalPng) formatFactor = 0.2; 
    // JPEG -> JPEG: 品質設定に依存
    else if (isOriginalJpeg) formatFactor = 0.8;
  } else if (options.targetFormat === 'webp') {
    // JPEGよりもさらに30%ほど小さくなる傾向
    if (isOriginalPng) formatFactor = 0.15;
    else formatFactor = 0.6; // JPEG -> WebP
  } else if (options.targetFormat === 'png') {
    // JPEG -> PNG: 逆に増えることが多い
    if (isOriginalJpeg) formatFactor = 2.5; 
  }

  // 品質係数 (JPEG/WebPのみ)
  let qualityFactor = 1.0;
  if (options.targetFormat !== 'png') {
    // 品質80%付近を基準(1.0)とし、それより下げると下がる
    // 品質曲線はリニアではないため簡易的な2乗カーブで近似
    qualityFactor = Math.pow(options.quality / 90, 2);
  }

  estimatedBytes = estimatedBytes * formatFactor * qualityFactor;

  // あくまで予測なので、あまりに小さすぎる値や大きすぎる値の補正
  if (estimatedBytes < 1024) estimatedBytes = 1024; // 最低1KB

  return `約 ${formatBytes(estimatedBytes)}`;
}

const ImageConverter: React.FC = () => {
  const { isLoggedIn } = useAuth();
  const [tasks, setTasks] = useState<ConversionTask[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [targetFormat, setTargetFormat] = useState<SupportedFormat>('jpeg');
  const [quality, setQuality] = useState(80);
  const RESIZE_OPTIONS = ['original', '1280', '1024', '800', '640', '400', '320', '160'] as const;
  type ResizeOption = typeof RESIZE_OPTIONS[number];
  const [resizeMode, setResizeMode] = useState<ResizeOption>('original');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [targetSizeMB, setTargetSizeMB] = useState<number | ''>('');
  const [useTargetSize, setUseTargetSize] = useState<boolean>(false);

  const optionsRef = useRef<ConversionOptions>({
    targetFormat,
    quality,
    longSide: null,
    backgroundColor,
    targetSizeMB: null,
    useTargetSize: false,
  });
  const tasksRef = useRef<ConversionTask[]>([]);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);
  useEffect(() => {
    const longSide = resizeMode !== 'original' ? Number(resizeMode) || null : null;
    optionsRef.current = {
      targetFormat,
      quality,
      longSide,
      backgroundColor,
      targetSizeMB: typeof targetSizeMB === 'number' ? targetSizeMB : null,
      useTargetSize,
    };
  }, [targetFormat, quality, resizeMode, backgroundColor, targetSizeMB, useTargetSize]);

  const processingRef = useRef(0);
  const startNextRef = useRef<() => void>(() => {});

  const updateTask = useCallback((taskId: string, partial: Partial<ConversionTask>) => {
    setTasks(prev => prev.map(task => (task.id === taskId ? { ...task, ...partial } : task)));
  }, []);

  const processTask = useCallback(
    (taskId: string) => {
      const run = async () => {
        const task = tasksRef.current.find(t => t.id === taskId);
        if (!task) return;
        try {
          updateTask(taskId, { progress: 10, message: '変換を準備中...' });
          const options = optionsRef.current;
          const ext = getExtension(task.file);
          const useServer = shouldUseServer(ext, task.file.type);
          let converted: File;
          if (useServer) {
            updateTask(taskId, { message: 'サーバ変換中...', fallback: true });
            converted = await convertViaServer(task.file, options.targetFormat);
          } else {
            const orientation = await readOrientation(task.file);
            updateTask(taskId, { orientation, message: 'ブラウザ変換中...' });
            const longSide = resizeMode !== 'original' ? Number(resizeMode) || null : null;
            const resizeModeForConvert: 'original' | 'longer' = resizeMode === 'original' ? 'original' : 'longer';
            const resizeOptions = {
              mode: resizeModeForConvert,
              customWidth: null as number | null,
              customHeight: null as number | null,
              allowUpscale: false as boolean,
            };
            const adjustedOptions: ConversionOptions = {
              ...options,
              longSide,
            };
            converted = await convertInBrowser(
              { ...task, orientation },
              adjustedOptions,
              resizeOptions,
            );
          }
          updateTask(taskId, {
            status: 'completed',
            converted,
            convertedSize: converted.size,
            progress: 100,
            message: '完了',
          });
        } catch (error: any) {
          console.error('変換失敗', error);
          updateTask(taskId, {
            status: 'error',
            error: error?.message ?? '変換に失敗しました。',
            message: error?.message ?? '変換に失敗しました。',
            progress: 0,
          });
        } finally {
          processingRef.current = Math.max(0, processingRef.current - 1);
          startNextRef.current();
        }
      };
      run();
    },
    [updateTask],
  );

  const startNext = useCallback(() => {
    setTasks(prev => {
      if (processingRef.current >= MAX_CONCURRENT) return prev;
      const index = prev.findIndex(task => task.status === 'queued');
      if (index === -1) return prev;
      const updated = [...prev];
      const task: ConversionTask = {
        ...updated[index],
        status: 'processing',
        progress: 5,
        message: 'キュー処理中...',
      };
      updated[index] = task;
      processingRef.current += 1;
      setTimeout(() => processTask(task.id), 10);
      return updated;
    });
  }, [processTask]);

  useEffect(() => {
    startNextRef.current = startNext;
  }, [startNext]);

  // 自動変換を停止 - ボタンクリックで開始する
  // useEffect(() => {
  //   if (tasks.some(task => task.status === 'queued') && processingRef.current < MAX_CONCURRENT) {
  //     startNextRef.current();
  //   }
  // }, [tasks]);

  const startConversion = useCallback(() => {
    if (tasks.length === 0) {
      setProcessingError('ファイルが追加されていません。');
      setTimeout(() => setProcessingError(null), 3000);
      return;
    }
    // すべてのpendingタスクをキューに追加
    setTasks(prev => prev.map(task => 
      task.status === 'pending' ? { ...task, status: 'queued' } : task
    ));
    // 変換を開始
    if (processingRef.current < MAX_CONCURRENT) {
      startNextRef.current();
    }
  }, [tasks]);

  const enqueueFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!isLoggedIn) {
        alert('入力するには会員登録（無料）が必要です。');
        return;
      }
      const list = Array.from(files);
      if (!list.length) return;
      const newTasks: ConversionTask[] = [];
      const warnings: string[] = [];
      
      // ループ処理
      for (const file of list.slice(0, MAX_FILES - tasks.length)) {
        const ext = getExtension(file);
        if (!ACCEPTED_EXTENSIONS.includes(ext)) {
          warnings.push(`${file.name}: 未対応の形式です。`);
          continue;
        }
        const useServer = shouldUseServer(ext, file.type);
        const limitMB = useServer ? MAX_SERVER_FILE_MB : MAX_BROWSER_FILE_MB;
        if (file.size > limitMB * 1024 * 1024) {
          warnings.push(`${file.name}: ファイルサイズが上限 ${limitMB}MB を超えています。`);
          continue;
        }
        const id = generateId();
        
        // とりあえずタスクを作成
        const task: ConversionTask = {
          id,
          file,
          status: 'pending',
          progress: 0,
          fallback: useServer,
          originalSize: file.size,
        };
        newTasks.push(task);
      }

      if (warnings.length) {
        setProcessingError(warnings.join('\n'));
        setTimeout(() => setProcessingError(null), 6000);
      }
      
      if (newTasks.length) {
        // 先にStateに追加
        setTasks(prev => [...prev, ...newTasks]);

        // 後追いで画像の寸法を取得してStateを更新 (UIブロック防止のため非同期で)
        newTasks.forEach(async (task) => {
           const dims = await getImageDimensions(task.file);
           if (dims) {
             setTasks(prev => prev.map(t => 
               t.id === task.id ? { ...t, originalWidth: dims.width, originalHeight: dims.height } : t
             ));
           }
        });
      }
    },
    [tasks.length, isLoggedIn],
  );

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isLoggedIn) {
      alert('入力するには会員登録（無料）が必要です。');
      return;
    }
    if (tasks.length >= MAX_FILES) {
      setProcessingError(`これ以上追加できません（最大 ${MAX_FILES} 件）。`);
      return;
    }
    const files = e.dataTransfer.files;
    enqueueFiles(files);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isLoggedIn) {
      alert('入力するには会員登録（無料）が必要です。');
      if (e.target) e.target.value = '';
      return;
    }
    if (e.target.files) {
      enqueueFiles(e.target.files);
      e.target.value = '';
    }
  };

  const downloadFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const downloadAllAsZip = async () => {
    const ready = tasks.filter(task => task.status === 'completed' && task.converted);
    if (!ready.length) {
      setProcessingError('ダウンロード可能なファイルがありません。');
      setTimeout(() => setProcessingError(null), 3000);
      return;
    }
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      ready.forEach(task => {
        if (task.converted) {
          zip.file(task.converted.name, task.converted);
        }
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `converted_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      }, 100);
    } catch (error) {
      console.error('ZIP作成に失敗', error);
      setProcessingError('ZIPの生成に失敗しました。');
      setTimeout(() => setProcessingError(null), 4000);
    }
  };

  const clearCompleted = () => {
    setTasks(prev => prev.filter(task => task.status !== 'completed'));
  };

  const clearAll = () => {
    setTasks([]);
    setProcessingError(null);
    processingRef.current = 0;
  };

  const targetFormatDescriptions = useMemo(() => {
    return (
      <div className="space-y-2 mt-4 text-[11px] text-gray-600">
        {FORMAT_DESCRIPTIONS.map(info => (
          <div
            key={info.key}
            className="flex flex-col sm:flex-row sm:items-start sm:gap-3 border border-gray-100 bg-gray-50 rounded px-3 py-2"
          >
            <div className="flex flex-col flex-1 sm:flex-row sm:items-start sm:gap-3">
              <strong className="text-gray-800 sm:w-32">{info.title}</strong>
              <div className="flex-1 sm:flex sm:flex-col sm:space-y-1 sm:items-start text-left sm:text-left">
              <div>{info.summary}</div>
              <div><span className="font-semibold text-gray-700">向いている:</span> {info.suitedFor}</div>
              <div><span className="font-semibold text-gray-700">注意点:</span> {info.caution}</div>
            </div>
            </div>
          </div>
        ))}
      </div>
    );
  }, []);

  // 完了していないタスクのみを「預かり中」として扱う
  const incompleteTasks = tasks.filter(task => 
    task.status === 'pending' || task.status === 'queued' || task.status === 'processing'
  );
  
  const pendingCount = tasks.filter(task => task.status === 'pending').length;
  const processingCount = tasks.filter(task => task.status === 'processing' || task.status === 'queued').length;
  const completedCount = tasks.filter(task => task.status === 'completed').length;

  // 現在の設定オプションをまとめる（予測計算用）
  const currentOptions: ConversionOptions = {
    targetFormat,
    quality,
    longSide: resizeMode !== 'original' ? Number(resizeMode) : null,
    backgroundColor,
    targetSizeMB: typeof targetSizeMB === 'number' ? targetSizeMB : null,
    useTargetSize,
  };

  return (
    <div className="w-full bg-white rounded-b-lg shadow-sm border-b border-gray-100">
      <div className="p-4 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div>
          <h3 className="text-[13px] font-medium">画像変換・画像圧縮</h3>
          <p className="text-[11px] mt-0.5">JPEG/PNG/WebP/GIF/SVG/HEIC/RAWなど様々な形式に対応。一括変換・圧縮・リサイズが可能</p>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* --- 左カラム：入力・設定 --- */}
          <div className="space-y-6">
            {/* 1. ファイル選択エリア */}
            <div>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  {/* incompleteTasks（未完了タスク）がない場合は初期表示に戻す */}
                  {incompleteTasks.length === 0 ? (
                    <>
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <p className="text-[12px] text-gray-600">画像ファイルをドラッグ＆ドロップ</p>
                      <label
                        htmlFor="image-converter-input"
                        onClick={(e) => {
                          if (!isLoggedIn) {
                            alert('入力するには会員登録（無料）が必要です。');
                            e.preventDefault();
                          }
                        }}
                        className="mt-2 bg-gray-200 text-gray-700 px-4 py-1.5 rounded text-[11px] hover:bg-gray-300 cursor-pointer"
                      >
                        ファイルを選択
                      </label>
                    </>
                  ) : (
                    <>
                      {/* 預かり中（未完了）のファイルがある場合のみ表示 */}
                      <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <p className="text-[12px] font-bold text-gray-700">
                        {incompleteTasks.length}件のファイルを預かり中
                      </p>
                      <p className="text-[11px] text-gray-500">
                        待機: {pendingCount}件 / 処理中: {processingCount}件
                      </p>
                      <label
                        htmlFor="image-converter-input"
                        onClick={(e) => {
                          if (!isLoggedIn) {
                            alert('入力するには会員登録（無料）が必要です。');
                            e.preventDefault();
                          }
                        }}
                        className="mt-2 text-[11px] text-blue-600 hover:underline cursor-pointer"
                      >
                        さらに追加
                      </label>
                    </>
                  )}
                </div>
                <input
                  id="image-converter-input"
                  type="file"
                  multiple
                  accept={ACCEPTED_EXTENSIONS.map(ext => `.${ext}`).join(',')}
                  className="hidden"
                  onChange={handleInputChange}
                />
                <p className="mt-4 text-[10px] text-gray-500">
                  対応形式: PNG / JPEG / WebP / GIF / SVG / HEIC / HEIF / CR2 / NEF（最大 {MAX_BROWSER_FILE_MB}MB、HEIC/RAW は {MAX_SERVER_FILE_MB}MB） | 最大 {MAX_FILES} 枚
                </p>
              </div>
            </div>

            {processingError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-[11px] text-red-600">
                {processingError.split('\n').map((msg, idx) => (
                  <div key={idx}>{msg}</div>
                ))}
              </div>
            )}

            {/* 2. 設定エリア */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-[12px] font-bold mb-3 text-gray-700 border-b border-gray-200 pb-1">変換設定</label>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium mb-1 text-gray-600">出力形式</label>
                  <select
                    value={targetFormat}
                    onChange={e => setTargetFormat(e.target.value as SupportedFormat)}
                    className="w-full p-1.5 border rounded text-[11px] border-gray-300 bg-white"
                  >
                    <option value="jpeg">JPEG（.jpg）</option>
                    <option value="png">PNG（.png）</option>
                    <option value="webp">WebP（.webp）</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-1">
                    <label className="block text-[11px] font-medium text-gray-600">品質（JPEG/WebPのみ）</label>
                    <span className="text-[11px] font-mono text-blue-600">{quality}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={10}
                    value={quality}
                    onChange={e => setQuality(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                    <span>低画質(小)</span>
                    <span>高画質(大)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium mb-1 text-gray-600">リサイズ設定</label>
                  <select
                    value={resizeMode}
                    onChange={e => setResizeMode(e.target.value as ResizeOption)}
                    className="w-full p-1.5 border rounded text-[11px] border-gray-300 bg-white"
                  >
                    <option value="original">原寸維持</option>
                    <option value="1280">1280px</option>
                    <option value="1024">1024px</option>
                    <option value="800">800px</option>
                    <option value="640">640px</option>
                    <option value="400">400px</option>
                    <option value="320">320px</option>
                    <option value="160">160px</option>
                  </select>
                  {resizeMode !== 'original' && (
                    <p className="mt-1 text-[10px] text-gray-500">
                      長辺を{resizeMode}pxに設定し、短辺は元画像の比率を保ったまま縮小します。
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium mb-1 text-gray-600">背景色（透過 → JPEG/WebP 変換時）</label>
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={e => setBackgroundColor(e.target.value)}
                    className="w-full h-10 border rounded border-gray-300"
                  />
                  <p className="mt-1 text-[10px] text-gray-500">
                    JPEG など透過を扱えない形式ではここで指定した色で塗ります。
                  </p>
                </div>

                {/* 目標ファイルサイズ設定 */}
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[11px] font-medium text-gray-600 flex items-center gap-1.5">
                      <span className="w-1 h-4 bg-green-500 rounded-full"></span>
                      目標ファイルサイズ
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={useTargetSize}
                        onChange={e => setUseTargetSize(e.target.checked)}
                        className="w-3.5 h-3.5 text-green-500 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className="text-[10px] text-gray-600 group-hover:text-gray-800 transition-colors">有効にする</span>
                    </label>
                  </div>
                  {useTargetSize && (
                    <div className="bg-green-50 p-3 rounded-md border border-green-100">
                      <label className="block text-xs font-bold text-green-800 mb-1">上限サイズ (MB)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={targetSizeMB}
                          onChange={e => setTargetSizeMB(e.target.value ? Number(e.target.value) : '')}
                          placeholder="2.0"
                          className="w-full text-[11px] px-2.5 py-1.5 border border-green-300 rounded-md focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none"
                        />
                        <span className="text-xs text-green-700 font-medium">MB以下</span>
                      </div>
                      <p className="text-[10px] text-green-700 mt-1.5 leading-tight">
                        ※確実に下回るよう、約95%のサイズを目指して調整します。
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. 変換開始ボタン */}
            {/* ボタンの活性状態を incompleteTasks（未完了タスク）があるかどうかで制御 */}
            <button
              type="button"
              onClick={startConversion}
              disabled={incompleteTasks.length === 0 || tasks.some(task => task.status === 'processing')}
              className={`w-full py-3 rounded-lg text-sm font-bold shadow-sm transition-all ${
                incompleteTasks.length === 0 || tasks.some(task => task.status === 'processing')
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
              }`}
            >
              {tasks.some(task => task.status === 'processing') ? '処理中...' : '画像変換・圧縮を開始する'}
            </button>
          </div>

          {/* --- 右カラム：結果・出力 --- */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 flex flex-col h-full min-h-[300px]">
            <label className="block text-[12px] font-bold mb-3 text-gray-700 border-b border-gray-200 pb-1">処理結果</label>

            {/* 初期状態 */}
            {tasks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <p className="text-[11px]">画像ファイルを追加するとここに結果が表示されます</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-2">
                <div className="overflow-y-auto max-h-[400px] space-y-2 pr-1 custom-scrollbar">
                  {tasks.map(task => {
                    const isCompleted = task.status === 'completed' && task.converted;
                    const finalSize = task.converted?.size ?? 0;
                    
                    // 完了時は実測値、未完了時は予測値を表示
                    const sizeDisplay = isCompleted 
                      ? formatBytes(finalSize) 
                      : estimateFileSize(task, currentOptions, resizeMode);

                    // 完了時の削減率
                    const compressionRate = isCompleted
                      ? Math.round((1 - finalSize / task.originalSize) * 100)
                      : 0;
                    
                    return (
                      <div key={task.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-gray-800 truncate" title={task.file.name}>{task.file.name}</p>
                            
                            {/* サイズ表示エリアの修正 */}
                            <div className="flex items-center flex-wrap gap-1.5 mt-1 text-[10px]">
                              {/* 元サイズ */}
                              <span className="text-gray-500">{formatBytes(task.originalSize)}</span>
                              <span className="text-gray-400">→</span>
                              
                              {/* 予測 or 実測サイズ */}
                              <span className={`font-bold text-[11px] ${isCompleted ? 'text-blue-600' : 'text-gray-600'}`}>
                                {sizeDisplay}
                              </span>

                              {/* 予測ラベル（未完了時のみ） */}
                              {!isCompleted && (
                                <span className="text-[9px] text-gray-400 border border-gray-200 px-1 rounded">
                                  予測
                                </span>
                              )}

                              {/* 完了後のバッジ */}
                              {isCompleted && compressionRate > 0 && (
                                <span className="bg-blue-100 text-blue-700 px-1 py-0.5 rounded text-[9px] font-bold">
                                  -{compressionRate}%
                                </span>
                              )}
                              {isCompleted && compressionRate < 0 && (
                                <span className="bg-red-100 text-red-700 px-1 py-0.5 rounded text-[9px]">
                                  +{Math.abs(compressionRate)}%
                                </span>
                              )}
                            </div>
                          </div>

                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-medium ml-2 ${
                              task.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : task.status === 'error'
                                  ? 'bg-red-100 text-red-600'
                                  : task.status === 'processing'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {task.status === 'pending' && '待機'}
                            {task.status === 'queued' && '待機'}
                            {task.status === 'processing' && '処理中'}
                            {task.status === 'completed' && '完了'}
                            {task.status === 'error' && '失敗'}
                          </span>
                        </div>
                        
                        {/* プログレスバー */}
                        {(task.status === 'processing' || task.status === 'queued') && (
                          <div className="mb-2">
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                  task.status === 'queued' ? 'bg-yellow-400 w-full animate-pulse' : 'bg-blue-600'
                                }`}
                                style={{ width: task.status === 'queued' ? '100%' : `${Math.min(100, task.progress)}%` }}
                              />
                            </div>
                            {task.message && (
                              <p className="text-[9px] text-gray-500 mt-1">{task.message}</p>
                            )}
                          </div>
                        )}

                        {/* 完了後のアクションエリア */}
                        {isCompleted && (
                          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                             <div className="text-[10px] text-gray-400 truncate">
                               {task.converted?.name}
                             </div>
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded bg-blue-600 text-white text-[10px] font-bold hover:bg-blue-700 transition flex items-center gap-1 shrink-0"
                              onClick={() => task.converted && downloadFile(task.converted)}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                              保存
                            </button>
                          </div>
                        )}

                        {task.status === 'error' && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <p className="text-[10px] text-red-600 font-medium flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              {task.error}
                            </p>
                          </div>
                        )}

                        {task.fallback && (
                          <p className="text-[9px] text-purple-600 mt-1">サーバ変換</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 右カラム下部のアクションエリア（ZIPDL & クリアボタン） */}
                <div className="mt-auto pt-3 border-t border-gray-200 space-y-2">
                  {completedCount > 0 && (
                    <button
                      type="button"
                      className="w-full px-4 py-3 rounded-lg bg-green-600 text-white text-[12px] font-bold hover:bg-green-700 hover:shadow-md transition-all flex items-center justify-center gap-2"
                      onClick={downloadAllAsZip}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      まとめてZIPでダウンロード ({completedCount}件)
                    </button>
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex-1 px-3 py-2 rounded border border-gray-300 hover:bg-gray-100 text-[11px] text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={clearCompleted}
                      disabled={completedCount === 0}
                    >
                      完了のみ削除
                    </button>
                    <button
                      type="button"
                      className="flex-1 px-3 py-2 rounded border border-gray-300 hover:bg-gray-100 text-[11px] text-gray-700"
                      onClick={clearAll}
                      disabled={tasks.length === 0}
                    >
                      すべてクリア
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageConverter;


