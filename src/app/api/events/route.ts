import { NextResponse } from 'next/server'

// イベント情報API: 日付と地域を正規化して返却
// 将来は外部RSS/サイトからサーバ側で収集予定

type EventItem = {
  id: string;
  title: string;
  description: string;
  dateText: string;
  startDate: string; // ISO形式 (YYYY-MM-DD) - ソート・フィルタ用
  endDate: string;   // ISO形式 (YYYY-MM-DD) - 終了日
  venue: string;
  region: 'tokyo' | 'nagoya' | 'osaka' | 'fukuoka' | 'chiba' | 'other'; // 地域を明示
  link: string;
  isLinkActive: boolean; // リンク切れチェック結果（将来のバッチ処理で更新予定）
}

export async function GET() {
  try {
    // TODO: 将来ここで複数ソースから取得し、キーワードでフィルタリング
    const items: EventItem[] = [
      {
        id: 'nikkei-architecture-materials-2026',
        title: '建築・建材展 2026（NIKKEI MESSE）',
        description: '建材・工法の総合展（NIKKEI MESSE 構成展）。',
        dateText: '2026年3月3日(火)～6日(金)',
        startDate: '2026-03-03',
        endDate: '2026-03-06',
        venue: '東京ビッグサイト 西',
        region: 'tokyo',
        link: 'https://messe.nikkei.co.jp/ac/',
        isLinkActive: true
      },
      {
        id: 'japan-shop-2026',
        title: 'JAPAN SHOP 2026（NIKKEI MESSE）',
        description: '商空間の資材・照明・什器等。建材・内装と親和。',
        dateText: '2026年3月3日(火)～6日(金)',
        startDate: '2026-03-03',
        endDate: '2026-03-06',
        venue: '東京ビッグサイト',
        region: 'tokyo',
        link: 'https://messe.nikkei.co.jp/js/',
        isLinkActive: true
      },
      {
        id: 'lighting-fair-2026',
        title: 'ライティング・フェア 2026（NIKKEI MESSE）',
        description: '照明の総合展（建築照明領域）。',
        dateText: '2026年3月3日(火)～6日(金)',
        startDate: '2026-03-03',
        endDate: '2026-03-06',
        venue: '東京ビッグサイト',
        region: 'tokyo',
        link: 'https://messe.nikkei.co.jp/lf/',
        isLinkActive: true
      },
      {
        id: 'building-maintenance-connect-2026',
        title: 'ビルメンCONNECT 2026（NIKKEI MESSE）',
        description: 'ビルメンテナンス・FM分野（設備保全/清掃など）。',
        dateText: '2026年3月3日(火)～6日(金)',
        startDate: '2026-03-03',
        endDate: '2026-03-06',
        venue: '東京ビッグサイト',
        region: 'tokyo',
        link: 'https://messe.nikkei.co.jp/bmc/',
        isLinkActive: true
      },
      {
        id: 'public-week-2026',
        title: '自治体・公共Week 2026（インフラメンテナンス展 など構成）',
        description: '公共施設・都市整備・インフラ維持の総合展群。',
        dateText: '2026年5月13日(水)～15日(金)',
        startDate: '2026-05-13',
        endDate: '2026-05-15',
        venue: '東京ビッグサイト 西',
        region: 'tokyo',
        link: 'https://www.publicweek.jp/',
        isLinkActive: true
      },
      {
        id: 'cspi-expo-2026',
        title: '第8回 建設・測量生産性向上展 (CSPI-EXPO 2026)',
        description: '建機・重機・アタッチメント・建設DXなど、建設・測量業界の最先端技術が集結する国内最大級の展示会。',
        dateText: '2026年6月17日(水)～20日(土)',
        startDate: '2026-06-17',
        endDate: '2026-06-20',
        venue: '幕張メッセ',
        region: 'chiba',
        link: 'https://cspi-expo.com/',
        isLinkActive: true
      },
      {
        id: 'kyushu-home-building-2026',
        title: '九州ホーム＆ビルディングショー 2026',
        description: '九州圏の住宅・建築・DX複合展。',
        dateText: '2026年6月24日(水)～25日(木)',
        startDate: '2026-06-24',
        endDate: '2026-06-25',
        venue: 'マリンメッセ福岡',
        region: 'fukuoka',
        link: 'https://www.kyushu-home.jp/',
        isLinkActive: true
      },
      {
        id: 'architecture-materials-osaka-2026',
        title: '建築・建材展 大阪 2026（NIKKEI MESSE）',
        description: 'NIKKEI MESSE の関西版。建材・住設・工法の総合展。',
        dateText: '2026年7月2日(木)～3日(金)',
        startDate: '2026-07-02',
        endDate: '2026-07-03',
        venue: 'インテックス大阪 4号館',
        region: 'osaka',
        link: 'https://messe.nikkei.co.jp/as/',
        isLinkActive: true
      },
      {
        id: 'maintenance-resilience-tokyo-2026',
        title: 'メンテナンス・レジリエンス TOKYO 2026',
        description: 'インフラ・プラント保全の大型複合展。',
        dateText: '2026年7月15日(水)～17日(金)',
        startDate: '2026-07-15',
        endDate: '2026-07-17',
        venue: '東京ビッグサイト 東',
        region: 'tokyo',
        link: 'https://mente.jma.or.jp/',
        isLinkActive: true
      },
      {
        id: 'japan-build-osaka-2026',
        title: 'JAPAN BUILD OSAKA 2026（大阪ショー）',
        description: '西日本版のJAPAN BUILD。',
        dateText: '2026年8月26日(水)～28日(金)',
        startDate: '2026-08-26',
        endDate: '2026-08-28',
        venue: 'インテックス大阪',
        region: 'osaka',
        link: 'https://www.japan-build.jp/osaka/ja-jp.html',
        isLinkActive: true
      },
      {
        id: 'hokkaido-construction-2026',
        title: '北海道 建設開発総合展 2026',
        description: '北海道の建設・インフラ大型展示群。',
        dateText: '2026年10月7日(水)～8日(木)',
        startDate: '2026-10-07',
        endDate: '2026-10-08',
        venue: 'アクセスサッポロ',
        region: 'other',
        link: 'https://www.jma.or.jp/toshiken/hkd/',
        isLinkActive: true
      },
      {
        id: 'kensetsu-gijutsu-kinki-2026',
        title: '建設技術展 2026 近畿',
        description: '近畿圏の建設新技術展示。',
        dateText: '2026年10月28日(水)～29日(木)',
        startDate: '2026-10-28',
        endDate: '2026-10-29',
        venue: 'インテックス大阪 6号館Cゾーン',
        region: 'osaka',
        link: 'https://www.kengi-kinki.jp/kengi2026/top.html',
        isLinkActive: true
      },
      {
        id: 'japan-home-building-show-2026',
        title: '第48回 Japan Home & Building Show 2026',
        description: '住宅・建築の老舗総合展（日本能率協会主催、国内最大級）。',
        dateText: '2026年11月18日(水)～20日(金)',
        startDate: '2026-11-18',
        endDate: '2026-11-20',
        venue: '東京ビッグサイト 西展示棟',
        region: 'tokyo',
        link: 'https://www.jma.or.jp/homeshow/tokyo/',
        isLinkActive: true
      },
      {
        id: 'japan-build-tokyo-2026',
        title: 'JAPAN BUILD TOKYO 2026（東京ショー）',
        description: '建築・建設の大型複合展（建設DX展／スマートビルディング／建物の脱炭素EXPO 等を内包）。',
        dateText: '2026年12月2日(水)～4日(金)',
        startDate: '2026-12-02',
        endDate: '2026-12-04',
        venue: '東京ビッグサイト',
        region: 'tokyo',
        link: 'https://www.japan-build.jp/tokyo/ja-jp.html',
        isLinkActive: true
      },
      {
        id: 'nikkei-architecture-materials-2027',
        title: '建築・建材展 2027（NIKKEI MESSE）',
        description: '建材・工法の総合展（NIKKEI MESSE 構成展）。',
        dateText: '2027年3月2日(火)～5日(金)',
        startDate: '2027-03-02',
        endDate: '2027-03-05',
        venue: '東京ビッグサイト 東展示棟',
        region: 'tokyo',
        link: 'https://messe.nikkei.co.jp/ac/',
        isLinkActive: true
      }
    ];

    // 日付順にソート（開催が近い順）
    items.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    return NextResponse.json({ items }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (e) {
    return NextResponse.json({ items: [] }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  }
}
