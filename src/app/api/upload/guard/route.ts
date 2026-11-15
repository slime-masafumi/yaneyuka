import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

type GuardRequestBody = {
  fileSize?: number;
};

// config/limits が読めなかった場合のフォールバック（FileTransfer.tsx の既定値と揃える）
const DEFAULT_MAX_FILE_MB = 2048;
const DEFAULT_MAX_USER_MONTHLY_MB = 2048;

const MB = 1024 * 1024;

// FileTransfer.tsx の getMonthKey() と同じ形式（例: 2026-08）にすること。
// ずれると別ドキュメントを読み、使用量が常に 0 と判定されてしまう。
function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function deny(reason: string, status = 200) {
  return NextResponse.json({ allowed: false, reason }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GuardRequestBody;

    if (!body || typeof body.fileSize !== 'number' || !Number.isFinite(body.fileSize) || body.fileSize <= 0) {
      return deny('invalid_payload', 400);
    }

    // 呼び出し元を ID トークンで確認する。
    // 以前はこのエンドポイントが常に allowed: true を返しており、容量制限は
    // クライアント側の JS だけで判定されていた（＝書き換えれば素通り）。
    const authHeader = req.headers.get('authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!idToken) {
      return deny('unauthenticated', 401);
    }

    const auth = getAdminAuth();
    const db = getAdminDb();
    if (!auth || !db) {
      // 検証できない状態で通すと制限が無いのと同じなので、ここは閉じる側に倒す。
      console.error('[upload/guard] Firebase Admin が初期化できていないため拒否しました');
      return deny('server_unavailable', 503);
    }

    let uid: string;
    try {
      uid = (await auth.verifyIdToken(idToken)).uid;
    } catch {
      return deny('invalid_token', 401);
    }

    // 制限値と現在の使用量を、クライアントではなくサーバー側で読む
    const [limitsSnap, usageSnap] = await Promise.all([
      db.collection('config').doc('limits').get(),
      db.collection('usage').doc(`${uid}_${currentMonthKey()}`).get(),
    ]);

    const limits = limitsSnap.exists ? (limitsSnap.data() as Record<string, unknown>) : {};
    const maxFileMB = typeof limits.maxFileMB === 'number' ? limits.maxFileMB : DEFAULT_MAX_FILE_MB;
    const maxUserMonthlyMB =
      typeof limits.maxUserMonthlyMB === 'number' ? limits.maxUserMonthlyMB : DEFAULT_MAX_USER_MONTHLY_MB;
    const uploadsEnabled = limits.uploadsEnabled !== false;

    if (!uploadsEnabled) {
      return deny('現在アップロードは停止されています。');
    }

    if (body.fileSize > maxFileMB * MB) {
      return deny(`ファイルサイズが上限 ${maxFileMB}MB を超えています。`);
    }

    const usageData = usageSnap.exists ? usageSnap.data() : undefined;
    const uploadedBytes = typeof usageData?.uploadedBytes === 'number' ? usageData.uploadedBytes : 0;

    if (uploadedBytes + body.fileSize > maxUserMonthlyMB * MB) {
      return deny('今月のアップロード上限を超えます。');
    }

    return NextResponse.json({ allowed: true });
  } catch (error) {
    console.error('[upload/guard] error', error);
    return deny('internal_error', 500);
  }
}
