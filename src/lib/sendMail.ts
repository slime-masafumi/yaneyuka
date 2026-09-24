/**
 * サーバーからメールを 1 通送る（SMTP の設定は /api/contact と同じ環境変数）。
 * 設定が無い開発環境では送らずにログへ出す。失敗しても呼び出し元の処理は止めない。
 */
import nodemailer from 'nodemailer';

export async function sendMail(mail: { to: string; subject: string; text: string }): Promise<{ ok: boolean; dryRun?: boolean }> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || '587');
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user || 'info@yaneyuka.com';
  if (!host || !user || !pass) {
    console.log('[sendMail] (dry-run) to=%s subject=%s\n%s', mail.to, mail.subject, mail.text);
    return { ok: true, dryRun: true };
  }
  try {
    await nodemailer.createTransport({ host, port, secure, auth: { user, pass } }).sendMail({ from, ...mail });
    return { ok: true };
  } catch (e) {
    console.error('[sendMail] failed', e);
    return { ok: false };
  }
}
