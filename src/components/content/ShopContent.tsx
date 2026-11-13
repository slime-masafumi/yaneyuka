'use client';

import React, { useState, useEffect } from 'react';
import { decorateAffiliateLink, fetchAmazonItemImage } from '@/lib/affiliate';
import { sanitizeEmbed } from '@/lib/sanitize';
import PageHead, { Stat } from '../ui/PageHead';
import { SecHead } from '../ui/Sheet';
import './connect-pages-2.css';

// 商品カテゴリーの型定義
interface ProductCategory {
  id: string;
  name: string;
  description: string;
  items: Product[];
}

// 商品の型定義
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  affiliateLink: string;
  brand: string;
  embedHtml?: string; // SiteStripe等の「テキスト+画像」HTMLを直接埋め込む場合
  rakutenLink?: string;
  rakutenImage?: string;
  rakutenImages?: string[]; // 複数の画像URLを配列で保存
  amazonLink?: string;
}

// 商品カテゴリーのデータ
const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    id: 'desk',
    name: 'デスク',
    description: '作業効率を高めるデスク周りアイテム',
    items: [
      {
        id: 'd8',
        name: 'Anker Nano Charging Station',
        description: 'ACコンセント3口とUSBポートを組み合わせた充電ステーション。内蔵のUSB-Cケーブル2本を含め、最大7台の機器を同時に充電できます。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4otxF3j',
        brand: 'Anker',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fpc-express%2F4571411227912%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fpc-express%2Fi%2F10763861%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/pc-express/cabinet/system/zejuoi9mwk/dn7b9jpdldqzqnp.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/4otxF3j'
      },
      {
        id: 'd9',
        name: 'RGBIC フロアライト LED スタンドライト',
        description: 'RGBIC技術により、1台で複数の色を同時に表現できるフロアライト。滑らかなグラデーション効果も可能で、1600万色から26種類のシーン設定を選べます。直接照明と間接照明の両方に対応し、作業環境に合わせた照明を実現します。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/3KeYCKe',
        brand: 'SwitchBot',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fswitchbot%2Frgbicww-floorlamp%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fswitchbot%2Fi%2F10000294%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/switchbot/cabinet/09377790/12081123/12081156/1.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/3KeYCKe'
      },
      {
        id: 'd10',
        name: 'MX MASTER4 アドバンスドワイヤレスマウス',
        description: '6年ぶりのフルモデルチェンジを迎えたMXシリーズの高機能マウス。超高速スクロールホイールや静音クリックに加え、触覚フィードバックやActions Ringなどの新機能を搭載。ハードウェアとソフトウェアの両面で進化を遂げています。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/48PrTEx',
        brand: 'Logicool',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Flogicool%2Fmx2400grda%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Flogicool%2Fi%2F10000777%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/logicool/cabinet/prd/mice/mx2400grda/mx2400grda_n.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/48PrTEx'
      },
      {
        id: 'd1',
        name: 'CIO 延長 電源タップ USB付 Polaris STICK Built in CORD REEL (ブラック) PD 65W',
        description: '最大7口のACコンセントに加え、分離可能なUSB充電器とUSB-Cケーブルリールを内蔵した延長タップ。PD/PPS対応で高速充電が可能で、L字レイアウトにより配線をすっきり整理できます。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4oj5V1c',
        brand: 'CIO',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fmachinoomise%2Fcio-psbc67w2c1a-ac7%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fmachinoomise%2Fi%2F10000788%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/machinoomise/cabinet/polaris/12474670/imgrc0097948125.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/4oj5V1c'
      },
      {
        id: 'd2',
        name: 'CIO フラットスパイラルケーブル (ライトブラック) CtoC 1m PD 240W',
        description: '磁石の力で自動的に渦巻き状にまとまるUSB-Cケーブル。使用時は引っ張って展開し、手を離すと自動で収納されます。PD240W対応の高速充電と480Mbpsのデータ転送に対応しています。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/44ycQMX',
        brand: 'CIO',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fcio-mate%2Fcio-nlsc-fl-cc%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fcio-mate%2Fi%2F10000016%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/cio-mate/cabinet/cable/flat-spiral/rakuten.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/44ycQMX'
      },
      {
        id: 'd3',
        name: 'CIO 柔らかいスパイラルシリコンケーブル HDMI to HDMI 2m 4K 60Hz',
        description: '磁石内蔵により自動的にスパイラル状にまとまるHDMIケーブル。柔らかいシリコン被膜で扱いやすく、絡まりにくい設計です。HDMI2.0規格に準拠し、4K60Hz（2K120Hz）の映像出力と18Gbpsの転送速度に対応しています。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/48AcMyA',
        brand: 'CIO',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fmachinoomise%2Fcio-slsc-hh2%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fmachinoomise%2Fi%2F10000789%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/machinoomise/cabinet/cable/12492427/imgrc0098033264.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/48AcMyA'
      },
      {
        id: 'd4',
        name: 'MAVEEK ケーブルクリップ 新型 マグネット クリップ',
        description: '磁石を利用した固定式のケーブルクリップ。パソコンやスマートフォンのケーブル、イヤホンなどをすっきりと整理できます。5色セットで軽量設計。冷蔵庫や黒板など、磁性のある場所にも取り付け可能です。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4olbtbN',
        brand: 'MAVEEK',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fmaveek%2Fmvo02114-k10c-bk-ss%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fmaveek%2Fi%2F10000238%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/maveek/cabinet/compass1705653872.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/4olbtbN'
      },
      {
        id: 'd5',
        name: 'HOTO 4WAY 小型エアクリーナー SE ハンディ掃除機 コードレス',
        description: '吸引、吹き付け、空気入れ、空気抜きの4つの機能を1台で実現するハンディクリーナー。12000Paの強力な吸引力と30m/秒の高速気流により、車内やPC、家電製品など幅広い用途に対応します。コンパクトサイズでType-C充電に対応しています。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4rjXTrL',
        brand: 'HOTO',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Frobotplaza%2Fhoe0018us-s%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Frobotplaza%2Fi%2F10001118%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/robotplaza/cabinet/hoto/hoe0018us-s.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/4rjXTrL'
      },
      {
        id: 'd6',
        name: 'ノートPC 拡張 スマホホルダースタンド マグネット',
        description: 'スイスのRolling Squareが開発したマグネット式のホルダースタンド。アルミニウム素材を使用し、デザイン性と耐久性を両立しています。ノートPCの横にスマートフォンを固定でき、デスク周りをすっきりと整理できます。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4p8WVwW',
        brand: 'Rolling Square',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fmobilereaderplus%2Fepc02r%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fmobilereaderplus%2Fi%2F10000327%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/mobilereaderplus/cabinet/11838077/11838084/top.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/4p8WVwW'
      },
      {
        id: 'd7',
        name: 'ScreenBar Halo 2 モニターライト',
        description: 'モニターに取り付けるタイプのデスクライト。前面の直接照明と背面の間接照明を組み合わせたデュアル照明で、画面の映り込みを抑えながら手元を明るく照らします。無線リモコンで操作でき、自動点灯・消灯機能も搭載しています。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4iD5rSs',
        brand: 'BenQ',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fbenq-directshop%2Flighting-screenbar-halo2%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fbenq-directshop%2Fi%2F10000495%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/benq-directshop/cabinet/07941759/12105532/02.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/4iD5rSs'
      },
      {
        id: 'd11',
        name: 'S3425DW-A 34インチ 曲面 モニター',
        description: 'TÜV Rheinland Eye Comfort認証で4つ星に認定された34インチWQHD曲面モニター。ComfortView Plusがブルーライトを35%以下に抑制し、色精度を保ちながら一日中快適に作業できます。sRGBカバー率99%、DCI-P3カバー率95%の鮮やかな色彩と、3000:1のコントラスト比、HDR対応で奥行きとディテールを実現。AMD FreeSync Premium（最大120Hz）でスムーズな表示、5Wスピーカー内蔵。USB-Cポート（最大65W給電）1本で接続可能で、クイックアクセスポートやHDMI、USB Type-Aポートも搭載したスマートなデザインです。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/3Y5wHzo',
        brand: 'Dell',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fbiccamera%2F4582724747417%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fbiccamera%2Fi%2F15154951%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/biccamera/cabinet/product/12954/00000014150154_a01.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/3Y5wHzo'
      },
      {
        id: 'd12',
        name: 'TourBox Elite 左手デバイス Bluetooth',
        description: 'macOSとWindowsに対応したBluetoothコントローラー。デュアルBluetooth 5.0により2台のデバイスに同時接続でき、パソコン間をシームレスに切り替えられます。11個のボタンとノブ、スクロール、ダイヤルを搭載し、単独または組み合わせで数百種類の機能をカスタマイズ可能。触覚フィードバックにより直感的な操作が可能で、ボタンは形状が異なるため手触りだけで区別でき、ノールック片手操作を実現。Photoshop、Lightroom、Premiere、Illustrator、DaVinci Resolve、FCPX、Clip Studio Paintなど多数のソフトウェアに対応。マクロ機能で1回のクリックで複数のコマンドを自動実行でき、TourMenuプラグインでワークフローを効率化できます。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4iKVvGp',
        brand: 'TourBox',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fjism%2F0860003996263-44-61444-n%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fjism%2Fi%2F14087367%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/jism/cabinet/0157/0860003996263.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/jism/cabinet/0157/0860003996263.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/jism/cabinet/s_1083/0860003996263a.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/4iKVvGp'
      },
      {
        id: 'd13',
        name: '11-in-1 USB-C ドッキングステーション',
        description: 'ノートパソコンスタンドと一体型の11-in-1ドッキングステーション。スタンド機能により場所を取らず、デスク周りをすっきりと整理できます。最大3画面出力に対応し、HDMI2.0ポート（4K・60Hz）、HDMI1.4ポート（4K・30Hz）、VGAポート（1080p）を搭載。従来の1Gbpsより高速な2.5Gbpsイーサネットポートにより、より速い速度でインターネット接続およびデータの転送が可能です。HDMI×2、VGA×1、USB-A×2、2.5Gbイーサネットポート、3.5mmオーディオポート（入出力）、USB-Cポート（PD85Wパススルー充電対応）、USB-Cポート（10Gbps転送可）、SD4.0、microSD3.0など、豊富なポートを搭載しています。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/48MqbEd',
        brand: 'Belkin',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fkitcut%2F522554%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fkitcut%2Fi%2F10133579%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/kitcut/cabinet/item/164/p-441349.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/kitcut/cabinet/item/164/p-441349.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/kitcut/cabinet/item/164/r-441334.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/kitcut/cabinet/item/164/r-441335.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/48MqbEd'
      },
      {
        id: 'd14',
        name: 'Keychron M7 ワイヤレス・ゲーミングオプティカルマウス',
        description: '63gの超軽量ボディに最高の機能を詰め込んだワイヤレスマウス。ワイヤレス2.4GHzおよびBluetooth 5.1接続に対応し、USBでの有線接続も可能。仕事、ゲーム、外出などあらゆるシーンで理想的なパフォーマンスを発揮し、生産性を最大限に高めます。最大26,000 DPI、最大650 IPS、比類のないグリップ精度を誇るPixArt 3395センサーを搭載。最先端の2.4GHz帯ワイヤレス接続により、ゲームやオフィスでの極めて低い遅延と素早いレスポンスを実現します。人間工学に基づいたデザインで、上部の顕著なカーブと側面のサムレストが特徴。手のひらの輪郭によりフィットし、長時間の使用でも快適なグリップを保証します。Keychron Engineソフトウェアを使えば、キーの変更、ショートカットの設定、RGBライトのエフェクトの設定、専用マクロの設定などのパーソナライズが可能です。LOD、ポーリングレート、DPIなどのプロフェッショナルな設定も行えます。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4pACgSy',
        brand: 'Keychron',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fkitcut%2F53026645851%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fkitcut%2Fi%2F10137062%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/kitcut/cabinet/item/171/p-457344.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/kitcut/cabinet/item/171/p-457344.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/kitcut/cabinet/item/171/p-457345.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/kitcut/cabinet/item/171/r-457346.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/4pACgSy'
      },
      {
        id: 'd15',
        name: 'Keychron K5 ワイヤレス・メカニカルキーボード',
        description: 'US104キーのフルサイズレイアウトのテンキー付きメカニカルキーボード。ロープロファイル・Gateronメカニカルスイッチを搭載し、フルサイズでミニマルなデザインで優れたタイピングエクスペリエンスを実現します。WindowsとMacの両OSに対応したキーキャップが付属しています。超薄型ボディ（18mm）と快適な抜群のクリック感を特徴とし、タイピングに必要な力が少なく、指の移動が少ないことにより、指の疲労が軽減され、比類のないタイピングの快適さが得られます。macOS、iOS、Windows、Androidにも対応し、本体横のボタンをスライドさせるだけで様々なシステムを簡単に切り替えることができ、Bluetooth経由で最大3台のデバイスに接続可能です。USBでの有線接続も可能です。104キーのフルサイズレイアウトのテンキー付きで、MacとWindowsの必須キーにアクセスしやすく、専用のスクリーンショットキー、Siri（Cortana）キーを搭載しています。耐久性が高く超薄型のロープロファイルGateronメカニカルスイッチは、5000万回のキーストローク寿命を持ち、比類のない応答性能を提供します。4つの調整可能なレベルと18種類以上の異なるカラーエフェクトを備えた明るく、輝かしいRGBバックライトを採用しています。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4iZz8gI',
        brand: 'Keychron',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fkitcut-ps%2F527833%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fkitcut-ps%2Fi%2F10136026%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/kitcut-ps/cabinet/item/163/p-300319.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/kitcut-ps/cabinet/item/163/p-300319.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/kitcut-ps/cabinet/item/163/r-300302.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/kitcut-ps/cabinet/item/163/r-300303.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/4iZz8gI'
      },
      {
        id: 'd16',
        name: 'Edifier M60 マルチメディアスピーカー 66W',
        description: '手作りの木製キャビネットに、1インチのシルクドームツイーターと3インチのロングスローストロークアルミミッドバスドライバーを搭載したマルチメディアスピーカー。Texas Instruments社製の高性能クローズドループDクラスアンプで駆動され、合計66W RMSの出力を発揮し、強力で鮮明な音を提供します。高性能アナログオーディオフロントエンド（ADC）とTexas Instruments社製のClass-Dデジタルアンプを備え、24-bit/96kHzをサポートし、完璧なアナログ/デジタル変換を確保。内蔵されたDSP（デジタル信号プロセッサ）は正確な22ウェイ・アクティブ・クロスオーバーを提供し、ダイナミックレンジ（DRC）を効果的に管理します。背面に取り付けられたUSB-CおよびAUX入力により、コンピューターやターンテーブルへの接続が簡単です。Bluetooth V5.3はLDACコーデックをサポートし、最大990 kbpsの転送速度を提供。Android 8.0以上を実行しているAndroidデバイスから、最大24ビット/96kHzの高解像度オーディオをストリーミングできます。上部に搭載されたタッチパネルは自動バックライト機能を備えており、手が近づくと自動的に点灯し、離れると自動的に消灯します。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4iSH3we',
        brand: 'Edifier',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fkitcut-ps%2F53621382321%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fkitcut-ps%2Fi%2F10141320%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/kitcut-ps/cabinet/item/171/p-322914.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/kitcut-ps/cabinet/item/171/p-322914.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/kitcut-ps/cabinet/item/171/p-322915.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/kitcut-ps/cabinet/item/171/r-322910.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/4iSH3we'
      },
      {
        id: 'd17',
        name: 'Flow Lite 84キーロープロファイルメカニカルキーボード',
        description: '手頃な価格のロープロファイルメカニカルキーボード。効率的なプロセスによりR&Dコストを削減して進化し、ボディ材料をアルミニウムから樹脂に変更して表面をテクスチャーにし、なめらかなタッチを実現。本製品は技適認証を取得済みで、電波法に基づく日本の安全基準検査に合格しています。より自然な手首の位置になるよう設計され、Flowタイプよりも前面の高さが低く、ロープロファイルのメカニカルキーは安定した精度と長時間の快適さを提供します。スペクターポムリニアキースイッチを採用し、操作力を50gfから40gfに下げて、長時間のタイピングの指の疲労を大幅に低減。PBT樹脂のダブルショットキーキャップを採用し、耐久性のあるテクスチャーの質感のタイピングと文字がシャープなままのキーキャップを実現。ツートンカラーのデザインで、文字部分はバックライト用にPC（ポリカーボネート）で作られ、残りはPBT樹脂のままで、最高のタイピングを保証します。柔らかいクッション性を実現したガスケットデザインにより、50gfと40gfのスイッチの両方に対応し、独自のタイピングスタイルに合わせて柔軟に調整可能。ガスケットマウントのサウンド減衰層をアップグレードし、キーストロークごとに豊かで満足のいく音色を実現しました。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/3XU5UGk',
        brand: 'LOFREE',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fbiccamera%2F4570001395987%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fbiccamera%2Fi%2F15005499%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/biccamera/cabinet/product/11202/00000013652056_a01.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/biccamera/cabinet/product/11202/00000013652056_a01.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/biccamera/cabinet/product/11202/00000013652056_a02.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/biccamera/cabinet/product/11202/00000013652056_a03.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/3XU5UGk'
      }
    ]
  },
  {
    id: 'furniture',
    name: '家具',
    description: 'ワークスタイルに合うオフィス家具・チェア・デスクを厳選',
    items: [
      {
        id: 'f5',
        name: '折りたたみテーブル【 正規品】 机 折り畳み デスク 完成品【組み立て不要】',
        description: '折りたたみ時はわずか6cmの薄さで収納できるコンパクトなデスク。耐荷重60kgで、パソコン作業や在宅ワーク、ゲーミングなど幅広い用途に対応します。組み立て不要で届いたその日から使用可能です。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/3Y4eUbT',
        brand: 'alawooder',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fkonanonline%2Fsnpr-0dplqk316%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fkonanonline%2Fi%2F10215737%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/konanonline/cabinet/root_sniper_folder/sniper_folder_00036/imgrc0312324766.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/3Y4eUbT'
      },
      {
        id: 'f6',
        name: 'スマートテーブル 冷蔵庫付き',
        description: '強化ガラストップを採用したスマートコーヒーテーブル。上部のフロントウェルカムLEDライトが均一な照明を提供し、内蔵冷蔵庫と充電ポートを装備しています。高効率コンプレッサー冷却システムにより、2つの冷蔵ストレージ引き出しで温度を個別に調整可能（左引き出し：34-46°F、右引き出し：43-54°F）。飲料水インターフェースを搭載し、ビール、コーラ、お茶、果物などを保管できます。リビングルームや寝室に適したデザインです。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/3Kl4EZT',
        brand: 'WJW',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fapiness%2Fb0dhjrxkfg-sprouor%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fapiness%2Fi%2F10104348%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/apiness/cabinet/12543496/12543504/imgrc0107605954.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/apiness/cabinet/12543496/12543504/imgrc0107605954.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/apiness/cabinet/12543496/12543504/imgrc0107605955.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/apiness/cabinet/12543496/12543504/imgrc0107605956.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/3Kl4EZT'
      },
      {
        id: 'f7',
        name: 'ビーライン ホビーワゴン3段4トレイ',
        description: 'キャスター付きの本体を回転させることで側面4面すべてを効率的に使えるデザイン性と機能性に優れた収納家具。180°回転するトレイやボトル類の保管に適した奥行きのあるポケットなど、機能性に富んだ収納スペースが随所に工夫されています。3段タイプはデスクサイドやキッチンでご使用いただくのに最適。一般的なデスクやテーブルとほぼ同じ高さ（735mm）なので、作業台としてもご使用いただけます。イタリア製で、ABS樹脂製の本体とポリプロピレン製のキャスターを採用。重量11kgで安定性があり、インナートレイ1点付属。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fshinwashop%2Fbobywagon-3-3%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fshinwashop%2Fi%2F10004111%2F',
        brand: 'B-LINE',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fshinwashop%2Fbobywagon-3-3%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fshinwashop%2Fi%2F10004111%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/shinwashop/cabinet/boby-newcolor33.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/shinwashop/cabinet/boby-newcolor33.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/shinwashop/cabinet/bli-bobywagon_2.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/shinwashop/cabinet/bli-bobywagon_3.jpg?_ex=300x300'
        ]
      },
      {
        id: 'f8',
        name: 'Uten.Silo RE II',
        description: 'キッチン、書斎、バスルーム、子供部屋、オフィスなど、幅広いシーンの整理整頓に役立つ多目的壁掛け収納。壁に取付けて使用することで、ご自宅やオフィスなど、物が溢れる場所を整理し、綺麗に保ちます。金属のフックや様々な形のポケットがあるので、日常的によく使う物を探しやすく、美しく収納することができます。また、収納する物によって印象が変わり、壁面を飾るオブジェのように変化します。ドイツ人デザイナー、Dorothee Becker（ドロシー・ベッカー）が1969年にデザインした「ウーテン シロ 2」をベースに、2025年に発売された「ウーテン シロ RE」は、堅牢なリサイクル素材でつくられています。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fshinwashop%2Fvitra-utensilo2%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fshinwashop%2Fi%2F10005047%2F',
        brand: 'vitra',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fshinwashop%2Fvitra-utensilo2%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fshinwashop%2Fi%2F10005047%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/shinwashop/cabinet/renew/vitra-utensilo2_01.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/shinwashop/cabinet/renew/vitra-utensilo2_01.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/shinwashop/cabinet/kes4/vitra-utensilo2_02.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/shinwashop/cabinet/kes4/vitra-utensilo1b_03.jpg?_ex=300x300'
        ]
      },
      {
        id: 'f9',
        name: 'ゲーミングチェア ファブリック',
        description: '座面、背中が当たる部分にダイア調に蝶の刺繍のデザインを採用したゲーミングチェア。座面にポケットコイルを入れ、通気性に優れたファブリック生地と柔らかい高弾性ウレタンのクッション素材を組み合わせた座り心地を実現。昇降幅10cmの高安全シリンダーと無段階リクライニング機能を搭載。芯材にはすべて一体成型非再生ウレタンを採用し、接着剤なしでホルムアルデヒドの心配もありません。座面のクッションの中に独立ポケットコイルを入れ、ソファのような座り心地をゲーミングチェアで実現。柔らかさと通気性に優れた独自開発のファブリック素材を採用し、キルティング技術により通気性を倍向上。長時間座っていてもムレがなく快適です。クラシックなダイア調に蝶の刺繍をイスに入れ、シンプルなデザインと落ち着いた色合わせで自宅のインテリアにも違和感なく溶け込みます。座った姿勢を整える際、ひじに負担をかけない連動型アームレストを設置。複雑な調整が不要で、背もたれの角度によってアームレストが自動的に変わります。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/3Kz2iGR',
        brand: 'GTRACING',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fgtplayershop%2Fgt901%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fgtplayershop%2Fi%2F10000001%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/gtplayershop/cabinet/supersale/gooda/gt-gt901.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/gtplayershop/cabinet/supersale/gooda/gt-gt901.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/gtplayershop/cabinet/09129534/10516392/gt901_1.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/gtplayershop/cabinet/10082523/jiangzhuang.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/3Kz2iGR'
      }
    ]
  },
  {
    id: 'accessories',
    name: '小物',
    description: '配線整理・デスク快適化のための小物',
    items: [
      {
        id: 'a9',
        name: '電源タップ USB付 Polaris CUBE Built in CABLE',
        description: 'ケーブルを本体に内蔵したコンパクトな電源タップ。側面の溝にケーブルを巻き取って収納でき、必要な長さだけ引き出して使用できます。スイングプラグにより、狭い場所や使いづらいコンセント位置にも対応。カフェやホテル、移動中の新幹線など、様々なシーンで活躍します。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4avyWn3',
        brand: 'CIO',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fmachinoomise%2Fcio-pcbc67w2c1a%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fmachinoomise%2Fi%2F10000727%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/machinoomise/cabinet/item/item02/imgrc0083753191.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/4avyWn3'
      },
      {
        id: 'a5',
        name: 'JOYROOM マグネット式ケーブルホルダー（6個セット）',
        description: 'マグネットクリップと台座を組み合わせて使用するケーブルホルダー。LightningやUSB-Cなど、複数のケーブルをすっきりと整理できます。デスク周りの配線を整頓し、作業環境を快適に保ちます。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4hVh5Yn',
        brand: 'JOYROOM',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fyotsubasyouten%2F20240926053727_24%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fyotsubasyouten%2Fi%2F10078214%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/yotsubasyouten/cabinet/r_2022092859/20240926053727_24_1.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/4hVh5Yn'
      },
      {
        id: 'a6',
        name: 'エレコム スマホ用AC充電器',
        description: 'コンパクトなキューブ型のAC充電器。Micro USBケーブル付きで、スマートフォンの充電に便利です。1.5mのケーブル長で、デスク周りでも使いやすい設計です。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/48ggH2q',
        brand: 'エレコム',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fauc-ulmax%2F4953103281332%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fauc-ulmax%2Fi%2F10668855%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/auc-ulmax/cabinet/all/all51.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/48ggH2q'
      },
      {
        id: 'a7',
        name: '【公式】 inCharge 6 充電ケーブル マルチUSBケーブル 6-in-1 超多機能 キーホルダー型',
        description: 'USB-C、Lightning、Micro USBに対応した多機能ケーブル。6通りの接続パターンを1本で実現し、様々なデバイスの充電やデータ転送に対応します。キーホルダー型で持ち運びも便利。出張や旅行の際に重宝する1本です。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/48m2wss',
        brand: 'Rolling Square',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fmobilereaderplus%2Fsix01r%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fmobilereaderplus%2Fi%2F10000322%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/mobilereaderplus/cabinet/11838077/11867928/top.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/48m2wss'
      },
      {
        id: 'a8',
        name: 'Plaud Note Pro AIボイスレコーダー',
        description: 'AI機能を活用したボイスレコーダー。通話と対面での録音を自動で切り替え、録音内容をAIで要約できます。ディスプレイを搭載し、112ヶ国語に対応。会議や打ち合わせの記録を効率的に管理できます。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/3McjrGM',
        brand: 'PLAUD',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fplaud%2F0199284926073%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fplaud%2Fi%2F10000013%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/plaud/cabinet/12090111/12542298/2.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/3McjrGM'
      },
      {
        id: 'a11',
        name: 'Smart Pouch Supported by KOKUYO',
        description: 'コクヨとの共同開発により、ガジェットから文具までスマートに収納できるコンパクトポーチ。複数のポケットと内部仕切りを活用し、USB充電器やケーブルなどを整理して収納できます。側面のボタンで固定することで開いた状態で自立し、デスクでの使用時にも便利。薄型設計のため、バッグやスーツケースにもコンパクトに収納できます。オフィスや学校など、様々なシーンで活躍します。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/3KNiaW7',
        brand: 'Anker',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fanker%2Fa70a1%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fanker%2Fi%2F10002161%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/anker/cabinet/images/anker_2/a70a1_normal.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/anker/cabinet/images/anker_2/a70a1_normal.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/anker/cabinet/images/anker_2/a70a1_2.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/anker/cabinet/images/anker_2/a70a1_3.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/3KNiaW7'
      },
      {
        id: 'a12',
        name: 'NovaPort DUO II 45W2C Built in CORD REEL',
        description: '約65cmのUSB-Cケーブルを内蔵した最大45W出力のコンパクト充電器。本体上部のボタンでUSB端子が飛び出すギミックを搭載し、コードリールタイプで必要な長さだけ使用できます。使用しない時は巻き取って本体内に収納でき、デスク上をすっきりと保てます。Nova Intelligenceにより接続デバイスに自動で最適な出力を調整し、GaNチップを採用したNovaEngineで変換効率を向上。NovaSafety2.0で温度を常時監視し、高負荷時や高温時に自動的に電力調整を行います。約52mm×56mm×31mm、約125gの小型軽量設計で、旅行や出張にも最適です。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4s0Fb95',
        brand: 'CIO',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fmachinoomise%2Fcio-g67w2c-n2%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fmachinoomise%2Fi%2F10000738%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/machinoomise/cabinet/item/cio-g67w2c-n2/imgrc0088975824.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/machinoomise/cabinet/item/cio-g67w2c-n2/imgrc0088975824.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/machinoomise/cabinet/item/cio-g67w2c-n2/imgrc0088680090.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/machinoomise/cabinet/item/cio-g67w2c-n2/imgrc0088680110.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/4s0Fb95'
      },
      {
        id: 'a13',
        name: '片引き巻取り式 USB Type-C to Cケーブル 90cm PD60W',
        description: '片引き巻取り式ケーブル「katamaki」のリニューアル版。前モデルよりコンパクトで、ケーブル長を75cmから90cmに延長。丸型デザインで手にフィットし、片引きタイプで両引きの弱点を克服。軽い力でスムーズに伸び、リールのカチカチ音も軽減され、電車やバス、オフィスなどの静かな場所でも使用可能です。巻取り試験5000回、屈曲試験15000回をクリアした高い耐久性を実現。USB PD60W充電とデータ転送に対応し、コネクター部分に温度センサー（PTC）を搭載して異常発熱を防止。1年保証付きで安心してご利用いただけます。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/48GYsmQ',
        brand: 'オウルテック',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fnovolstore%2Fwas6gdjdseisv34kp74cfg7g4i%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fnovolstore%2Fi%2F10287897%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/novolstore/cabinet/11934284/28331386_3.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/novolstore/cabinet/11934284/28331386_3.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/novolstore/cabinet/11934284/28331386_4.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/novolstore/cabinet/11934284/28331386_0.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/48GYsmQ'
      },
      {
        id: 'a14',
        name: 'モバイルバッテリー 100W ケーブル内蔵 大容量 20000mAh',
        description: '単ポート最大100W出力で、Apple MacBook Proやパナソニック Let\'s noteなどのハイエンドノートPCも充電可能なモバイルバッテリー。大容量20000mAhを搭載し、ノートPCを用いたミーティングを伴う出張など、充電環境に不安のあるビジネスシーンにおすすめです。本体蓄電時の入力電力も最大100Wに対応し、素早い蓄電が可能。CIO独自制御技術NovaIntelligenceを搭載し、3台までの複数同時充電時にデバイスに合わせて自動で電力を振り分け調整。合計95Wまでの高出力で、65W出力対応ノートPC+スマホの充電や、45W出力対応ノートPCを2台同時充電まで可能です。1%単位の充電残量や各USBポートの出力状況をリアルタイムで確認できるスクリーンを搭載し、重力センサーにより本体の向きに応じて表示の向きが変わります。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/3KJzBqC',
        brand: 'CIO',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fmachinoomise%2Fcio-mb100w2c1a-20k-c%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fmachinoomise%2Fi%2F10000780%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/machinoomise/cabinet/mb/cio-mb100w2c1a-20k-c/imgrc0094302526.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/machinoomise/cabinet/mb/cio-mb100w2c1a-20k-c/imgrc0094302526.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/machinoomise/cabinet/mb/12103232/imgrc0095883571.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/3KJzBqC'
      },
      {
        id: 'a15',
        name: 'PicoGo 超小型外付けSSD 512GB',
        description: 'わずか2.8g、飛び出し13.5mmの超小型外付けSSD。ノートPCやスマホに挿しっぱなしで持ち運べるポータブルSSDで、移動中でも邪魔にならず、常時ストレージ拡張が可能です。USB3.2 Gen1対応で最大読出450 MB/s・書込400 MB/sを実現。資料やレポート転送など大容量ファイルも短時間でコピーし、業務の待ち時間を削減します。iPhone 15/16 Proの4K30 ProRes収録に対応し、ケーブル不要のType-C直結で外部録画が可能。撮影後、そのままWindows/macOSに高速コピーしてモバイル編集を即スタートできます。Windows・macOS・iPadOS・Android・ChromeOS・PS5/Switchに対応し、ドライバレスで認識。スマホの写真整理、ノートPCの容量不足解消、動画視聴用メディアとして万能です。本体は軽量素材を使用しながら特別放熱デザインを設計し、連続書込でも安定動作を実現。国内サポートと12カ月メーカー保証付きで安心して長くお使いいただけます。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/3MzeS9C',
        brand: 'Monster Storage',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fbestlife-store%2Fms-picogo450%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fbestlife-store%2Fi%2F10000549%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/bestlife-store/cabinet/10047577/10047923/12082729/imgrc0171646333.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/bestlife-store/cabinet/10047577/10047923/12082729/imgrc0171646333.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/bestlife-store/cabinet/10047577/10047923/12082729/imgrc0171646338.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/bestlife-store/cabinet/10047577/10047923/12082729/imgrc0174606085.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/3MzeS9C'
      },
      {
        id: 'a3',
        name: 'NVMe SSD 外付けケース（10Gbps）',
        description: 'NVMe SSDを外付けストレージとして使用できるケース。10Gbpsの高速転送速度により、大容量データの持ち運びやバックアップを素早く行えます。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://www.amazon.co.jp/s?k=NVMe+SSD+%E3%82%B1%E3%83%BC%E3%82%B9+10Gbps',
        brand: '各社'
      }
    ]
  },
  {
    id: 'tools',
    name: '工具',
    description: '現場/検査/採寸に使えるツール',
    items: [
      {
        id: 't3',
        name: 'レーザ墨出器 LA-502DG',
        description: '矩十字とジンバル機構を組み合わせたレーザー墨出し器。ダイレクトグリーンレーザダイオードを採用し、低高温環境でも安定した性能を発揮します。目に優しいグリーンレーザで、明るさは3段階から選択可能。固定モードでは斜め方向への照射も可能です。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/44FVw8L',
        brand: 'MAX',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fedougukan%2Fla502dgdt%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fedougukan%2Fi%2F10014096%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/edougukan/cabinet/klm/la502dg_k1.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/44FVw8L'
      },
      {
        id: 't5',
        name: '充電式インパクトドライバ',
        description: '全周リング発光LEDライトを搭載した充電式インパクトドライバ。作業時の視認性を大幅に向上させ、暗所での作業も快適に行えます。照度は3段階（強/中/弱）で切り替え可能。ライトモードでは簡易照明としても使用でき、約1時間の点灯が可能です。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4phTGDz',
        brand: 'makita',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fselect-tools-3377%2Ftd173-1%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fselect-tools-3377%2Fi%2F10000048%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/select-tools-3377/cabinet/makita/makita02/main/imgrc0082760325.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/4phTGDz'
      },
      {
        id: 't6',
        name: 'コンクリート探知機 D-TECT200JPS',
        description: '第4世代のコンクリート探知機。カラーディスプレイで探知結果や材質を分かりやすく表示します。探知画像を保存してPCへ転送できるため、記録や報告書作成に便利です。金属、配管、配線、鉄筋、木材、空洞など、様々な対象物の探知に対応しています。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4pcxQBb',
        brand: 'BOSCH',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fprotoolshop%2F4059952552873%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fprotoolshop%2Fi%2F10070329%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/protoolshop/cabinet/873/4059952552873.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/4pcxQBb'
      },
      {
        id: 't7',
        name: 'E01 サーモグラフィーカメラ 240x240 SuperIR',
        description: '240x240解像度の手持ち型サーモグラフィーカメラ。20Hzのフレームレートでリアルタイムに温度分布を確認できます。バッテリー寿命は約11時間。測定温度範囲は-20°Cから400°Cまで対応し、建築や設備検査に適しています。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/3MiyRZV',
        brand: 'HIKMICRO',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fokaidokuhonpookayama%2Fsnpr-0cf28bnnx%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fokaidokuhonpookayama%2Fi%2F10006085%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/okaidokuhonpookayama/cabinet/root_sniper_folder/sniper_folder_00023/imgrc0086559085.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/3MiyRZV'
      },
      {
        id: 'e3',
        name: 'LED ヘッドライト USB充電式',
        description: 'USB充電に対応したLEDヘッドライト。明るさは550～1500ルーメンで調整可能で、実用点灯時間は7～15時間。後部に認識灯を搭載し、安全性も確保されています。専用充電池または単3形電池4本で使用できます。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/3Ku5cfK',
        brand: 'GENTOS',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fsouplesse%2Fsouplesse-01736%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fsouplesse%2Fi%2F10002098%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/souplesse/cabinet/12049061/imgrc0116812135.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/3Ku5cfK'
      },
      {
        id: 't8',
        name: 'デジタルノギス 100mm',
        description: '測定範囲0.1-100mm、精度0.1mmの高精度デジタルノギス。深さ・段差・内径・外径の測定に対応し、mm/inの単位換算機能を搭載。カーボンファイバー素材で寸法安定性と耐磨耗性に優れ、スライド操作で自動起動する使いやすい設計です。電池カバーはネジ固定で安全性が高く、オートパワーオフ機能で省エネにも配慮。コンパクトサイズで携帯に便利な現場測定ツールです。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4pZeNKE',
        brand: 'SCITOOLS',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fgiftmarkets%2F20231030172802_62%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fgiftmarkets%2Fi%2F10026111%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/giftmarkets/cabinet/r_2023051234/20231030172802_62_1.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/giftmarkets/cabinet/r_2023051234/20231030172802_62_1.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/giftmarkets/cabinet/r_2023051234/20231030172802_62_2.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/giftmarkets/cabinet/r_2023051234/20231030172802_62_3.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/4pZeNKE'
      },
    ]
  },
  {
    id: 'stationery',
    name: '文具',
    description: '設計・製図に役立つ文具・文房具',
    items: [
      {
        id: 'st1',
        name: 'iFLYTEK AINOTE Air 2 電子ノート',
        description: 'AI機能を活用した音声入力や多言語対応が可能な、軽量設計の8.2インチ電子ノート。会議や打ち合わせの記録に便利です。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/48xybHy',
        brand: 'iFLYTEK',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fsuperdeal%2F15387ainoteair22505%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fsuperdeal%2Fi%2F10006129%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/superdeal/cabinet/09061004/11661997/12053655/4571558200144-2.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/superdeal/cabinet/09061004/11661997/12053655/4571558200144-2.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/superdeal/cabinet/09061004/11661997/12053655/imgrc0332137765.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/superdeal/cabinet/09061004/11661997/12053655/4571558200144-3.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/48xybHy'
      },
      {
        id: 'st7',
        name: '多色ボールペン フリクションボール3ウッド',
        description: 'ウッド素材のグリップで手になじみやすく、消せる3色ボールペン。デスクワークに適したデザインです。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4aoCGXt',
        brand: 'PILOT',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fbiccamera%2F4902505447600%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fbiccamera%2Fi%2F10511532%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/biccamera/cabinet/product/1057/00000001979543_a01.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/4aoCGXt'
      },
      {
        id: 'st8',
        name: 'シャーペン クルトガ ダイブ0.5mm',
        description: 'キャップを開閉するだけで芯が自動回転する機構を搭載。常に尖った状態で書けるシャープペンシルです。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4p01DwS',
        brand: '三菱鉛筆',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fblacklabelstore%2Fblec603d4170%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fblacklabelstore%2Fi%2F10017147%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/blacklabelstore/cabinet/onesell037/blec603d4170.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/4p01DwS'
      },
      {
        id: 'st9',
        name: '水性ボールペンVコーン（0.5mm）',
        description: 'インクが最後まで残る構造で、かすれにくく滑らかな書き味が特徴の直液式ボールペン。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/48gEVuL',
        brand: 'PILOT',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fe-stationery%2Fs_pilot_420%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fe-stationery%2Fi%2F10006915%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/e-stationery/cabinet/400x300x01/s_pilot_420_s1.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/48gEVuL'
      },
      {
        id: 'a10',
        name: 'マグネット アレンジマグポケット',
        description: 'スチール面にマグネットで貼り付けられる収納ポケット。デスクの側面やキャビネットなど、スチール面があればどこでも設置でき、省スペースで小物を整理できます。幅342mm×奥行73mm×高さ157mmのLサイズで、文房具や書類、スマートフォンなど様々なアイテムを収納可能。ハイインパクトポリスチレン製で軽量ながら耐久性も備えています。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4rwMpBb',
        brand: 'リヒトラブ',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fbiccamera%2F4903419870317%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fbiccamera%2Fi%2F13671975%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/biccamera/cabinet/product/6837/00000009816701_a02.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/4rwMpBb'
      },
      {
        id: 'st10',
        name: '三角スケール JIS 15cm',
        description: 'JIS規格準拠の15cm三角スケール。土地家屋調査士試験にも対応したA-15タイプで、シルバーカラーのスタイリッシュなデザイン。17cm×1.6cm×2.1cmのコンパクトサイズで持ち運びやすく、図面作成や寸法測定に便利です。高評価の実績があり、設計業務に欠かせない定番アイテムです。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/3KJrWsf',
        brand: 'シンワ測定',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fakibaoo-r%2Fhm000085056%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fakibaoo-r%2Fi%2F10100893%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/akibaoo-r/cabinet/gi170/4960910749696.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/akibaoo-r/cabinet/gi170/4960910749696.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/3KJrWsf'
      },
      {
        id: 'st11',
        name: 'ペンケース デテクール',
        description: '斜めに傾く快適ギミック搭載の使いやすいペンケース。開いたフタは背面に磁石で固定可能で、テレワークや家庭学習にも最適です。サイズは幅65×高さ195×奥行95mm。本体表地はポリエステル、本体裏地はナイロンを使用。シンプルカラーで男女問わず使えるラインナップで、ブラック/グレー/ネイビー/グリーン/バイオレットの5色展開です。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4oUln4f',
        brand: 'レイメイ藤井',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fbiccamera%2F4902562486192%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fbiccamera%2Fi%2F13505583%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/biccamera/cabinet/product/6436/00000009129054_a01.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/biccamera/cabinet/product/6436/00000009129054_a01.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/biccamera/cabinet/product/6436/00000009129054_a02.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/biccamera/cabinet/product/6436/00000009129053_a01.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/4oUln4f'
      },
      {
        id: 'st5',
        name: 'ゼブラ サラサナノ 0.3（ブラック）',
        description: '0.3mmの極細芯でもかすれにくい書き味が特徴。設計図への細かい書き込み作業に適しています。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/3MDv1La',
        brand: 'ゼブラ',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fbiccamera%2F4901681188567%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fbiccamera%2Fi%2F13892737%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/biccamera/cabinet/product/7678/00000010740697_a01.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/biccamera/cabinet/product/7678/00000010740697_a01.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/biccamera/cabinet/product/7678/00000010740697_a02.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/biccamera/cabinet/product/7678/00000010740697_a03.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/3MDv1La'
      },
      {
        id: 'st12',
        name: 'ビジュアルバータイマー',
        description: '液晶デジタル表示のタイマー。カウントダウン・カウントアップ機能に加え、作業時間と休憩時間を設定できるリピート計測機能を搭載。最大99分50秒まで計測可能で、アラーム機能により作業時間の管理が容易です。単4形アルカリ乾電池2本で約2年間使用可能。コンパクトサイズ（約132×21×29mm、約56g）でデスク周りをすっきりと保てます。設計・製図作業の時間管理やポモドーロテクニックの実践に便利です。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/3YrPEMV',
        brand: 'Kingjim',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fbiccamera%2F4971660783090%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fbiccamera%2Fi%2F15019018%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/biccamera/cabinet/product/11291/00000013706130_a02.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/biccamera/cabinet/product/11291/00000013706130_a02.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/biccamera/cabinet/product/11291/00000013706130_a03.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/3YrPEMV'
      },
      {
        id: 'st13',
        name: '2Way チタン刃 AMハサ-T420D',
        description: 'チタン刃を採用したハサミ。長期間使用しても切れ味が持続し、硬い素材もスムーズにカットできます。ブラックデザインでデスク周りに馴染み、手に馴染む形状で長時間の使用でも疲れにくい設計です。ハコアケ機能により段ボールやパッケージの開封作業が簡単に行えます。Amazon限定モデルで、設計・製図作業や事務作業に便利なアイテムです。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/3MZXMBN',
        brand: 'コクヨ',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fonly-one-store%2F999974265743ab%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fonly-one-store%2Fi%2F10001373%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/only-one-store/cabinet/imgrc0112609546.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/only-one-store/cabinet/imgrc0112609546.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/only-one-store/cabinet/onesell041/999974265743ab_1.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/3MZXMBN'
      },
      {
        id: 'st14',
        name: 'コンパクトホッチキス XS',
        description: 'コンパクトサイズのホッチキス。コピー用紙約10枚を綴じる機能を持ちながら、小さくたためてペンケースにも収まる携帯性が特徴です。間違えて綴じてしまった時に便利なリムーバーも付属しています。本体サイズはH21×W66×D14.5mmとコンパクトで、外出先での書類整理や設計・製図作業の現場でも重宝します。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4iT6PQS',
        brand: 'MIDORI',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fcocodecow%2Fr763gm%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fcocodecow%2Fi%2F10770706%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/cocodecow/cabinet/j76/j570sd.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/cocodecow/cabinet/j76/j570sd.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/cocodecow/cabinet/j76/j570sda.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/cocodecow/cabinet/j76/j570sdb.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/4iT6PQS'
      },
      {
        id: 'st15',
        name: '商品名',
        description: '商品説明をここに記載してください。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4jfbZqO',
        brand: 'ブランド名',
        amazonLink: 'https://amzn.to/4jfbZqO'
      }
    ]
  },
  {
    id: 'etc',
    name: 'その他',
    description: '建築・建設に関係する安全/保護/現場用品',
    items: [
      {
        id: 'e8',
        name: '日塗工 2024年 P版 塗料用標準色 ポケット版',
        description: '1954年初版から続く塗料業界の標準色票で、今回のP版で36版目となります。2024年P版では新色13色を含む600色を掲載。色票番号だけで正確な色伝達が可能で、塗料業界では欠かせないツールとして定着しています。マンセル色系（色相、明度、彩度）に対応しており、色票番号から実際の色をイメージできます。ミシン目入りワイド版は色票片に切り取って使用でき、色指定に便利です。JIS Z 8102物体色の色名に準拠したトーン分類を採用。全色、鉛・クロムフリー塗料を使用し、退色や色の変化がほとんどありません。カラーユニバーサルデザイン「CUD推奨配色セット」を収録。比色マスク付きで、色を比べる際に差が分かりやすくなっています。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/3Mtk9iX',
        brand: '日本塗料工業会(Jpma)',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fpaint%2Fntk_color_p_01%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fpaint%2Fi%2F10012213%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/paint/cabinet/color/ntk_color_p_01.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/paint/cabinet/color/ntk_color_p_01.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/paint/cabinet/color/imgrc0092500818.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/paint/cabinet/00418543/imgrc0094999969.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/3Mtk9iX'
      },
      {
        id: 'e4',
        name: 'スマートプラグ スマートコンセント スイッチボット',
        description: 'コンセントに直接差し込んで使用するスマートプラグ。消費電力のモニタリングやタイマー機能により、節電・省エネをサポートします。BluetoothとWi-Fiの両方に対応し、スマートフォンからの遠隔操作や音声コントロールが可能です。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4ry4dvV',
        brand: 'SwitchBot',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fswitchbot%2F10000043%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fswitchbot%2Fi%2F10000043%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/switchbot/cabinet/09377790/09563522/plugmini.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/4ry4dvV'
      },
      {
        id: 'e5',
        name: 'Eizer【ミニベロ】超軽量アルミフレーム',
        description: '超軽量アルミフレームを採用した20インチのミニベロ。Wディスクブレーキを装備し、本格的な小径車としての性能を持ちながら、エントリーモデルとして手頃な価格で提供されています。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/44qPLvV',
        brand: 'Eizer',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fisshoudou%2Fyj-eiz-bz501-24%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fisshoudou%2Fi%2F10008907%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/isshoudou/cabinet/id/yz-eiz-bz501-24/bz501-24_n1.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/44qPLvV'
      },
      {
        id: 'e6',
        name: '自転車 ミニベロ 小径車 cyma Michikusa 20インチ',
        description: '20インチのミニベロ。通勤から休日の散策まで、日常の様々なシーンで楽しめる小径車です。コンパクトなサイズで扱いやすく、街乗りに適した設計となっています。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/3MzO1Kn',
        brand: 'cyma',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fcyma-outlet%2Fatm007%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fcyma-outlet%2Fi%2F10000018%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/cyma-outlet/cabinet/06715075/06715082/06736146/cy-391_02.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/3MzO1Kn'
      },
      {
        id: 'e7',
        name: 'ANIMATO ミニベロ BLANCA 20インチ シマノ7段変速',
        description: '20インチのミニベロ。シマノ製7段変速を搭載し、様々な路面状況に対応できます。コンパクトなサイズで重量は約12kg。都市部での移動や通勤に適した設計です。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/48HkG9z',
        brand: 'Animato',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fanimatobike%2Fblanca%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fanimatobike%2Fi%2F10000123%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/animatobike/cabinet/bike/blanca_r_mb.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/48HkG9z'
      },
      {
        id: 'e9',
        name: 'LOGOS BY LIPNERリカバリープルオーバー',
        description: '着るだけで疲労を軽減するリカバリーウェア。一般医療機器区分「家庭用遠赤外線血行促進用衣」に分類され、着用することで血行促進、筋肉の疲労緩和、筋肉のハリ・コリをほぐす効果が期待できます。特殊繊維「リゲインテック」が身体の内部から放出される遠赤外線（体温）を輻射することにより、全身の血流を促進し、体の疲労やコリを軽減。繊維自体が機能性を発揮するため、洗濯を繰り返しても効果が持続します。吸湿速乾性の高い素材を採用しており、さらっとした快適な着心地。お家でのリラックスタイムや就寝時、運動後、深夜バスや飛行機などの長距離移動の際にもおすすめです。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4aGyG4O',
        brand: 'LOGOS',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fa-price%2F4981325604752%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fa-price%2Fi%2F11341903%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/a-price/cabinet/pics/1089/4981325604752.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/a-price/cabinet/pics/1089/4981325604752.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/a-price/cabinet/pics/1089/3-4981325604752.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/a-price/cabinet/pics/1089/2-4981325604752.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/4aGyG4O'
      },
      {
        id: 'e10',
        name: 'LOGOS BY LIPNERリカバリーパンツ',
        description: '着るだけで疲労を軽減するリカバリーウェア。一般医療機器区分「家庭用遠赤外線血行促進用衣」に分類され、着用することで血行促進、筋肉の疲労緩和、筋肉のハリ・コリをほぐす効果が期待できます。特殊繊維「リゲインテック」が身体の内部から放出される遠赤外線（体温）を輻射することにより、全身の血流を促進し、体の疲労やコリを軽減。繊維自体が機能性を発揮するため、洗濯を繰り返しても効果が持続します。吸湿速乾性の高い素材を採用しており、さらっとした快適な着心地。お家でのリラックスタイムや就寝時、運動後、深夜バスや飛行機などの長距離移動の際にもおすすめです。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4qk74Y3',
        brand: 'LOGOS',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fa-price%2F4981325604684%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fa-price%2Fi%2F11341898%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/a-price/cabinet/pics/1089/4981325604684.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/a-price/cabinet/pics/1089/4981325604684.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/a-price/cabinet/pics/1089/3-4981325604684.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/a-price/cabinet/pics/1089/2-4981325604684.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/4qk74Y3'
      },
      {
        id: 'e11',
        name: 'オープンイヤー型 完全ワイヤレス nwm DOTS',
        description: 'NTTの技術をダブル搭載した完全ワイヤレスイヤホン。音漏れを抑えるPSZ技術と、あなたの声だけを届けるMagic Focus Voiceを搭載。オープンイヤーでありながら、完全新規設計のドライバーによる高音質かつパワフルなオーディオ体験を実現。片耳約8gと軽量なため、長時間のオンライン会議も快適です。充電ケースを利用すると最大32時間の再生が可能で、長距離移動や旅行にも最適。本体のみ利用の場合は連続8時間再生可能です。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/48TIxSn',
        brand: 'nwm',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fa-price%2F4595640827231%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fa-price%2Fi%2F11285249%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/a-price/cabinet/pics/954/4595640827231.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/a-price/cabinet/pics/954/4595640827231.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/a-price/cabinet/pics/954/2-4595640827231.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/a-price/cabinet/pics/954/3-4595640827231.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/48TIxSn'
      },
      {
        id: 'e12',
        name: 'ルルドガン クアトロ AX-HX436bk',
        description: 'アテックス初のダブルシャフト搭載のボディケア用品。アテックス史上初、2軸（ダブルシャフト）が交互に動き筋肉を刺激します。選べる2種類の振動モードを搭載し、すきま時間は「ノーマルモード」、じっくりケアしたい時は「パンチングモード」がおすすめです。3種類の形状が異なるアタッチメントを付属し、肩・ふくらはぎ・足裏等、ケアする箇所に応じた使い分けができます。ダブルシャフトとクアトロアタッチメントの組み合わせで、広い面を一気にケア。大きな筋肉にも、しっかり刺激を与えます。本体上部のダイヤルを回して、5段階の速度調節が可能。また、本体底面のボタンを押すことで、「ノーマルモード」「パンチングモード」の切り替えもできます。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/44V2pDq',
        brand: 'ATEX',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fhappynight%2Fgr-e9g02g68iv%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fhappynight%2Fi%2F10306204%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/happynight/cabinet/g/69/e9g02g68iv-2.jpg?_ex=300x300',
        amazonLink: 'https://amzn.to/44V2pDq'
      },
      {
        id: 'e13',
        name: 'スマートリモコン ハブ2',
        description: '高性能の4-in-1スマートリモコン。あらゆる家電のリモコンを1つに集約してスマホで操作できるスマートリモコンだけではなく、温湿度計、スマートボタン、スマートハブなど便利な機能を多数搭載しています。Works with Alexa認定を受けたAmazon Alexa対応端末です。圧倒的な赤外線コードデータベース所有量が誇りで、対応可能なメーカー数4877社、対応可能なリモコンの種類21363種、対応可能な製品型番83934個。新デバイスも旧式家電も簡単にスマートに。自社開発のスマートラーニング方式で、ワンタッチで家電を登録できます。付属のケーブルには温度センサーと湿度センサーが搭載され、お部屋の温湿度がより精確に分かります。光センサーも搭載されているため、室内照明調整アイテムと併用すれば、室内の光度や日照量を自動で調節します。テレビ・エアコン・照明など赤外線の家電製品をSwitchBot Hub2一つで集約し、おうちでも外出先でもスマホで家電を一括にコントロール。Amazonアレクサ、Googleアシスタント、Siriショートカットなどのスマートスピーカーと連携すれば、話しかけるだけで家電を操作できます。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4rNyxCK',
        brand: 'SwitchBot',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fswitchbot%2F10000076%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fswitchbot%2Fi%2F10000076%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/switchbot/cabinet/09377790/09563522/imgrc0078660079.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/switchbot/cabinet/09377790/09563522/imgrc0078660079.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/switchbot/cabinet/09377790/09563522/imgrc0077395968.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/switchbot/cabinet/09377790/09639139/09639140/imgrc0077368251.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/4rNyxCK'
      },
      {
        id: 'e14',
        name: 'エーストーキョー パリセイド3Z フロントポケット',
        description: '静音性に優れた双輪キャスターを備え、走行性とデザインのベストバランスを実現したファスナータイプのスーツケース。移動中でも開閉ができ、ちょっとした荷物の出し入れに便利なフロントポケットを搭載。背面のレバー操作で簡単に車輪を固定できるキャスターストッパーを搭載し、揺れる電車の中など、不意な走行を防ぎます。TSダイヤルロック（Travel Sentry認可ロック）搭載で、施錠したまま預け入れ可能。カギの持ち歩きが不要な3桁のダイヤル式で、セキュリティと利便性を両立しています。',
        price: 0,
        imageUrl: '/image/shop/placeholder_480x384.png',
        affiliateLink: 'https://amzn.to/4rQPa0l',
        brand: 'ACE',
        rakutenLink: '//af.moshimo.com/af/c/click?a_id=5277132&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Face-store%2F06912%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Face-store%2Fi%2F10007226%2F',
        rakutenImage: '//thumbnail.image.rakuten.co.jp/@0_mall/ace-store/cabinet/item2023/acetokyo/06912-23aw.jpg?_ex=300x300',
        rakutenImages: [
          '//thumbnail.image.rakuten.co.jp/@0_mall/ace-store/cabinet/item2023/acetokyo/06912-23aw.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/ace-store/cabinet/itemimg/ace5/06912_1.jpg?_ex=300x300',
          '//thumbnail.image.rakuten.co.jp/@0_mall/ace-store/cabinet/biiino/award/06912.jpg?_ex=300x300'
        ],
        amazonLink: 'https://amzn.to/4rQPa0l'
      }
    ]
  }
];

// デジタルデバイス選定ガイドの見出し（右列の目次と、本文の h5 の id に使う）
const GUIDE_TOC = [
  'モバイルバッテリー',
  'USB充電器（ACアダプタ）',
  '充電ケーブル',
  '高負荷PCの電源運用',
  '電源タップ',
  '外付けGPU（eGPU）',
  '映像ケーブル（HDMI）',
  '外付けストレージ',
];

// 楽天の画像とリンクで出す商品（従来の条件をそのまま）
const RAKUTEN_IMAGE_IDS = new Set([
  'st1', 'st5', 'st7', 'st8', 'st9', 'st10', 'st11', 'st12', 'st13', 'st14',
  'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10', 'd11', 'd12', 'd13', 'd14', 'd15', 'd16', 'd17',
  'f5', 'f6', 'f7', 'f8', 'f9',
  'a5', 'a6', 'a7', 'a8', 'a9', 'a10', 'a11', 'a12', 'a13', 'a14', 'a15',
  'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9', 'e10', 'e11', 'e12', 'e13', 'e14',
  't3', 't5', 't6', 't7', 't8',
]);

/** 【保存版】建築・設計業務におけるデジタルデバイス選定ガイドライン（本文は従来のまま、組み方だけ本の体裁に） */
function DeviceGuide({ onClose }: { onClose: () => void }) {
  return (
    <section id="shop-guide" className="yy-sh-guide">
      <SecHead
        no="—"
        title="デジタルデバイス選定ガイド"
        right={<button type="button" className="yy-linkbtn" onClick={onClose}>閉じる</button>}
      />
      <div className="yy-sh-guidebody">
          <h3 className="yy-sh-gtitle">【保存版】建築・設計業務におけるデジタルデバイス選定ガイドライン</h3>
          <p className="yy-sh-gsub"><strong>〜仕様数値（スペック）に基づく適正機材の選定基準〜</strong></p>
          
          <p>
            感覚的な判断やデザインのみで機材を選定した場合、現場における電力不足、描画遅延、データ転送の遅滞など、業務効率を著しく低下させるトラブルが発生し得る。
          </p>
          <p>
            本稿では、CAD/BIM/レンダリング等の高負荷業務に耐えうるデジタルデバイス選定において、遵守すべき<strong>「数値的基準」</strong>について解説する。
          </p>
          
          <h4>1. 電源・給電仕様：電圧（V）・電流（A）・電力（W）の整合性</h4>
          
          <h5 id="shop-guide-1">① モバイルバッテリー：容量（mAh）と実用性の相関</h5>
          <p>
            単に大容量であれば良いわけではなく、携帯性と用途のバランスを考慮し選定する必要がある。
          </p>
          
          <div className="yy-sh-tblwrap">
            <table className="yy-tbl">
              <thead>
                <tr>
                  <th>容量クラス</th>
                  <th>実効充電回数（目安）</th>
                  <th>推奨用途</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>5,000mAh</strong></td>
                  <td>スマートフォン 約1回</td>
                  <td><strong>【緊急予備】</strong> 最軽量クラス。緊急時の連絡手段確保用。</td>
                </tr>
                <tr>
                  <td><strong>10,000mAh</strong></td>
                  <td>スマートフォン 約2.5回</td>
                  <td><strong>【標準運用】</strong> 終日の現場巡回・連絡業務における最適解。</td>
                </tr>
                <tr>
                  <td><strong>20,000mAh〜</strong></td>
                  <td>PC 約0.8回 / スマホ 約5回</td>
                  <td><strong>【PC給電・BCP対策】</strong> ノートPCへの給電や災害時の電源確保用。</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <h5 id="shop-guide-2">② USB充電器（ACアダプタ）：多ポート接続時の電力配分仕様</h5>
          <p>
            「最大〇〇W」の表記は単ポート出力時の最大値であり、複数ポート使用時は<strong>総電力が分散</strong>される点に留意されたい。
          </p>
          
          <div className="yy-sh-tblwrap">
            <table className="yy-tbl">
              <thead>
                <tr>
                  <th>出力クラス</th>
                  <th>適合デバイス</th>
                  <th>選定基準</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>20W 〜 30W</strong></td>
                  <td>スマホ・タブレット</td>
                  <td>急速充電（PD）に必要な最低ライン。</td>
                </tr>
                <tr>
                  <td><strong>65W</strong></td>
                  <td>一般ノートPC ＋ スマホ</td>
                  <td>モバイルノートPCの標準的な出力要件。</td>
                </tr>
                <tr>
                  <td><strong>100W</strong></td>
                  <td>ハイスペックPC</td>
                  <td><strong>建築・設計業務推奨。</strong> 複数接続時もPCへの高出力を維持可能。</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="yy-sh-note">
            <p><strong>【注意】電力分散による供給不足</strong></p>
            <p>
              例：最大65Wの充電器にてPCとスマートフォンを同時充電した場合<br />
              → PCへの出力が<strong>45Wに制限</strong>され、残りの20Wがスマートフォンへ配分される仕様が一般的である。<br />
              → 結果として、PC側の充電速度低下や低電圧警告が発生する要因となる。
            </p>
          </div>
          
          <h5 id="shop-guide-3">③ 充電ケーブル：電流定格「5A」の要件</h5>
          <p>
            ケーブルには通電可能な電流上限が存在する。ここがボトルネックとなり、充電器の性能が生かされない事例が散見される。
          </p>
          <ul>
            <li><span>・</span><strong>60Wケーブル（3A定格）</strong>: 一般的な付属品。100W充電器に接続しても<strong>最大60W</strong>に制限される。</li>
            <li><span>・</span><strong>100W対応ケーブル（5A定格）</strong>: <strong>必須要件。</strong> 製品仕様に「5A」「100W」「E-Marker搭載」の表記がある製品を選定すること。</li>
          </ul>
          
          <h5 id="shop-guide-4">④ 高負荷PC（CAD/BIM機）の電源運用</h5>
          <p>
            Zenbook ProやゲーミングPC等、純正ACアダプタが<strong>150W〜200W超</strong>の機種における運用規定。
          </p>
          
          <div className="yy-sh-tblwrap">
            <table className="yy-tbl">
              <thead>
                <tr>
                  <th>電源ソース</th>
                  <th>供給電力</th>
                  <th>挙動・リスク</th>
                  <th>推奨運用</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>純正ACアダプタ</strong></td>
                  <td><strong>150W〜300W</strong></td>
                  <td><strong>最大性能発揮</strong>。レンダリング等の高負荷時も安定動作する。</td>
                  <td>事務所内作業・高負荷演算時</td>
                </tr>
                <tr>
                  <td><strong>USB-C充電器</strong></td>
                  <td><strong>Max 100W</strong></td>
                  <td><strong>電力不足</strong>。高負荷時はバッテリー残量が減少（消費電力＞供給電力）する。</td>
                  <td>移動時・メール確認等の軽作業</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <h4>2. 周辺機器仕様：帯域幅（Gbps）と転送速度（MB/s）の閾値</h4>
          
          <h5 id="shop-guide-5">⑤ 電源タップ：筐体形状による物理的干渉の回避</h5>
          <p>
            電気的仕様に加え、ACアダプタの物理形状に起因する干渉問題を回避可能な製品を選定する。
          </p>
          <ul>
            <li><span>・</span><strong>タワー型</strong>: 四方向への差込が可能なため、大型アダプタ同士の干渉を防ぐ。デスク上への設置に適する。</li>
            <li><span>・</span><strong>回転式</strong>: 差込口が個別に回転し、壁面コンセントにおいてもアダプタの角度調整が可能。</li>
          </ul>
          
          <h5 id="shop-guide-6">⑥ 外付けGPU（eGPU）：通信帯域（40Gbps）による性能制約</h5>
          <p>
            ノートPCの描画性能を拡張するeGPUボックスは、接続インターフェース（Thunderbolt 3/4）の帯域幅がボトルネックとなる。
          </p>
          <ul>
            <li><span>・</span><strong>通信帯域</strong>: <strong>最大40Gbps</strong>（デスクトップPC内部接続の約1/6相当）。</li>
            <li><span>・</span><strong>選定指針</strong>: ハイエンドGPU（RTX 4090等）を搭載しても帯域制限により性能の20〜30%が損失するため、費用対効果が低い。<strong>ミドルハイ（RTX 4060Ti 〜 4070）</strong>クラスが帯域幅とのバランスにおいて最適である。</li>
            <li><span>・</span><strong>電源容量</strong>: `BOX電源容量 ＞ GPU消費電力(TGP) ＋ PC給電(PD) ＋ 100W(マージン)` を満たす製品を選定すること。</li>
          </ul>
          
          <h5 id="shop-guide-7">⑦ 映像ケーブル（HDMI）：リフレッシュレート（Hz）の規格要件</h5>
          <p>
            単に映像が表示されるだけでなく、CAD操作における追従性を確保するための規格選定が必要である。
          </p>
          
          <div className="yy-sh-tblwrap">
            <table className="yy-tbl">
              <thead>
                <tr>
                  <th>HDMI規格</th>
                  <th>帯域幅</th>
                  <th>4K出力時の限界</th>
                  <th>業務への影響</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>HDMI 1.4</strong></td>
                  <td>10.2Gbps</td>
                  <td><strong>30Hz</strong></td>
                  <td><strong>不適</strong>。カーソルの追従性が著しく低下し、精密な製図作業に支障をきたす。</td>
                </tr>
                <tr>
                  <td><strong>HDMI 2.0</strong></td>
                  <td>18Gbps</td>
                  <td><strong>60Hz</strong></td>
                  <td><strong>必須</strong>。標準的な滑らかさが確保され、作業ストレスがない。</td>
                </tr>
                <tr>
                  <td><strong>HDMI 2.1</strong></td>
                  <td>48Gbps</td>
                  <td><strong>120Hz〜</strong></td>
                  <td>高リフレッシュレート対応モニターや8K出力時に必要。</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <p>
            <strong>確認方法</strong>: ケーブル被覆やパッケージに「Premium High Speed (HDMI 2.0相当)」以上の表記があることを確認すること。
          </p>
          
          <h5 id="shop-guide-8">⑧ 外付けストレージ：転送速度（MB/s）とインターフェース規格</h5>
          <p>
            現場写真のバックアップやBIMデータ等の大容量ファイル移動において、転送速度は作業時間に直結する。
          </p>
          
          <div className="yy-sh-tblwrap">
            <table className="yy-tbl">
              <thead>
                <tr>
                  <th>デバイス種別</th>
                  <th>転送速度（理論値）</th>
                  <th>実務所要時間目安（10GBデータ）</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>USBメモリ</strong></td>
                  <td>約 100 MB/s</td>
                  <td>約 2分</td>
                </tr>
                <tr>
                  <td><strong>SATA SSD</strong></td>
                  <td>約 500 MB/s</td>
                  <td>約 25秒</td>
                </tr>
                <tr>
                  <td><strong>NVMe SSD</strong></td>
                  <td><strong>1,000 MB/s 〜</strong></td>
                  <td><strong>約 5〜10秒</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <p>
            <strong>推奨仕様</strong>: パッケージ等に<strong>「読出速度 1050MB/s」</strong>等の4桁表記があるNVMe接続のSSDを選定すること。これにより、Revit等のプロジェクトファイルを外部ストレージ上で直接編集する場合も遅延なく作業可能となる。
          </p>
      </div>
    </section>
  );
}

const ShopContent: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('desk');
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [activeList, setActiveList] = useState<boolean[]>([]);
  const [expandedDescriptions, setExpandedDescriptions] = useState<{ [key: string]: boolean }>({});
  const [productImageIndices, setProductImageIndices] = useState<{ [key: string]: number }>({});
  const [showDeviceGuide, setShowDeviceGuide] = useState<boolean>(false);

  const displayCategory = (category: string) => {
    setIsTransitioning(true);
    setActiveList([]); // activeListを即座にリセット

    setTimeout(() => {
      setSelectedCategory(category);
      setIsTransitioning(false);
    }, 250);
  };

  // カテゴリ切り替え時にactiveListをリセットし、左から順にactive化
  useEffect(() => {
    if (isTransitioning) return; // トランジション中はアニメーションを開始しない

    const category = PRODUCT_CATEGORIES.find(c => c.id === selectedCategory);
    const items = category?.items || [];
    setActiveList(Array(items.length).fill(false));

    // 少し遅延させてからアニメーションを開始（トランジション完了後）
    const timer = setTimeout(() => {
      items.forEach((_, i) => {
        setTimeout(() => {
          setActiveList(prev => {
            const copy = [...prev];
            copy[i] = true;
            return copy;
          });
        }, i * 40);
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [selectedCategory, isTransitioning]);

  const current = PRODUCT_CATEGORIES.find(c => c.id === selectedCategory);
  const totalItems = PRODUCT_CATEGORIES.reduce((s, c) => s + c.items.length, 0);
  const brandCount = new Set(PRODUCT_CATEGORIES.flatMap(c => c.items.map(p => p.brand))).size;

  // ガイドを開いて、その見出しまで送る（n なしはガイドの頭）
  const openGuide = (n?: number) => {
    setShowDeviceGuide(true);
    setTimeout(() => {
      document.getElementById(n ? `shop-guide-${n}` : 'shop-guide')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  // 商品名の下の 1 行：説明（押すと全文）
  const descBlock = (product: Product) => (
    <>
      <p
        className={`yy-sh-desc${expandedDescriptions[product.id] ? ' is-open' : ''}`}
        onClick={() => setExpandedDescriptions(prev => ({ ...prev, [product.id]: !prev[product.id] }))}
      >
        {product.description}
      </p>
      {product.description.length > 100 && (
        <button
          type="button"
          onClick={() => setExpandedDescriptions(prev => ({ ...prev, [product.id]: !prev[product.id] }))}
          className="yy-linkbtn yy-sh-more"
        >
          {expandedDescriptions[product.id] ? '折りたたむ' : '続きを読む'}
        </button>
      )}
    </>
  );

  return (
    <div className="yy-sh">
      <PageHead
        no="24"
        en="shop"
        title="Shop"
        desc="設計・現場で役立つ道具"
        right={
          <>
            <Stat n={totalItems} label="品" />
            <Stat n={PRODUCT_CATEGORIES.length} label="分類" />
            <Stat n={brandCount} label="ブランド" />
            <a href="/register" className="yy-stat" style={{ textDecoration: 'none' }}>掲載希望 ↗</a>
          </>
        }
      />

      {/* カテゴリー：下線タブ */}
      <div className="yy-tabs">
        {PRODUCT_CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => displayCategory(category.id)}
            aria-pressed={selectedCategory === category.id}
            className="yy-tab"
          >
            {category.name}
            <small>{category.items.length}</small>
          </button>
        ))}
        <button
          type="button"
          onClick={() => (showDeviceGuide ? setShowDeviceGuide(false) : openGuide())}
          aria-expanded={showDeviceGuide}
          className="yy-tab yy-sh-guidetab"
        >
          <span className={`yy-sh-caret${showDeviceGuide ? ' is-open' : ''}`}>›</span> デジタルデバイス選定ガイド
        </button>
      </div>

      <div className="yy-newspage">
        <div className="yy-newspage__main">
          {/* デジタルデバイス選定ガイドトグル */}
          {showDeviceGuide && <DeviceGuide onClose={() => setShowDeviceGuide(false)} />}

          <div className="yy-sh-intro">
            <p>
              設計・現場で役立つ文具や家具、デバイスなどの新商品をカテゴリ別にピックアップしています。チームの備品検討や個人のアップデートにご活用ください。
            </p>
            <p className="yy-sh-pr">
              <span className="yy-fmt">PR</span>
              当サイトはアフィリエイト広告を利用しています。Amazonのアソシエイトとして、適格販売により収入を得ています。
            </p>
          </div>

          {/* 選択されたカテゴリーの商品一覧 */}
          <section
            id="shop-content-area"
            className={`yy-sh-area${isTransitioning ? ' is-out' : ''}`}
          >
            <SecHead no="I" title={current?.name} right={`${current?.items.length ?? 0} 品 · ${current?.description ?? ''}`} />

            <ol className="yy-sh-list">
              {current?.items.map((product, index) => {
                const useRakuten = RAKUTEN_IMAGE_IDS.has(product.id) && !!product.rakutenImage && !!product.rakutenLink;
                // 複数の画像がある場合は配列から選択、ない場合は単一画像を使用
                const images = product.rakutenImages && product.rakutenImages.length > 0
                  ? product.rakutenImages
                  : [product.rakutenImage];
                const currentIndex = productImageIndices[product.id] || 0;
                const currentImage = images[currentIndex] || images[0];

                return (
                  <li
                    key={product.id}
                    className={`yy-sh-item${activeList[index] ? ' is-in' : ''}`}
                  >
                    <span className="yy-sh-no">{String(index + 1).padStart(2, '0')}</span>
                    {useRakuten ? (
                      <>
                        {/* 画像枠: 1:1（正方形）。押すと次の画像へ */}
                        <div className="yy-sh-img is-cycle" title={images.length > 1 ? '押すと次の画像' : undefined}>
                          <img
                            src={`https:${currentImage}`}
                            alt={product.name}
                            className="yy-sh-imgel"
                            style={{ border: 'none' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              // 次の画像に切り替え（最後の画像の場合は最初に戻る）
                              const nextIndex = (currentIndex + 1) % images.length;
                              setProductImageIndices(prev => ({
                                ...prev,
                                [product.id]: nextIndex
                              }));
                            }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/image/shop/placeholder_480x384.png";
                              target.onerror = null;
                            }}
                          />
                        </div>
                        <img
                          src={`https://i.moshimo.com/af/i/impression?a_id=5277132&p_id=54&pc_id=54&pl_id=616`}
                          alt=""
                          loading="lazy"
                          width="1"
                          height="1"
                          style={{ border: 0, display: 'none' }}
                        />
                        <div className="yy-sh-body">
                          <span className="yy-sh-brand">{product.brand}</span>
                          <h3 className="yy-sh-name">{product.name}</h3>
                          {descBlock(product)}
                          <div className="yy-sh-foot">
                            {images.length > 1 && <span className="yy-fmt">写真 {currentIndex + 1}/{images.length}</span>}
                            {product.price > 0 && (
                              <span className="yy-sh-price">¥{product.price.toLocaleString()}</span>
                            )}
                            <span className="yy-sh-links">
                              <a
                                href={`https:${product.rakutenLink}`}
                                target="_blank"
                                rel="nofollow noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="yy-sh-buy hidden"
                              >
                                楽天で購入
                              </a>
                              {product.amazonLink && (
                                <a
                                  href={decorateAffiliateLink(product.amazonLink)}
                                  target="_blank"
                                  rel="nofollow noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="yy-sh-buy"
                                >
                                  Amazonで購入 ↗
                                </a>
                              )}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="yy-sh-img">
                          {product.embedHtml ? (
                            <div
                              className="shop-embed-container yy-sh-embed"
                              dangerouslySetInnerHTML={{ __html: sanitizeEmbed(product.embedHtml) }}
                            />
                          ) : (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="yy-sh-imgel"
                              width={400}
                              height={400}
                              loading="lazy"
                              style={{ objectFit: 'contain', maxWidth: '100%', maxHeight: '100%' }}
                              onError={async (e) => {
                                const target = e.target as HTMLImageElement;
                                const asinMatch = product.affiliateLink.match(/([A-Z0-9]{10})(?:[/?]|$)/);
                                if (asinMatch) {
                                  const url = await fetchAmazonItemImage(asinMatch[1]);
                                  if (url) { target.src = url; return; }
                                }
                                target.src = "/image/shop/placeholder_480x384.png";
                                target.onerror = null;
                              }}
                            />
                          )}
                        </div>
                        <div className="yy-sh-body">
                          <span className="yy-sh-brand">{product.brand}</span>
                          <h3 className="yy-sh-name">{product.name}</h3>
                          {descBlock(product)}
                          <div className="yy-sh-foot">
                            {product.price > 0 && (
                              <span className="yy-sh-price">¥{product.price.toLocaleString()}</span>
                            )}
                            <span className="yy-sh-links">
                              {product.amazonLink ? (
                                <a
                                  href={decorateAffiliateLink(product.amazonLink)}
                                  target="_blank"
                                  rel="nofollow noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="yy-sh-buy"
                                >
                                  Amazonで購入 ↗
                                </a>
                              ) : (
                                <a
                                  href={decorateAffiliateLink(product.affiliateLink)}
                                  target="_blank"
                                  rel="noopener noreferrer nofollow sponsored"
                                  className="yy-sh-buy"
                                >
                                  商品を見る ↗
                                </a>
                              )}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <aside className="yy-newspage__side">
          <section>
            <SecHead no="II" title="分類" right={`${totalItems} 品`} />
            <ol className="yy-home__toc">
              {PRODUCT_CATEGORIES.map((c, i) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`yy-srcrow yy-srcrow--btn${selectedCategory === c.id ? ' is-on' : ''}`}
                    aria-pressed={selectedCategory === c.id}
                    onClick={() => displayCategory(c.id)}
                  >
                    <span className="yy-home__tocno">{i + 1}</span>
                    <span className="yy-home__toct">{c.name}</span>
                    <span className="yy-leader" />
                    <span className="yy-serif">{c.items.length}</span>
                  </button>
                </li>
              ))}
            </ol>
            <p className="yy-sh-catdesc">{current?.description}</p>
          </section>

          <section>
            <SecHead no="III" title="選定ガイド" right="数値で選ぶ" />
            <ol className="yy-home__toc">
              {GUIDE_TOC.map((t, i) => (
                <li key={t}>
                  <button type="button" className="yy-srcrow yy-srcrow--btn" onClick={() => openGuide(i + 1)}>
                    <span className="yy-home__tocno">{'①②③④⑤⑥⑦⑧'[i]}</span>
                    <span className="yy-home__toct yy-sh-toct">{t}</span>
                    <span className="yy-leader" />
                    <span className="yy-sh-arrow">→</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <SecHead no="IV" title="掲載について" />
            <div className="yy-gray yy-sh-gray">
              <span className="yy-gray__title">掲載希望</span>
              <span className="yy-gray__text">商品・ブランドの掲載をご希望の方は、登録ページからご連絡ください。</span>
              <a href="/register" className="yy-linkbtn yy-sh-reg">掲載希望はコチラ ↗</a>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default ShopContent; 

// 画像の埋め込みHTML(例: Amazon SiteStripe)にもサイズ制御を適用
// Next.js の styled-jsx を利用して、このコンポーネント内でのみ有効にする
// - 埋め込み側の <img> の固定幅/高さを上書きし、枠内で収まるようにする
// - オブジェクトフィットは contain（全体表示）
<style jsx>{`
  :global(.shop-embed-container img) {
    max-width: 100%;
    max-height: 100%;
    height: auto;
    object-fit: contain;
    display: block;
  }
  :global(.shop-embed-container iframe) {
    max-width: 100%;
    max-height: 100%;
  }
`}</style>
