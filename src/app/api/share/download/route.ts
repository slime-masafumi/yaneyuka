import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
// firebase-admin は静的 import しない（詳細は firebaseAdmin.ts のコメント参照）。
// 静的に書くとビルドマシンの絶対パス経由で参照されてしまい、
// 本番コンテナではこのルートが起動時に落ちて 500 になる。
import { getAdminAuth, getAdminDb, getFieldValue } from '@/lib/firebaseAdmin';
import { verifySharePassword } from '@/lib/sharePassword';
import { sendMail } from '@/lib/sendMail';

export const runtime = 'nodejs';

/**
 * 共有リンクのダウンロードを記録し、サイト全体の帯域上限を判定したうえで
 * 実ダウンロードURLを返す。
 *
 * これまでこの計測はブラウザ側でやろうとしていたが、共有リンクの受け取り手は
 * 未ログインなので
 *   - uploads/{fileId} を読めない（ルールでオーナー限定）
 *   - usage/* に書けない（ルールで要ログイン）
 * のどちらにも引っかかり、downloadedBytes が一度も増えていなかった。
 * その結果 config/limits.siteMonthlyDownloadGBCap は常に 0GB 消費と判定され、
 * 帯域の上限がまったく効いていなかった。
 *
 * ★このエンドポイントは未ログインでも叩ける（共有リンクの受け取り手は
 *   ログインしていないため、認証を要求できない）。素朴に「呼ばれたら
 *   ファイルサイズ分を加算」すると、コードを1つ知っている人がループで叩くだけで
 *   usage/site_* を膨らませられる。この値は FileTransfer.tsx でサイト全体の
 *   アップロード可否の判定に使われているので、全ユーザーのアップロードを
 *   止められてしまう。そこで
 *     - 同じ (コード, 送信元IP, 1時間) につき1回だけ計上する
 *     - 1コードあたりの1日の計上回数に上限を設ける
 *   の2段で歯止めをかける。
 */

type DownloadRequestBody = {
  code?: string;
  /** 合言葉つきのリンクのときだけ */
  password?: string;
};

/** 合言葉の入れ間違いは、1コードにつき1時間でこの回数まで（総当たりよけ） */
const MAX_PASSWORD_FAILS_PER_HOUR = 10;

const GB = 1024 * 1024 * 1024;
const DEFAULT_SITE_MONTHLY_DOWNLOAD_GB_CAP = 100;

/** 同一コードを1日に何回まで計上するか。これを超えたら濫用とみなして配信も止める。 */
const MAX_COUNTED_DOWNLOADS_PER_CODE_PER_DAY = 300;

/** 計測ガード用ドキュメントの保持期間（cleanupShareDownloadGuards が消す） */
const GUARD_RETENTION_DAYS = 2;

// FileTransfer.tsx / upload/guard と同じ形式（例: 2026-08）にすること。
// ずれると別ドキュメントを読み書きして計測が壊れる。
function currentMonthKey(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function dayKey(now: Date): string {
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
}

function hourKey(now: Date): string {
  return `${dayKey(now)}${String(now.getHours()).padStart(2, '0')}`;
}

/**
 * 送信元の識別子。IPをそのまま保存すると個人データを持つことになるので、
 * コードと混ぜてハッシュ化した短い値だけを持つ（コード横断で名寄せできない）。
 */
function clientKey(req: NextRequest, code: string): string {
  const forwarded = req.headers.get('x-forwarded-for') || '';
  const ip = forwarded.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
  return createHash('sha256').update(`${code}:${ip}`).digest('hex').slice(0, 24);
}

function fail(reason: string, status: number) {
  return NextResponse.json({ ok: false, reason }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DownloadRequestBody;
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    // ドキュメントIDとして使うので形式を固定する
    if (!code || !/^[A-Z0-9]{4,32}$/.test(code)) {
      return fail('invalid_code', 400);
    }

    const db = getAdminDb();
    const FieldValue = getFieldValue();
    if (!db || !FieldValue) {
      // 計測できない状態でダウンロードを通すと帯域上限が無いのと同じになる
      console.error('[share/download] Firebase Admin が初期化できていません');
      return fail('server_unavailable', 503);
    }

    const shareSnap = await db.collection('shareLinks').doc(code).get();
    if (!shareSnap.exists) {
      return fail('not_found', 404);
    }
    const share = shareSnap.data() as Record<string, any>;

    // 期限判定もサーバー側で行う（クライアントだけの判定は迂回できる）
    const expiresAt = share.expiresAt?.toMillis?.();
    if (typeof expiresAt === 'number' && expiresAt < Date.now()) {
      return fail('expired', 410);
    }

    const now = new Date();
    const monthKey = currentMonthKey(now);
    const [limitsSnap, siteUsageSnap] = await Promise.all([
      db.collection('config').doc('limits').get(),
      db.collection('usage').doc(`site_${monthKey}`).get(),
    ]);

    const limits = limitsSnap.exists ? (limitsSnap.data() as Record<string, unknown>) : {};
    const capGB =
      typeof limits.siteMonthlyDownloadGBCap === 'number'
        ? limits.siteMonthlyDownloadGBCap
        : DEFAULT_SITE_MONTHLY_DOWNLOAD_GB_CAP;
    const downloadedBytes =
      typeof siteUsageSnap.data()?.downloadedBytes === 'number' ? siteUsageSnap.data()!.downloadedBytes : 0;

    // ファイルサイズと実URL。
    // downloadUrl は shareLinks には持たせない（このドキュメントはコードを知っていれば
    // 誰でも読めるため、トークン付きURLを載せるとゲートを通さずに落とせてしまう）。
    // オーナー限定の uploads/{fileId} から引く。古いリンクだけ shareLinks の値にフォールバックする。
    let size = typeof share.size === 'number' ? share.size : 0;
    let downloadUrl = typeof share.downloadUrl === 'string' ? share.downloadUrl : null;
    const upload = typeof share.fileId === 'string' ? (await db.collection('uploads').doc(share.fileId).get()).data() : undefined;
    if (!size && typeof upload?.size === 'number') size = upload.size;
    if (!downloadUrl && typeof upload?.downloadUrl === 'string') downloadUrl = upload.downloadUrl;
    if (!downloadUrl) {
      return fail('not_found', 404);
    }

    // --- 合言葉 ---
    // ハッシュは uploads/{fileId}（オーナーしか読めない）にだけある。入れ間違いは1時間に10回まで。
    if (typeof upload?.passwordHash === 'string' && typeof upload?.passwordSalt === 'string') {
      const password = typeof body?.password === 'string' ? body.password.slice(0, 200) : '';
      if (!password) return fail('password_required', 401);
      const failRef = db.collection('shareDownloadMarks').doc(`${code}_fail_${hourKey(now)}`);
      const fails = (await failRef.get()).data()?.count;
      if (typeof fails === 'number' && fails >= MAX_PASSWORD_FAILS_PER_HOUR) return fail('too_many_attempts', 429);
      const ok = await verifySharePassword(password, {
        passwordHash: upload.passwordHash,
        passwordSalt: upload.passwordSalt,
        passwordIter: typeof upload.passwordIter === 'number' ? upload.passwordIter : 120000,
      });
      if (!ok) {
        await failRef.set({ code, count: FieldValue.increment(1), expiresAt: new Date(now.getTime() + GUARD_RETENTION_DAYS * 86400000) }, { merge: true });
        return fail('wrong_password', 401);
      }
    }

    // --- 濫用よけ ---
    // 同じ (コード, 送信元, 1時間) は1回だけ計上する。作成できたら「今回が初回」。
    const markRef = db
      .collection('shareDownloadMarks')
      .doc(`${code}_${clientKey(req, code)}_${hourKey(now)}`);
    const guardExpiresAt = new Date(now.getTime() + GUARD_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    let shouldCount = true;
    try {
      await markRef.create({ code, createdAt: now, expiresAt: guardExpiresAt });
    } catch {
      // すでに存在する = この1時間で計上済み。配信は通すが二重計上しない。
      shouldCount = false;
    }

    if (shouldCount) {
      const dailyRef = db.collection('shareDownloadDaily').doc(`${code}_${dayKey(now)}`);
      const dailyCount = (await dailyRef.get()).data()?.count;
      if (typeof dailyCount === 'number' && dailyCount >= MAX_COUNTED_DOWNLOADS_PER_CODE_PER_DAY) {
        // 1つの共有コードが1日にこの回数を超えるのは通常の利用ではない
        return fail('too_many_requests', 429);
      }
      await dailyRef.set(
        { code, count: FieldValue.increment(1), expiresAt: guardExpiresAt },
        { merge: true },
      );

      // 送付台帳: 相手が開いたかをオーナーの記録に残す（同じ送信元は1時間に1回だけ数える）。
      // 受け取り手は未ログインで uploads を書けないので、ここ（サーバー）で書く。
      if (typeof share.fileId === 'string' && share.fileId) {
        const uploadRef = db.collection('uploads').doc(share.fileId);
        const first = upload?.firstDownloadedAt;
        await uploadRef.set(
          {
            downloadCount: FieldValue.increment(1),
            lastDownloadedAt: now,
            ...(first ? {} : { firstDownloadedAt: now }),
          },
          { merge: true },
        );
        // 初めて開かれたら、オーナーにメールで知らせる（オーナーが「開いたら知らせる」にしたときだけ）
        if (!first && upload?.notifyOnOpen === true && typeof share.owner === 'string') {
          try {
            const email = (await getAdminAuth()?.getUser(share.owner))?.email;
            if (email) {
              const who = typeof upload.recipient === 'string' && upload.recipient ? `${upload.recipient} ` : '';
              await sendMail({
                to: email,
                subject: `【yaneyuka】${who}ファイルが開かれました: ${upload.fileName ?? ''}`,
                text: [
                  `${who}送ったファイルが初めてダウンロードされました。`,
                  '',
                  `ファイル: ${upload.fileName ?? ''}`,
                  typeof upload.note === 'string' && upload.note ? `件名: ${upload.note}` : '',
                  `日時: ${now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`,
                  '',
                  '送付台帳（マイページ → ファイル転送）で開封の記録を確認できます。',
                  'このお知らせは、ファイル転送で「開いたらメールで知らせる」にしたファイルにだけ届きます。',
                ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n'),
              });
            }
          } catch (e) {
            console.error('[share/download] 開封のお知らせに失敗', e);
          }
        }
      }
    }

    if (downloadedBytes + (shouldCount ? size : 0) > capGB * GB) {
      return fail('site_bandwidth_exceeded', 429);
    }

    if (shouldCount && size > 0) {
      const batch = db.batch();
      batch.set(
        db.collection('usage').doc(`site_${monthKey}`),
        { downloadedBytes: FieldValue.increment(size) },
        { merge: true },
      );
      if (typeof share.owner === 'string' && share.owner) {
        batch.set(
          db.collection('usage').doc(`${share.owner}_${monthKey}`),
          { downloadedBytes: FieldValue.increment(size) },
          { merge: true },
        );
      }
      await batch.commit();
    }

    return NextResponse.json({ ok: true, downloadUrl });
  } catch (error) {
    console.error('[share/download] error', error);
    return fail('internal_error', 500);
  }
}
