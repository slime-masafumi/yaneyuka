'use client';
/**
 * OLMT 図面ボードの招待リンク（/olmt/?room=…）の受け口。
 *
 * 左カラムの画面は ?m=…&t=… のクエリで表していて、画面が切り替わるたびに作り直される。
 * そこへ room を混ぜると途中で落ちるので、ここで部屋の ID を受け取ってから
 * 図面ボードの画面へ送る（図面ボードは開いたときに受け取った ID の部屋に入る）。
 */
import { useEffect } from 'react';

export default function OlmtJoin() {
  useEffect(() => {
    const room = new URLSearchParams(window.location.search).get('room');
    try {
      if (room) sessionStorage.setItem('olmt-join', room);
    } catch {
      /* 保存できなければ、画面で招待リンクを貼ってもらう */
    }
    window.location.replace('/?m=general-tools&t=olmt');
  }, []);
  return <p style={{ padding: 24, fontSize: 13 }}>図面ボードを開いています…</p>;
}
