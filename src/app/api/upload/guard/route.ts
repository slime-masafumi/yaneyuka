import { NextRequest, NextResponse } from 'next/server';

type GuardRequestBody = {
  fileSize?: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GuardRequestBody;

    if (!body || typeof body.fileSize !== 'number' || Number.isNaN(body.fileSize)) {
      return NextResponse.json(
        { allowed: false, reason: 'invalid_payload' },
        { status: 400 }
      );
    }

    // ここでは追加の制限チェックは行わず、前段のクライアント側ロジックに委ねる。
    // 必要になったらここでサーバー側の帯域制限などを実装する。
    return NextResponse.json({ allowed: true });
  } catch (error) {
    console.error('[upload/guard] error', error);
    return NextResponse.json(
      { allowed: false, reason: 'internal_error' },
      { status: 500 }
    );
  }
}


