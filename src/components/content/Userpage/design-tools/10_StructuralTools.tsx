'use client';

import { ResultRow } from '@/components/ui/Sheet';
import DtResult from './DtResult';
import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';

type SectionType = 'rectangle' | 'circle' | 'hshape';

type SectionSummary = {
  label: string;
  areaMm2: number;
  areaCm2: number;
  IxMm4: number;
  IxCm4: number;
  IyMm4: number;
  IyCm4: number;
  ZxMm3: number;
  ZxCm3: number;
  ZyMm3: number;
  ZyCm3: number;
  ixCm: number;
  iyCm: number;
  unitWeight: number;
};

type BeamPattern = 'simple_point' | 'simple_dist' | 'cantilever_point';

interface StructuralToolsProps {
  defaultTab?: 'section' | 'portal' | 'beam' | 'nvalue' | 'formulas';
  hideTabBar?: boolean;
}

const StructuralTools: React.FC<StructuralToolsProps> = ({ defaultTab, hideTabBar }) => {
  const { isLoggedIn } = useAuth();
  const [active, setActive] = useState<'section' | 'portal' | 'beam' | 'nvalue' | 'formulas'>(defaultTab ?? 'section');
  useEffect(() => { if (defaultTab) setActive(defaultTab); }, [defaultTab]);

  // 構造計算（公式集）用の状態
  const [selectedPattern, setSelectedPattern] = useState<BeamPattern | null>(null);

  // 断面性能入力
  const [sectionType, setSectionType] = useState<SectionType>('rectangle');
  const [rectB, setRectB] = useState<number>(100); // mm
  const [rectH, setRectH] = useState<number>(200); // mm
  const [circD, setCircD] = useState<number>(100); // mm
  const [hH, setHH] = useState<number>(300); // overall height mm
  const [hB, setHB] = useState<number>(150); // flange width mm
  const [htw, setHtw] = useState<number>(6.5); // web thickness mm
  const [htf, setHtf] = useState<number>(9); // flange thickness mm
  const [hRootR, setHRootR] = useState<number>(0); // root radius r mm (情報入力用)

  // H形鋼 カタログ選択モード（JFE: HN/HM/HW）
  const [hCatalogMode, setHCatalogMode] = useState<boolean>(true);
  type HSeries = 'HN' | 'HM' | 'HW';
type HBeamCatalogEntry = {
    series: HSeries; // HN:細幅, HM:中幅, HW:広幅
    label: string;   // 例: H-300×150×6.5×9
    H: number; B: number; tw: number; tf: number; r?: number;
    A_cm2?: number; // 断面積（cm^2）
    A_cm2_text?: string;
    unitWeightKgPerM?: number; // カタログ重量
    unitWeightKgPerM_text?: string;
    Ix_cm4?: number; // 断面二次モーメント（cm^4）
    Ix_cm4_text?: string;
    Zx_cm3?: number; // 断面係数（cm^3）
    Zx_cm3_text?: string;
    Iy_cm4?: number; Zy_cm3?: number; // 追加
    Iy_cm4_text?: string; Zy_cm3_text?: string;
    ix_cm?: number; iy_cm?: number; // 断面二次半径（cm）
    ix_cm_text?: string; iy_cm_text?: string;
    // 曲げ応力用断面性能・横座屈（SN400 外数値 / SN490 括弧内）
    ib_sn400?: number; ib_sn490?: number;
    ib_text?: string;
    eta_sn400?: number; eta_sn490?: number;
    eta_text?: string;
    lb_m_sn400?: number; lb_m_sn490?: number; // fb=ftとなる最大横座屈長さ（m）
    lb_m_text?: string;
    // 幅厚比種別
    wtClassColumn?: string; wtClassBeam?: string;
    // 幅厚比規定による有効断面
    Zxe_cm3?: number; Zye_cm3?: number; Ae_cm2?: number;
    Zxe_cm3_text?: string; Zye_cm3_text?: string; Ae_cm2_text?: string;
    // 塑性断面係数（単一数値）
    Zpx_cm3?: number; Zpy_cm3?: number;
    Zpx_cm3_text?: string; Zpy_cm3_text?: string;
    callName?: string; // 呼称（例: H-200×200）
  };
  const hSeriesLabel: Record<HSeries, string> = { HN: '細幅(HN)', HM: '中幅(HM)', HW: '広幅(HW)' };
  const defaultCatalog: HBeamCatalogEntry[] = [
    // HM/HN は今後入力予定。初期サンプルは削除済み。
    // HW（広幅）手入力データ
    { series: 'HW', label: 'H-100×100×6×8', H: 100, B: 100, tw: 6, tf: 8, r: 8,
      A_cm2: 21.59, unitWeightKgPerM: 16.9,
      Ix_cm4: 378, Iy_cm4: 134, ix_cm: 4.18, iy_cm: 2.49,
      Zx_cm3: 75.6, Zy_cm3: 26.7,
      ib_sn400: 2.75, ib_sn490: 2.75, eta_sn400: 3.44, eta_sn490: 3.44,
      lb_m_sn400: 4.54, lb_m_sn490: 3.29,
      wtClassColumn: 'FA', wtClassBeam: 'FA',
      Zxe_cm3: 75.6, Zye_cm3: 26.7, Ae_cm2: 21.59,
      Zpx_cm3: 86.4, Zpy_cm3: 41.0, Zpy_cm3_text: '41.0',
      callName: 'H-100×100' },
    { series: 'HW', label: 'H-125×125×6.5×9', H: 125, B: 125, tw: 6.5, tf: 9, r: 8,
      A_cm2: 30.00, A_cm2_text: '30.00', unitWeightKgPerM: 23.6, unitWeightKgPerM_text: '23.6',
      Ix_cm4: 839, Ix_cm4_text: '839', Iy_cm4: 293, Iy_cm4_text: '293',
      ix_cm: 5.29, ix_cm_text: '5.29', iy_cm: 3.13, iy_cm_text: '3.13',
      Zx_cm3: 134, Zx_cm3_text: '134', Zy_cm3: 46.9, Zy_cm3_text: '46.9',
      ib_sn400: 3.45, ib_sn490: 3.45, ib_text: '3.45',
      eta_sn400: 3.84, eta_sn490: 3.84, eta_text: '3.84',
      lb_m_sn400: 5.11, lb_m_sn490: 3.70, lb_m_text: '5.11(3.70)',
      wtClassColumn: 'FA', wtClassBeam: 'FA',
      Zxe_cm3: 134, Zxe_cm3_text: '134', Zye_cm3: 46.9, Zye_cm3_text: '46.9', Ae_cm2: 30.00, Ae_cm2_text: '30.00',
      Zpx_cm3: 152, Zpx_cm3_text: '152', Zpy_cm3: 71.7, Zpy_cm3_text: '71.7',
      callName: 'H-125×125' },
    { series: 'HW', label: 'H-150×150×7×10', H: 150, B: 150, tw: 7, tf: 10, r: 8,
      A_cm2: 39.65, A_cm2_text: '39.65', unitWeightKgPerM: 31.1, unitWeightKgPerM_text: '31.1',
      Ix_cm4: 1620, Ix_cm4_text: '1620', Iy_cm4: 563, Iy_cm4_text: '563',
      ix_cm: 6.40, ix_cm_text: '6.40', iy_cm: 3.77, iy_cm_text: '3.77',
      Zx_cm3: 216, Zx_cm3_text: '216', Zy_cm3: 75.1, Zy_cm3_text: '75.1',
      ib_sn400: 4.15, ib_sn490: 4.15, ib_text: '4.15',
      eta_sn400: 4.15, eta_sn490: 4.15, eta_text: '4.15',
      lb_m_sn400: 5.68, lb_m_sn490: 4.11, lb_m_text: '5.68(4.11)',
      wtClassColumn: 'FA', wtClassBeam: 'FA',
      Zxe_cm3: 216, Zxe_cm3_text: '216', Zye_cm3: 75.1, Zye_cm3_text: '75.1', Ae_cm2: 39.65, Ae_cm2_text: '39.65',
      Zpx_cm3: 243, Zpx_cm3_text: '243', Zpy_cm3: 114, Zpy_cm3_text: '114',
      callName: 'H-150×150' },
    { series: 'HW', label: 'H-175×175×7.5×11', H: 175, B: 175, tw: 7.5, tf: 11, r: 13,
      A_cm2: 51.43, A_cm2_text: '51.43', unitWeightKgPerM: 40.4, unitWeightKgPerM_text: '40.4',
      Ix_cm4: 2900, Ix_cm4_text: '2900', Iy_cm4: 984, Iy_cm4_text: '984',
      ix_cm: 7.50, ix_cm_text: '7.50', iy_cm: 4.37, iy_cm_text: '4.37',
      Zx_cm3: 331, Zx_cm3_text: '331', Zy_cm3: 112, Zy_cm3_text: '112',
      ib_sn400: 4.80, ib_sn490: 4.36, ib_text: '4.80',
      eta_sn400: 4.36, eta_sn490: 4.36, eta_text: '4.36',
      lb_m_sn400: 6.25, lb_m_sn490: 4.52, lb_m_text: '6.25(4.52)',
      wtClassColumn: 'FA', wtClassBeam: 'FB',
      Zxe_cm3: 331, Zxe_cm3_text: '331', Zye_cm3: 112, Zye_cm3_text: '112', Ae_cm2: 51.43, Ae_cm2_text: '51.43',
      Zpx_cm3: 370, Zpx_cm3_text: '370', Zpy_cm3: 172, Zpy_cm3_text: '172',
      callName: 'H-175×175' },
    { series: 'HW', label: 'H-200×200×8×12', H: 200, B: 200, tw: 8, tf: 12, r: 13,
      A_cm2: 63.53, A_cm2_text: '63.53', unitWeightKgPerM: 49.9, unitWeightKgPerM_text: '49.9',
      Ix_cm4: 4720, Ix_cm4_text: '4720', Iy_cm4: 1600, Iy_cm4_text: '1600',
      ix_cm: 8.62, ix_cm_text: '8.62', iy_cm: 5.02, iy_cm_text: '5.02',
      Zx_cm3: 472, Zx_cm3_text: '472', Zy_cm3: 160, Zy_cm3_text: '160',
      ib_sn400: 5.50, ib_sn490: 5.50, ib_text: '5.50',
      eta_sn400: 4.59, eta_sn490: 4.59, eta_text: '4.59',
      lb_m_sn400: 6.82, lb_m_sn490: 4.93, lb_m_text: '6.82(4.93)',
      wtClassColumn: 'FA', wtClassBeam: 'FB',
      Zxe_cm3: 472, Zxe_cm3_text: '472', Zye_cm3: 160, Zye_cm3_text: '160', Ae_cm2: 63.53, Ae_cm2_text: '63.53',
      Zpx_cm3: 525, Zpx_cm3_text: '525', Zpy_cm3: 244, Zpy_cm3_text: '244',
      callName: 'H-200×200' },
    { series: 'HW', label: 'H-200×204×12×12', H: 200, B: 204, tw: 12, tf: 12, r: 13,
      A_cm2: 71.53, A_cm2_text: '71.53', unitWeightKgPerM: 56.2, unitWeightKgPerM_text: '56.2',
      Ix_cm4: 4980, Ix_cm4_text: '4980', Iy_cm4: 1700, Iy_cm4_text: '1700',
      ix_cm: 8.35, ix_cm_text: '8.35', iy_cm: 4.88, iy_cm_text: '4.88',
      Zx_cm3: 498, Zx_cm3_text: '498', Zy_cm3: 167, Zy_cm3_text: '167',
      ib_sn400: 5.53, ib_sn490: 5.53, ib_text: '5.53',
      eta_sn400: 4.52, eta_sn490: 4.52, eta_text: '4.52',
      lb_m_sn400: 6.95, lb_m_sn490: 5.03, lb_m_text: '6.95(5.03)',
      wtClassColumn: 'FA', wtClassBeam: 'FB',
      Zxe_cm3: 498, Zxe_cm3_text: '498', Zye_cm3: 167, Zye_cm3_text: '167', Ae_cm2: 71.53, Ae_cm2_text: '71.53',
      Zpx_cm3: 565, Zpx_cm3_text: '565', Zpy_cm3: 257, Zpy_cm3_text: '257',
      callName: 'H-200×200' },
    { series: 'HW', label: 'H-208×202×10×16', H: 208, B: 202, tw: 10, tf: 16, r: 13,
      A_cm2: 83.69, A_cm2_text: '83.69', unitWeightKgPerM: 65.7, unitWeightKgPerM_text: '65.7',
      Ix_cm4: 6530, Ix_cm4_text: '6530', Iy_cm4: 2200, Iy_cm4_text: '2200',
      ix_cm: 8.83, ix_cm_text: '8.83', iy_cm: 5.13, iy_cm_text: '5.13',
      Zx_cm3: 628, Zx_cm3_text: '628', Zy_cm3: 218, Zy_cm3_text: '218',
      ib_sn400: 5.61, ib_sn490: 5.61, ib_text: '5.61',
      eta_sn400: 3.61, eta_sn490: 3.61, eta_text: '3.61',
      lb_m_sn400: 8.83, lb_m_sn490: 6.38, lb_m_text: '8.83(6.38)',
      wtClassColumn: 'FA', wtClassBeam: 'FA',
      Zxe_cm3: 628, Zxe_cm3_text: '628', Zye_cm3: 218, Zye_cm3_text: '218', Ae_cm2: 83.69, Ae_cm2_text: '83.69',
      Zpx_cm3: 710, Zpx_cm3_text: '710', Zpy_cm3: 332, Zpy_cm3_text: '332',
      callName: 'H-200×200' },
    { series: 'HW', label: 'H-244×252×11×11', H: 244, B: 252, tw: 11, tf: 11, r: 13,
      A_cm2: 81.31, A_cm2_text: '81.31', unitWeightKgPerM: 63.8, unitWeightKgPerM_text: '63.8',
      Ix_cm4: 8700, Ix_cm4_text: '8700', Iy_cm4: 2940, Iy_cm4_text: '2940',
      ix_cm: 10.3, ix_cm_text: '10.3', iy_cm: 6.01, iy_cm_text: '6.01',
      Zx_cm3: 713, Zx_cm3_text: '713', Zy_cm3: 233, Zy_cm3_text: '233',
      ib_sn400: 6.80, ib_sn490: 6.80, ib_text: '6.80',
      eta_sn400: 5.99, eta_sn490: 5.99, eta_text: '5.99',
      lb_m_sn400: 6.45, lb_m_sn490: 4.67, lb_m_text: '6.45(4.67)',
      wtClassColumn: 'FB', wtClassBeam: 'FC',
      Zxe_cm3: 713, Zxe_cm3_text: '713', Zye_cm3: 233, Zye_cm3_text: '233', Ae_cm2: 81.31, Ae_cm2_text: '81.31',
      Zpx_cm3: 797, Zpx_cm3_text: '797', Zpy_cm3: 357, Zpy_cm3_text: '357',
      callName: 'H-250×250' },
    { series: 'HW', label: 'H-248×249×8×13', H: 248, B: 249, tw: 8, tf: 13, r: 13,
      A_cm2: 83.95, A_cm2_text: '83.95', unitWeightKgPerM: 65.9, unitWeightKgPerM_text: '65.9',
      Ix_cm4: 9850, Ix_cm4_text: '9850', Iy_cm4: 3350, Iy_cm4_text: '3350',
      ix_cm: 10.8, ix_cm_text: '10.8', iy_cm: 6.31, iy_cm_text: '6.31',
      Zx_cm3: 794, Zx_cm3_text: '794', Zy_cm3: 269, Zy_cm3_text: '269',
      ib_sn400: 6.88, ib_sn490: 6.88, ib_text: '6.88',
      eta_sn400: 5.27, eta_sn490: 5.27, eta_text: '5.27',
      lb_m_sn400: 7.41, lb_m_sn490: 5.36, lb_m_text: '7.41(5.36)',
      wtClassColumn: 'FB（FB）', wtClassBeam: 'FB（FC）',
      Zxe_cm3: 794, Zxe_cm3_text: '794', Zye_cm3: 269, Zye_cm3_text: '269', Ae_cm2: 83.95, Ae_cm2_text: '83.95',
      Zpx_cm3: 875, Zpx_cm3_text: '875', Zpy_cm3: 408, Zpy_cm3_text: '408',
      callName: 'H-250×250' },
    { series: 'HW', label: 'H-250×250×9×14', H: 250, B: 250, tw: 9, tf: 14, r: 13,
      A_cm2: 91.43, A_cm2_text: '91.43', unitWeightKgPerM: 71.8, unitWeightKgPerM_text: '71.8',
      Ix_cm4: 10700, Ix_cm4_text: '10700', Iy_cm4: 3650, Iy_cm4_text: '3650',
      ix_cm: 10.8, ix_cm_text: '10.8', iy_cm: 6.32, iy_cm_text: '6.32',
      Zx_cm3: 860, Zx_cm3_text: '860', Zy_cm3: 292, Zy_cm3_text: '292',
      ib_sn400: 6.91, ib_sn490: 6.91, ib_text: '6.91',
      eta_sn400: 4.93, eta_sn490: 4.93, eta_text: '4.93',
      lb_m_sn400: 7.95, lb_m_sn490: 5.75, lb_m_text: '7.95(5.75)',
      wtClassColumn: 'FA（FB）', wtClassBeam: 'FA（FB）',
      Zxe_cm3: 860, Zxe_cm3_text: '860', Zye_cm3: 292, Zye_cm3_text: '292', Ae_cm2: 91.43, Ae_cm2_text: '91.43',
      Zpx_cm3: 953, Zpx_cm3_text: '953', Zpy_cm3: 443, Zpy_cm3_text: '443',
      callName: 'H-250×250' },
    { series: 'HW', label: 'H-250×255×14×14', H: 250, B: 255, tw: 14, tf: 14, r: 13,
      A_cm2: 103.9, A_cm2_text: '103.9', unitWeightKgPerM: 81.6, unitWeightKgPerM_text: '81.6',
      Ix_cm4: 11400, Ix_cm4_text: '11400', Iy_cm4: 3880, Iy_cm4_text: '3880',
      ix_cm: 10.5, ix_cm_text: '10.5', iy_cm: 6.11, iy_cm_text: '6.11',
      Zx_cm3: 912, Zx_cm3_text: '912', Zy_cm3: 304, Zy_cm3_text: '304',
      ib_sn400: 6.93, ib_sn490: 6.93, ib_text: '6.93',
      eta_sn400: 4.85, eta_sn490: 4.85, eta_text: '4.85',
      lb_m_sn400: 8.11, lb_m_sn490: 5.87, lb_m_text: '8.11(5.87)',
      wtClassColumn: 'FA（FB）', wtClassBeam: 'FB（FB）',
      Zxe_cm3: 912, Zxe_cm3_text: '912', Zye_cm3: 304, Zye_cm3_text: '304', Ae_cm2: 103.9, Ae_cm2_text: '103.9',
      Zpx_cm3: 1030, Zpx_cm3_text: '1030', Zpy_cm3: 467, Zpy_cm3_text: '467',
      callName: 'H-250×250' },
    { series: 'HW', label: 'H-294×302×12×12', H: 294, B: 302, tw: 12, tf: 12, r: 13,
      A_cm2: 106.3, A_cm2_text: '106.3', unitWeightKgPerM: 83.4, unitWeightKgPerM_text: '83.4',
      Ix_cm4: 16600, Ix_cm4_text: '16600', Iy_cm4: 5510, Iy_cm4_text: '5510',
      ix_cm: 12.5, ix_cm_text: '12.5', iy_cm: 7.20, iy_cm_text: '7.20',
      Zx_cm3: 1130, Zx_cm3_text: '1130', Zy_cm3: 365, Zy_cm3_text: '365',
      ib_sn400: 8.16, ib_sn490: 8.16, ib_text: '8.16',
      eta_sn400: 6.62, eta_sn490: 6.62, eta_text: '6.62',
      lb_m_sn400: 7.00, lb_m_sn490: 5.06, lb_m_text: '7.00(5.06)',
      wtClassColumn: 'FC', wtClassBeam: 'FC',
      Zxe_cm3: 1130, Zxe_cm3_text: '1.130', Zye_cm3: 365, Zye_cm3_text: '365', Ae_cm2: 106.3, Ae_cm2_text: '106.3',
      Zpx_cm3: 1260, Zpx_cm3_text: '1260', Zpy_cm3: 558, Zpy_cm3_text: '558',
      callName: 'H-300×300' },
    { series: 'HW', label: 'H-298×299×9×14', H: 298, B: 299, tw: 9, tf: 14, r: 13,
      A_cm2: 109.5, A_cm2_text: '109.5', unitWeightKgPerM: 86.0, unitWeightKgPerM_text: '86.0',
      Ix_cm4: 18600, Ix_cm4_text: '18600', Iy_cm4: 6240, Iy_cm4_text: '6240',
      ix_cm: 13.0, ix_cm_text: '13.0', iy_cm: 7.55, iy_cm_text: '7.55',
      Zx_cm3: 1250, Zx_cm3_text: '1250', Zy_cm3: 417, Zy_cm3_text: '417',
      ib_sn400: 8.25, ib_sn490: 8.25, ib_text: '8.25',
      eta_sn400: 5.88, eta_sn490: 5.88, eta_text: '5.88',
      lb_m_sn400: 7.98, lb_m_sn490: 5.77, lb_m_text: '7.98(5.77)',
      wtClassColumn: 'FB（FC）', wtClassBeam: 'FB（FC）',
      Zxe_cm3: 1250, Zxe_cm3_text: '1250', Zye_cm3: 417, Zye_cm3_text: '417', Ae_cm2: 109.5, Ae_cm2_text: '109.5',
      Zpx_cm3: 1370, Zpx_cm3_text: '1370', Zpy_cm3: 632, Zpy_cm3_text: '632',
      callName: 'H-300×300' },
    { series: 'HW', label: 'H-300×300×10×15', H: 300, B: 300, tw: 10, tf: 15, r: 13,
      A_cm2: 118.5, A_cm2_text: '118.5', unitWeightKgPerM: 93.0, unitWeightKgPerM_text: '93.0',
      Ix_cm4: 20200, Ix_cm4_text: '20200', Iy_cm4: 6750, Iy_cm4_text: '6750',
      ix_cm: 13.1, ix_cm_text: '13.1', iy_cm: 7.55, iy_cm_text: '7.55',
      Zx_cm3: 1350, Zx_cm3_text: '1350', Zy_cm3: 450, Zy_cm3_text: '450',
      ib_sn400: 8.28, ib_sn490: 8.28, ib_text: '8.28',
      eta_sn400: 5.52, eta_sn490: 5.52, eta_text: '5.52',
      lb_m_sn400: 8.52, lb_m_sn490: 6.16, lb_m_text: '8.52(6.16)',
      wtClassColumn: 'FB（FB）', wtClassBeam: 'FB（FC）',
      Zxe_cm3: 1350, Zxe_cm3_text: '1350（1350）', Zye_cm3: 450, Zye_cm3_text: '450（450）', Ae_cm2: 118.5, Ae_cm2_text: '118.5（118.5）',
      Zpx_cm3: 1480, Zpx_cm3_text: '1480', Zpy_cm3: 683, Zpy_cm3_text: '683',
      callName: 'H-300×300' },
    { series: 'HW', label: 'H-300×305×15×15', H: 300, B: 305, tw: 15, tf: 15, r: 13,
      A_cm2: 133.5, A_cm2_text: '133.5', unitWeightKgPerM: 105, unitWeightKgPerM_text: '105',
      Ix_cm4: 21300, Ix_cm4_text: '21300', Iy_cm4: 7100, Iy_cm4_text: '7100',
      ix_cm: 12.6, ix_cm_text: '12.6', iy_cm: 7.30, iy_cm_text: '7.30',
      Zx_cm3: 1420, Zx_cm3_text: '1420', Zy_cm3: 466, Zy_cm3_text: '466',
      ib_sn400: 8.28, ib_sn490: 8.28, ib_text: '8.28',
      eta_sn400: 5.43, eta_sn490: 5.43, eta_text: '5.43',
      lb_m_sn400: 8.66, lb_m_sn490: 6.26, lb_m_text: '8.66(6.26)',
      wtClassColumn: 'FB（FB）', wtClassBeam: 'FB（FC）',
      Zxe_cm3: 1420, Zxe_cm3_text: '1420', Zye_cm3: 466, Zye_cm3_text: '466', Ae_cm2: 133.5, Ae_cm2_text: '133.5',
      Zpx_cm3: 1600, Zpx_cm3_text: '1600', Zpy_cm3: 714, Zpy_cm3_text: '714',
      callName: 'H-300×300' },
    { series: 'HW', label: 'H-304×301×11×17', H: 304, B: 301, tw: 11, tf: 17, r: 13,
      A_cm2: 133.5, A_cm2_text: '133.5', unitWeightKgPerM: 105, unitWeightKgPerM_text: '105',
      Ix_cm4: 23200, Ix_cm4_text: '23200', Iy_cm4: 7730, Iy_cm4_text: '7730',
      ix_cm: 13.2, ix_cm_text: '13.2', iy_cm: 7.61, iy_cm_text: '7.61',
      Zx_cm3: 1520, Zx_cm3_text: '1520', Zy_cm3: 514, Zy_cm3_text: '514',
      ib_sn400: 8.34, ib_sn490: 8.34, ib_text: '8.34',
      eta_sn400: 4.95, eta_sn490: 4.95, eta_text: '4.95',
      lb_m_sn400: 9.56, lb_m_sn490: 6.91, lb_m_text: '9.56(6.91)',
      wtClassColumn: 'FA（FB）', wtClassBeam: 'FA（FB）',
      Zxe_cm3: 1520, Zxe_cm3_text: '1520（1520）', Zye_cm3: 514, Zye_cm3_text: '514（514）', Ae_cm2: 133.5, Ae_cm2_text: '133.5（133.5）',
      Zpx_cm3: 1690, Zpx_cm3_text: '1690', Zpy_cm3: 779, Zpy_cm3_text: '779',
      callName: 'H-300×300' },
    { series: 'HW', label: 'H-338×351×13×13', H: 338, B: 351, tw: 13, tf: 13, r: 13,
      A_cm2: 133.3, A_cm2_text: '133.3', unitWeightKgPerM: 105, unitWeightKgPerM_text: '105',
      Ix_cm4: 27700, Ix_cm4_text: '27700', Iy_cm4: 9380, Iy_cm4_text: '9380',
      ix_cm: 14.4, ix_cm_text: '14.4', iy_cm: 8.39, iy_cm_text: '8.39',
      Zx_cm3: 1640, Zx_cm3_text: '1640', Zy_cm3: 534, Zy_cm3_text: '534',
      ib_sn400: 9.49, ib_sn490: 9.49, ib_text: '9.49',
      eta_sn400: 7.03, eta_sn490: 7.03, eta_text: '7.03',
      lb_m_sn400: 7.67, lb_m_sn490: 5.55, lb_m_text: '7.67(5.55)',
      wtClassColumn: 'FC（FD）', wtClassBeam: 'FC（FD）',
      Zxe_cm3: 1640, Zxe_cm3_text: '1640（1600）', Zye_cm3: 534, Zye_cm3_text: '534（491）', Ae_cm2: 133.3, Ae_cm2_text: '133.3（130.7）',
      Zpx_cm3: 1820, Zpx_cm3_text: '1820', Zpy_cm3: 815, Zpy_cm3_text: '815',
      callName: 'H-350×350' },
    { series: 'HW', label: 'H-344×348×10×16', H: 344, B: 348, tw: 10, tf: 16, r: 13,
      A_cm2: 144.0, A_cm2_text: '144.0', unitWeightKgPerM: 113, unitWeightKgPerM_text: '113',
      Ix_cm4: 32800, Ix_cm4_text: '32800', Iy_cm4: 11200, Iy_cm4_text: '11200',
      ix_cm: 15.1, ix_cm_text: '15.1', iy_cm: 8.84, iy_cm_text: '8.84',
      Zx_cm3: 1910, Zx_cm3_text: '1910', Zy_cm3: 646, Zy_cm3_text: '646',
      ib_sn400: 9.64, ib_sn490: 9.64, ib_text: '9.64',
      eta_sn400: 5.95, eta_sn490: 5.95, eta_text: '5.95',
      lb_m_sn400: 9.20, lb_m_sn490: 6.65, lb_m_text: '9.20(6.65)',
      wtClassColumn: 'FB（FC）', wtClassBeam: 'FB（FC）',
      Zxe_cm3: 1910, Zxe_cm3_text: '1910（1910）', Zye_cm3: 646, Zye_cm3_text: '646（646）', Ae_cm2: 144.0, Ae_cm2_text: '144.0（144.0）',
      Zpx_cm3: 2090, Zpx_cm3_text: '2090', Zpy_cm3: 978, Zpy_cm3_text: '978',
      callName: 'H-350×350' },
    { series: 'HW', label: 'H-344×354×16×16', H: 344, B: 354, tw: 16, tf: 16, r: 13,
      A_cm2: 164.7, A_cm2_text: '164.7', unitWeightKgPerM: 129, unitWeightKgPerM_text: '129',
      Ix_cm4: 34900, Ix_cm4_text: '34900', Iy_cm4: 11800, Iy_cm4_text: '11800',
      ix_cm: 14.6, ix_cm_text: '14.6', iy_cm: 8.48, iy_cm_text: '8.48',
      Zx_cm3: 2030, Zx_cm3_text: '2030', Zy_cm3: 669, Zy_cm3_text: '669',
      ib_sn400: 9.62, ib_sn490: 9.62, ib_text: '9.62',
      eta_sn400: 5.84, eta_sn490: 5.84, eta_text: '5.84',
      lb_m_sn400: 9.35, lb_m_sn490: 6.76, lb_m_text: '9.35(6.76)',
      wtClassColumn: 'FB（FC）', wtClassBeam: 'FC（FC）',
      Zxe_cm3: 2030, Zxe_cm3_text: '2030（2030）', Zye_cm3: 669, Zye_cm3_text: '669（669）', Ae_cm2: 164.7, Ae_cm2_text: '164.7（164.7）',
      Zpx_cm3: 2270, Zpx_cm3_text: '2270', Zpy_cm3: 1020, Zpy_cm3_text: '1020',
      callName: 'H-350×350' },
    { series: 'HW', label: 'H-350×350×12×19', H: 350, B: 350, tw: 12, tf: 19, r: 13,
      A_cm2: 171.9, A_cm2_text: '171.9', unitWeightKgPerM: 135, unitWeightKgPerM_text: '135',
      Ix_cm4: 39800, Ix_cm4_text: '39800', Iy_cm4: 13600, Iy_cm4_text: '13600',
      ix_cm: 15.2, ix_cm_text: '15.2', iy_cm: 8.89, iy_cm_text: '8.89',
      Zx_cm3: 2280, Zx_cm3_text: '2280', Zy_cm3: 776, Zy_cm3_text: '776',
      ib_sn400: 9.71, ib_sn490: 9.71, ib_text: '9.71',
      eta_sn400: 5.11, eta_sn490: 5.11, eta_text: '5.11',
      lb_m_sn400: 10.8, lb_m_sn490: 7.80, lb_m_text: '10.8(7.80)',
      wtClassColumn: 'FA（FB）', wtClassBeam: 'FB（FB）',
      Zxe_cm3: 2280, Zxe_cm3_text: '2280（2280）', Zye_cm3: 776, Zye_cm3_text: '776（776）', Ae_cm2: 171.9, Ae_cm2_text: '171.9（171.9）',
      Zpx_cm3: 2520, Zpx_cm3_text: '2520', Zpy_cm3: 1180, Zpy_cm3_text: '1180',
      callName: 'H-350×350' },
    { series: 'HW', label: 'H-350×357×19×19', H: 350, B: 357, tw: 19, tf: 19, r: 13,
      A_cm2: 196.4, A_cm2_text: '196.4', unitWeightKgPerM: 154, unitWeightKgPerM_text: '154',
      Ix_cm4: 42300, Ix_cm4_text: '42300', Iy_cm4: 14400, Iy_cm4_text: '14400',
      ix_cm: 14.7, ix_cm_text: '14.7', iy_cm: 8.57, iy_cm_text: '8.57',
      Zx_cm3: 2420, Zx_cm3_text: '2420', Zy_cm3: 808, Zy_cm3_text: '808',
      ib_sn400: 9.74, ib_sn490: 9.74, ib_text: '9.74',
      eta_sn400: 5.02, eta_sn490: 5.02, eta_text: '5.02',
      lb_m_sn400: 11.0, lb_m_sn490: 7.96, lb_m_text: '11.0(7.96)',
      wtClassColumn: 'FA（FB）', wtClassBeam: 'FB（FC）',
      Zxe_cm3: 2420, Zxe_cm3_text: '2420（2420）', Zye_cm3: 808, Zye_cm3_text: '808（808）', Ae_cm2: 196.4, Ae_cm2_text: '196.4（196.4）',
      Zpx_cm3: 2730, Zpx_cm3_text: '2730', Zpy_cm3: 1240, Zpy_cm3_text: '1240',
      callName: 'H-350×350' },
    { series: 'HW', label: 'H-356×352×14×22', H: 356, B: 352, tw: 14, tf: 22, r: 13,
      A_cm2: 200.0, A_cm2_text: '200.0', unitWeightKgPerM: 157, unitWeightKgPerM_text: '157',
      Ix_cm4: 47100, Ix_cm4_text: '47100', Iy_cm4: 16000, Iy_cm4_text: '16000',
      ix_cm: 15.4, ix_cm_text: '15.4', iy_cm: 8.94, iy_cm_text: '8.94',
      Zx_cm3: 2650, Zx_cm3_text: '2650', Zy_cm3: 909, Zy_cm3_text: '909',
      ib_sn400: 9.79, ib_sn490: 9.79, ib_text: '9.79',
      eta_sn400: 4.50, eta_sn490: 4.50, eta_text: '4.50',
      lb_m_sn400: 12.4, lb_m_sn490: 8.94, lb_m_text: '12.4(8.94)',
      wtClassColumn: 'FA（FA）', wtClassBeam: 'FA（FB）',
      Zxe_cm3: 2650, Zxe_cm3_text: '2650（2650）', Zye_cm3: 909, Zye_cm3_text: '909（909）', Ae_cm2: 200.0, Ae_cm2_text: '200.0（200.0）',
      Zpx_cm3: 2950, Zpx_cm3_text: '2950', Zpy_cm3: 1380, Zpy_cm3_text: '1380',
      callName: 'H-350×350' },
    { series: 'HW', label: 'H-388×402×15×15', H: 388, B: 402, tw: 15, tf: 15, r: 22,
      A_cm2: 178.5, A_cm2_text: '178.5', unitWeightKgPerM: 140, unitWeightKgPerM_text: '140',
      Ix_cm4: 49000, Ix_cm4_text: '49000', Iy_cm4: 16300, Iy_cm4_text: '16300',
      ix_cm: 16.6, ix_cm_text: '16.6', iy_cm: 9.55, iy_cm_text: '9.55',
      Zx_cm3: 2520, Zx_cm3_text: '2520', Zy_cm3: 809, Zy_cm3_text: '809',
      ib_sn400: 10.8, ib_sn490: 10.8, ib_text: '10.8',
      eta_sn400: 6.94, eta_sn490: 6.94, eta_text: '6.94',
      lb_m_sn400: 8.83, lb_m_sn490: 6.38, lb_m_text: '8.83(6.38)',
      wtClassColumn: 'FC（FD）', wtClassBeam: 'FC（FD）',
      Zxe_cm3: 2520, Zxe_cm3_text: '2520（2500）', Zye_cm3: 809, Zye_cm3_text: '809（778）', Ae_cm2: 178.5, Ae_cm2_text: '178.5（176.9）',
      Zpx_cm3: 2800, Zpx_cm3_text: '2800', Zpy_cm3: 1240, Zpy_cm3_text: '1240',
      callName: 'H-400×400' },
    { series: 'HW', label: 'H-394×398×11×18', H: 394, B: 398, tw: 11, tf: 18, r: 22,
      A_cm2: 186.8, A_cm2_text: '186.8', unitWeightKgPerM: 147, unitWeightKgPerM_text: '147',
      Ix_cm4: 56100, Ix_cm4_text: '56100', Iy_cm4: 18900, Iy_cm4_text: '18900',
      ix_cm: 17.3, ix_cm_text: '17.3', iy_cm: 10.1, iy_cm_text: '10.1',
      Zx_cm3: 2850, Zx_cm3_text: '2850', Zy_cm3: 951, Zy_cm3_text: '951',
      ib_sn400: 10.9, ib_sn490: 10.9, ib_text: '10.9',
      eta_sn400: 6.02, eta_sn490: 6.02, eta_text: '6.02',
      lb_m_sn400: 10.3, lb_m_sn490: 7.47, lb_m_text: '10.3(7.47)',
      wtClassColumn: 'FB（FC）', wtClassBeam: 'FC（FC）',
      Zxe_cm3: 2850, Zxe_cm3_text: '2850（2850）', Zye_cm3: 951, Zye_cm3_text: '951（951）', Ae_cm2: 186.8, Ae_cm2_text: '186.8（186.8）',
      Zpx_cm3: 3120, Zpx_cm3_text: '3120', Zpy_cm3: 1440, Zpy_cm3_text: '1440',
      callName: 'H-400×400' },
    { series: 'HW', label: 'H-394×405×18×18', H: 394, B: 405, tw: 18, tf: 18, r: 22,
      A_cm2: 214.4, A_cm2_text: '214.4', unitWeightKgPerM: 168, unitWeightKgPerM_text: '168',
      Ix_cm4: 59700, Ix_cm4_text: '59700', Iy_cm4: 20000, Iy_cm4_text: '20000',
      ix_cm: 16.7, ix_cm_text: '16.7', iy_cm: 9.65, iy_cm_text: '9.65',
      Zx_cm3: 3030, Zx_cm3_text: '3030', Zy_cm3: 985, Zy_cm3_text: '985',
      ib_sn400: 10.9, ib_sn490: 10.9, ib_text: '10.9',
      eta_sn400: 5.90, eta_sn490: 5.90, eta_text: '5.90',
      lb_m_sn400: 10.5, lb_m_sn490: 7.60, lb_m_text: '10.5(7.60)',
      wtClassColumn: 'FB（FC）', wtClassBeam: 'FC（FC）',
      Zxe_cm3: 3030, Zxe_cm3_text: '3030（3030）', Zye_cm3: 985, Zye_cm3_text: '985（985）', Ae_cm2: 214.4, Ae_cm2_text: '214.4（214.4）',
      Zpx_cm3: 3390, Zpx_cm3_text: '3390', Zpy_cm3: 1510, Zpy_cm3_text: '1510',
      callName: 'H-400×400' },
    { series: 'HW', label: 'H-400×400×13×21', H: 400, B: 400, tw: 13, tf: 21, r: 22,
      A_cm2: 218.7, A_cm2_text: '218.7', unitWeightKgPerM: 172, unitWeightKgPerM_text: '172',
      Ix_cm4: 66600, Ix_cm4_text: '66600', Iy_cm4: 22400, Iy_cm4_text: '22400',
      ix_cm: 17.5, ix_cm_text: '17.5', iy_cm: 10.1, iy_cm_text: '10.1',
      Zx_cm3: 3330, Zx_cm3_text: '3330', Zy_cm3: 1120, Zy_cm3_text: '1120',
      ib_sn400: 11.0, ib_sn490: 11.0, ib_text: '11.0',
      eta_sn400: 5.25, eta_sn490: 5.25, eta_text: '5.25',
      lb_m_sn400: 11.9, lb_m_sn490: 8.63, lb_m_text: '11.9(8.63)',
      wtClassColumn: 'FB（FB）', wtClassBeam: 'FB（FC）',
      Zxe_cm3: 3330, Zxe_cm3_text: '3330（3330）', Zye_cm3: 1120, Zye_cm3_text: '1120（1120）', Ae_cm2: 218.7, Ae_cm2_text: '218.7（218.7）',
      Zpx_cm3: 3670, Zpx_cm3_text: '3670', Zpy_cm3: 1700, Zpy_cm3_text: '1700',
      callName: 'H-400×400' },
    { series: 'HW', label: 'H-400×408×21×21', H: 400, B: 408, tw: 21, tf: 21, r: 22,
      A_cm2: 250.7, A_cm2_text: '250.7', unitWeightKgPerM: 197, unitWeightKgPerM_text: '197',
      Ix_cm4: 70900, Ix_cm4_text: '70900', Iy_cm4: 23800, Iy_cm4_text: '23800',
      ix_cm: 16.8, ix_cm_text: '16.8', iy_cm: 9.75, iy_cm_text: '9.75',
      Zx_cm3: 3540, Zx_cm3_text: '3540', Zy_cm3: 1170, Zy_cm3_text: '1170',
      ib_sn400: 11.1, ib_sn490: 11.1, ib_text: '11.1',
      eta_sn400: 5.16, eta_sn490: 5.16, eta_text: '5.16',
      lb_m_sn400: 12.2, lb_m_sn490: 8.80, lb_m_text: '12.2(8.80)',
      wtClassColumn: 'FB（FB）', wtClassBeam: 'FB（FC）',
      Zxe_cm3: 3540, Zxe_cm3_text: '3540（3540）', Zye_cm3: 1170, Zye_cm3_text: '1170（1170）', Ae_cm2: 250.7, Ae_cm2_text: '250.7（250.7）',
      Zpx_cm3: 3990, Zpx_cm3_text: '3990', Zpy_cm3: 1790, Zpy_cm3_text: '1790',
      callName: 'H-400×400' },
    { series: 'HW', label: 'H-406×403×16×24', H: 406, B: 403, tw: 16, tf: 24, r: 22,
      A_cm2: 254.9, A_cm2_text: '254.9', unitWeightKgPerM: 200, unitWeightKgPerM_text: '200',
      Ix_cm4: 78000, Ix_cm4_text: '78000', Iy_cm4: 26200, Iy_cm4_text: '26200',
      ix_cm: 17.5, ix_cm_text: '17.5', iy_cm: 10.1, iy_cm_text: '10.1',
      Zx_cm3: 3840, Zx_cm3_text: '3840', Zy_cm3: 1300, Zy_cm3_text: '1300',
      ib_sn400: 11.1, ib_sn490: 11.1, ib_text: '11.1',
      eta_sn400: 4.67, eta_sn490: 4.67, eta_text: '4.67',
      lb_m_sn400: 13.5, lb_m_sn490: 9.79, lb_m_text: '13.5(9.79)',
      wtClassColumn: 'FA（FB）', wtClassBeam: 'FA（FB）',
      Zxe_cm3: 3840, Zxe_cm3_text: '3840（3840）', Zye_cm3: 1300, Zye_cm3_text: '1300（1300）', Ae_cm2: 254.9, Ae_cm2_text: '254.9（254.9）',
      Zpx_cm3: 4280, Zpx_cm3_text: '4280', Zpy_cm3: 1980, Zpy_cm3_text: '1980',
      callName: 'H-400×400' },
    { series: 'HW', label: 'H-414×405×18×28', H: 414, B: 405, tw: 18, tf: 28, r: 22,
      A_cm2: 295.4, A_cm2_text: '295.4', unitWeightKgPerM: 232, unitWeightKgPerM_text: '232',
      Ix_cm4: 92800, Ix_cm4_text: '92800', Iy_cm4: 31000, Iy_cm4_text: '31000',
      ix_cm: 17.7, ix_cm_text: '17.7', iy_cm: 10.2, iy_cm_text: '10.2',
      Zx_cm3: 4480, Zx_cm3_text: '4480', Zy_cm3: 1530, Zy_cm3_text: '1530',
      ib_sn400: 11.2, ib_sn490: 11.2, ib_text: '11.2',
      eta_sn400: 4.10, eta_sn490: 4.10, eta_text: '4.10',
      lb_m_sn400: 15.6, lb_m_sn490: 11.3, lb_m_text: '15.6(11.3)',
      wtClassColumn: 'FA（FA）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 4480, Zxe_cm3_text: '4480（4480）', Zye_cm3: 1530, Zye_cm3_text: '1530（1530）', Ae_cm2: 295.4, Ae_cm2_text: '295.4（295.4）',
      Zpx_cm3: 5030, Zpx_cm3_text: '5030', Zpy_cm3: 2330, Zpy_cm3_text: '2330',
      callName: 'H-400×400' },
    { series: 'HW', label: 'H-428×407×20×35', H: 428, B: 407, tw: 20, tf: 35, r: 22,
      A_cm2: 360.7, A_cm2_text: '360.7', unitWeightKgPerM: 283, unitWeightKgPerM_text: '283',
      Ix_cm4: 119000, Ix_cm4_text: '119000', Iy_cm4: 39400, Iy_cm4_text: '39400',
      ix_cm: 18.2, ix_cm_text: '18.2', iy_cm: 10.4, iy_cm_text: '10.4',
      Zx_cm3: 5570, Zx_cm3_text: '5570', Zy_cm3: 1930, Zy_cm3_text: '1930',
      ib_sn400: 11.4, ib_sn490: 11.4, ib_text: '11.4',
      eta_sn400: 3.42, eta_sn490: 3.42, eta_text: '3.42',
      lb_m_sn400: 18.9, lb_m_sn490: 13.7, lb_m_text: '18.9(13.7)',
      wtClassColumn: 'FA（FA）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 5570, Zxe_cm3_text: '5570（5570）', Zye_cm3: 1930, Zye_cm3_text: '1930（1930）', Ae_cm2: 360.7, Ae_cm2_text: '360.7（360.7）',
      Zpx_cm3: 6310, Zpx_cm3_text: '6310', Zpy_cm3: 2940, Zpy_cm3_text: '2940',
      callName: 'H-400×400' },
    { series: 'HW', label: 'H-458×417×30×50', H: 458, B: 417, tw: 30, tf: 50, r: 22,
      A_cm2: 528.6, A_cm2_text: '528.6', unitWeightKgPerM: 415, unitWeightKgPerM_text: '415',
      Ix_cm4: 187000, Ix_cm4_text: '187000', Iy_cm4: 60500, Iy_cm4_text: '60500',
      ix_cm: 18.8, ix_cm_text: '18.8', iy_cm: 10.7, iy_cm_text: '10.7',
      Zx_cm3: 8170, Zx_cm3_text: '8170', Zy_cm3: 2900, Zy_cm3_text: '2900',
      ib_sn400: 11.8, ib_sn490: 11.8, ib_text: '11.8',
      eta_sn400: 2.58, eta_sn490: 2.58, eta_text: '2.58',
      lb_m_sn400: 25.9, lb_m_sn490: 18.7, lb_m_text: '25.9(18.7)',
      wtClassColumn: 'FA（FA）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 8170, Zxe_cm3_text: '8170（8170）', Zye_cm3: 2900, Zye_cm3_text: '2900（2900）', Ae_cm2: 528.6, Ae_cm2_text: '528.6（528.6）',
      Zpx_cm3: 9540, Zpx_cm3_text: '9540', Zpy_cm3: 4440, Zpy_cm3_text: '4440',
      callName: 'H-400×400' },
    { series: 'HW', label: 'H-498×432×45×70', H: 498, B: 432, tw: 45, tf: 70, r: 22,
      A_cm2: 770.1, A_cm2_text: '770.1', unitWeightKgPerM: 605, unitWeightKgPerM_text: '605',
      // Ix は旧版 29800(桁落ち)。ix 19.7 cm・A 770.1 cm² から Ix = ix²·A ≒ 298,900、Zx 12000 × H/2 24.9 cm ≒ 298,800 で、298000 が正
      Ix_cm4: 298000, Ix_cm4_text: '298000', Iy_cm4: 94400, Iy_cm4_text: '94400',
      ix_cm: 19.7, ix_cm_text: '19.7', iy_cm: 11.1, iy_cm_text: '11.1',
      Zx_cm3: 12000, Zx_cm3_text: '12000', Zy_cm3: 4370, Zy_cm3_text: '4370',
      ib_sn400: 12.3, ib_sn490: 12.3, ib_text: '12.3',
      eta_sn400: 2.03, eta_sn490: 2.03, eta_text: '2.03',
      lb_m_sn400: 34.5, lb_m_sn490: 24.9, lb_m_text: '34.5(24.9)',
      wtClassColumn: 'FA（FA）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 12000, Zxe_cm3_text: '12000（12000）', Zye_cm3: 4370, Zye_cm3_text: '4370（4370）', Ae_cm2: 770.1, Ae_cm2_text: '770.1（770.1）',
      Zpx_cm3: 145000, Zpx_cm3_text: '145000', Zpy_cm3: 6720, Zpy_cm3_text: '6720',
      callName: 'H-400×400' },
    // HM（中幅）手入力データ
    { series: 'HM', label: 'H-148×100×6×9', H: 148, B: 100, tw: 6, tf: 9, r: 8,
      A_cm2: 26.35, A_cm2_text: '26.35', unitWeightKgPerM: 20.7, unitWeightKgPerM_text: '20.7',
      Ix_cm4: 1000, Ix_cm4_text: '1000', Iy_cm4: 150, Iy_cm4_text: '150',
      ix_cm: 6.17, ix_cm_text: '6.17', iy_cm: 2.39, iy_cm_text: '2.39',
      Zx_cm3: 135, Zx_cm3_text: '135', Zy_cm3: 30.1, Zy_cm3_text: '30.1',
      ib_sn400: 2.71, ib_sn490: 2.71, ib_text: '2.71',
      eta_sn400: 4.46, eta_sn490: 4.46, eta_text: '4.46',
      lb_m_sn400: 3.45, lb_m_sn490: 2.50, lb_m_text: '3.45(2.50)',
      wtClassColumn: 'FA（FA）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 135, Zxe_cm3_text: '135（135）', Zye_cm3: 30.1, Zye_cm3_text: '30.1（30.1）', Ae_cm2: 26.35, Ae_cm2_text: '26.35（26.35）',
      Zpx_cm3: 154, Zpx_cm3_text: '154', Zpy_cm3: 46.4, Zpy_cm3_text: '46.4',
      callName: 'H-150×100' },
    { series: 'HM', label: 'H-194×150×6×9', H: 194, B: 150, tw: 6, tf: 9, r: 8,
      A_cm2: 38.11, A_cm2_text: '38.11', unitWeightKgPerM: 29.9, unitWeightKgPerM_text: '29.9',
      Ix_cm4: 2630, Ix_cm4_text: '2630', Iy_cm4: 507, Iy_cm4_text: '507',
      ix_cm: 8.30, ix_cm_text: '8.30', iy_cm: 3.65, iy_cm_text: '3.65',
      Zx_cm3: 271, Zx_cm3_text: '271', Zy_cm3: 67.6, Zy_cm3_text: '67.6',
      ib_sn400: 4.09, ib_sn490: 4.09, ib_text: '4.09',
      eta_sn400: 5.87, eta_sn490: 5.87, eta_text: '5.87',
      lb_m_sn400: 3.95, lb_m_sn490: 2.86, lb_m_text: '3.95(2.86)',
      wtClassColumn: 'FA（FB）', wtClassBeam: 'FA（FB）',
      Zxe_cm3: 271, Zxe_cm3_text: '271（271）', Zye_cm3: 67.6, Zye_cm3_text: '67.6（67.6）', Ae_cm2: 38.11, Ae_cm2_text: '38.11（38.11）',
      Zpx_cm3: 301, Zpx_cm3_text: '301', Zpy_cm3: 103, Zpy_cm3_text: '103',
      callName: 'H-200×150' },
    { series: 'HM', label: 'H-244×175×7×11', H: 244, B: 175, tw: 7, tf: 11, r: 13,
      A_cm2: 55.49, A_cm2_text: '55.49', unitWeightKgPerM: 43.6, unitWeightKgPerM_text: '43.6',
      Ix_cm4: 6040, Ix_cm4_text: '6040', Iy_cm4: 984, Iy_cm4_text: '984',
      ix_cm: 10.4, ix_cm_text: '10.4', iy_cm: 4.21, iy_cm_text: '4.21',
      Zx_cm3: 495, Zx_cm3_text: '495', Zy_cm3: 112, Zy_cm3_text: '112',
      ib_sn400: 4.72, ib_sn490: 4.72, ib_text: '4.72',
      eta_sn400: 5.99, eta_sn490: 5.99, eta_text: '5.99',
      lb_m_sn400: 4.48, lb_m_sn490: 3.24, lb_m_text: '4.48(3.24)',
      wtClassColumn: 'FA（FA）', wtClassBeam: 'FA（FB）',
      Zxe_cm3: 495, Zxe_cm3_text: '495（495）', Zye_cm3: 112, Zye_cm3_text: '112（112）', Ae_cm2: 55.49, Ae_cm2_text: '55.49（55.49）',
      Zpx_cm3: 550, Zpx_cm3_text: '550', Zpy_cm3: 172, Zpy_cm3_text: '172',
      callName: 'H-250×175' },
    { series: 'HM', label: 'H-294×200×8×12', H: 294, B: 200, tw: 8, tf: 12, r: 13,
      A_cm2: 71.05, A_cm2_text: '71.05', unitWeightKgPerM: 55.8, unitWeightKgPerM_text: '55.8',
      Ix_cm4: 11100, Ix_cm4_text: '11100', Iy_cm4: 1600, Iy_cm4_text: '1600',
      ix_cm: 12.5, ix_cm_text: '12.5', iy_cm: 4.75, iy_cm_text: '4.75',
      Zx_cm3: 756, Zx_cm3_text: '756', Zy_cm3: 160, Zy_cm3_text: '160',
      ib_sn400: 5.38, ib_sn490: 5.38, ib_text: '5.38',
      eta_sn400: 6.59, eta_sn490: 6.59, eta_text: '6.59',
      lb_m_sn400: 4.64, lb_m_sn490: 3.35, lb_m_text: '4.64(3.35)',
      wtClassColumn: 'FA（FB）', wtClassBeam: 'FA（FB）',
      Zxe_cm3: 756, Zxe_cm3_text: '756（756）', Zye_cm3: 160, Zye_cm3_text: '160（160）', Ae_cm2: 71.05, Ae_cm2_text: '71.05（71.05）',
      Zpx_cm3: 842, Zpx_cm3_text: '842', Zpy_cm3: 245, Zpy_cm3_text: '245',
      callName: 'H-300×200' },
    { series: 'HM', label: 'H-298×201×9×14', H: 298, B: 201, tw: 9, tf: 14, r: 13,
      A_cm2: 82.03, A_cm2_text: '82.03', unitWeightKgPerM: 64.4, unitWeightKgPerM_text: '64.4',
      Ix_cm4: 13100, Ix_cm4_text: '13100', Iy_cm4: 1900, Iy_cm4_text: '1900',
      ix_cm: 12.6, ix_cm_text: '12.6', iy_cm: 4.81, iy_cm_text: '4.81',
      Zx_cm3: 878, Zx_cm3_text: '878', Zy_cm3: 189, Zy_cm3_text: '189',
      ib_sn400: 5.44, ib_sn490: 5.44, ib_text: '5.44',
      eta_sn400: 5.76, eta_sn490: 5.76, eta_text: '5.76',
      lb_m_sn400: 5.36, lb_m_sn490: 3.88, lb_m_text: '5.36(3.88)',
      wtClassColumn: 'FA（FA）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 878, Zxe_cm3_text: '878（878）', Zye_cm3: 189, Zye_cm3_text: '189（189）', Ae_cm2: 82.03, Ae_cm2_text: '82.03（82.03）',
      Zpx_cm3: 982, Zpx_cm3_text: '982', Zpy_cm3: 289, Zpy_cm3_text: '289',
      callName: 'H-300×200' },
    { series: 'HM', label: 'H-336×249×8×12', H: 336, B: 249, tw: 8, tf: 12, r: 13,
      A_cm2: 86.17, A_cm2_text: '86.17', unitWeightKgPerM: 67.6, unitWeightKgPerM_text: '67.6',
      Ix_cm4: 18100, Ix_cm4_text: '18100', Iy_cm4: 3090, Iy_cm4_text: '3090',
      ix_cm: 14.5, ix_cm_text: '14.5', iy_cm: 5.99, iy_cm_text: '5.99',
      Zx_cm3: 1070, Zx_cm3_text: '1070', Zy_cm3: 248, Zy_cm3_text: '248',
      ib_sn400: 6.73, ib_sn490: 6.73, ib_text: '6.73',
      eta_sn400: 7.56, eta_sn490: 7.56, eta_text: '7.56',
      lb_m_sn400: 5.05, lb_m_sn490: 3.65, lb_m_text: '5.05(3.65)',
      wtClassColumn: 'FB（FC）', wtClassBeam: 'FB（FC）',
      Zxe_cm3: 1070, Zxe_cm3_text: '1070（1070）', Zye_cm3: 248, Zye_cm3_text: '248（248）', Ae_cm2: 86.17, Ae_cm2_text: '86.17（86.17）',
      Zpx_cm3: 1190, Zpx_cm3_text: '1190', Zpy_cm3: 378, Zpy_cm3_text: '378',
      callName: 'H-350×250' },
    { series: 'HM', label: 'H-340×250×9×14', H: 340, B: 250, tw: 9, tf: 14, r: 13,
      A_cm2: 99.53, A_cm2_text: '99.53', unitWeightKgPerM: 78.1, unitWeightKgPerM_text: '78.1',
      Ix_cm4: 21200, Ix_cm4_text: '21200', Iy_cm4: 3650, Iy_cm4_text: '3650',
      ix_cm: 14.6, ix_cm_text: '14.6', iy_cm: 6.05, iy_cm_text: '6.05',
      Zx_cm3: 1250, Zx_cm3_text: '1250', Zy_cm3: 292, Zy_cm3_text: '292',
      ib_sn400: 6.79, ib_sn490: 6.79, ib_text: '6.79',
      eta_sn400: 6.60, eta_sn490: 6.60, eta_text: '6.60',
      lb_m_sn400: 5.85, lb_m_sn490: 4.23, lb_m_text: '5.85(4.23)',
      wtClassColumn: 'FA（FB）', wtClassBeam: 'FA（FB）',
      Zxe_cm3: 1250, Zxe_cm3_text: '1250（1250）', Zye_cm3: 292, Zye_cm3_text: '292（292）', Ae_cm2: 99.53, Ae_cm2_text: '99.53（99.53）',
      Zpx_cm3: 1380, Zpx_cm3_text: '1380', Zpy_cm3: 445, Zpy_cm3_text: '445',
      callName: 'H-350×250' },
    { series: 'HM', label: 'H-386×299×9×14', H: 386, B: 299, tw: 9, tf: 14, r: 13,
      A_cm2: 117.4, A_cm2_text: '117.4', unitWeightKgPerM: 92.2, unitWeightKgPerM_text: '92.2',
      Ix_cm4: 32900, Ix_cm4_text: '32900', Iy_cm4: 6240, Iy_cm4_text: '6240',
      ix_cm: 16.7, ix_cm_text: '16.7', iy_cm: 7.29, iy_cm_text: '7.29',
      Zx_cm3: 1700, Zx_cm3_text: '1700', Zy_cm3: 417, Zy_cm3_text: '417',
      ib_sn400: 8.14, ib_sn490: 8.14, ib_text: '8.14',
      eta_sn400: 7.50, eta_sn490: 7.50, eta_text: '7.50',
      lb_m_sn400: 6.16, lb_m_sn490: 4.45, lb_m_text: '6.16(4.45)',
      wtClassColumn: 'FB（FC）', wtClassBeam: 'FB（FC）',
      Zxe_cm3: 1700, Zxe_cm3_text: '1700（1700）', Zye_cm3: 417, Zye_cm3_text: '417（417）', Ae_cm2: 117.4, Ae_cm2_text: '117.4（117.4）',
      Zpx_cm3: 1870, Zpx_cm3_text: '1870', Zpy_cm3: 634, Zpy_cm3_text: '634',
      callName: 'H-400×300' },
    { series: 'HM', label: 'H-390×300×10×16', H: 390, B: 300, tw: 10, tf: 16, r: 13,
      A_cm2: 133.3, A_cm2_text: '133.3', unitWeightKgPerM: 105, unitWeightKgPerM_text: '105',
      Ix_cm4: 37900, Ix_cm4_text: '37900', Iy_cm4: 7200, Iy_cm4_text: '7200',
      ix_cm: 16.9, ix_cm_text: '16.9', iy_cm: 7.35, iy_cm_text: '7.35',
      Zx_cm3: 1940, Zx_cm3_text: '1940', Zy_cm3: 480, Zy_cm3_text: '480',
      ib_sn400: 8.19, ib_sn490: 8.19, ib_text: '8.19',
      eta_sn400: 6.66, eta_sn490: 6.66, eta_text: '6.66',
      lb_m_sn400: 6.99, lb_m_sn490: 5.06, lb_m_text: '6.99(5.06)',
      wtClassColumn: 'FA（FB）', wtClassBeam: 'FB（FC）',
      Zxe_cm3: 1940, Zxe_cm3_text: '1940（1940）', Zye_cm3: 480, Zye_cm3_text: '480（480）', Ae_cm2: 133.3, Ae_cm2_text: '133.3（133.3）',
      Zpx_cm3: 2140, Zpx_cm3_text: '2140', Zpy_cm3: 730, Zpy_cm3_text: '730',
      callName: 'H-400×300' },
    { series: 'HM', label: 'H-434×299×10×15', H: 434, B: 299, tw: 10, tf: 15, r: 13,
      A_cm2: 131.6, A_cm2_text: '131.6', unitWeightKgPerM: 103, unitWeightKgPerM_text: '103',
      Ix_cm4: 45500, Ix_cm4_text: '45500', Iy_cm4: 6690, Iy_cm4_text: '6690',
      ix_cm: 18.6, ix_cm_text: '18.6', iy_cm: 7.13, iy_cm_text: '7.13',
      Zx_cm3: 2090, Zx_cm3_text: '2090', Zy_cm3: 447, Zy_cm3_text: '447',
      ib_sn400: 8.07, ib_sn490: 8.07, ib_text: '8.07',
      eta_sn400: 7.81, eta_sn490: 7.81, eta_text: '7.81',
      lb_m_sn400: 5.87, lb_m_sn490: 4.24, lb_m_text: '5.87(4.24)',
      wtClassColumn: 'FB（FC）', wtClassBeam: 'FB（FC）',
      Zxe_cm3: 2090, Zxe_cm3_text: '2090（2090）', Zye_cm3: 447, Zye_cm3_text: '447（447）', Ae_cm2: 131.6, Ae_cm2_text: '131.6（131.6）',
      Zpx_cm3: 2320, Zpx_cm3_text: '2320', Zpy_cm3: 682, Zpy_cm3_text: '682',
      callName: 'H-450×300' },
    { series: 'HM', label: 'H-440×300×11×18', H: 440, B: 300, tw: 11, tf: 18, r: 13,
      A_cm2: 153.9, A_cm2_text: '153.9', unitWeightKgPerM: 121, unitWeightKgPerM_text: '121',
      Ix_cm4: 54700, Ix_cm4_text: '54700', Iy_cm4: 8110, Iy_cm4_text: '8110',
      ix_cm: 18.9, ix_cm_text: '18.9', iy_cm: 7.26, iy_cm_text: '7.26',
      Zx_cm3: 2490, Zx_cm3_text: '2490', Zy_cm3: 540, Zy_cm3_text: '540',
      ib_sn400: 8.16, ib_sn490: 8.16, ib_text: '8.16',
      eta_sn400: 6.65, eta_sn490: 6.65, eta_text: '6.65',
      lb_m_sn400: 6.97, lb_m_sn490: 5.04, lb_m_text: '6.97(5.04)',
      wtClassColumn: 'FA（FB）', wtClassBeam: 'FA（FB）',
      Zxe_cm3: 2490, Zxe_cm3_text: '2490（2490）', Zye_cm3: 540, Zye_cm3_text: '540（540）', Ae_cm2: 153.9, Ae_cm2_text: '153.9（153.9）',
      Zpx_cm3: 2760, Zpx_cm3_text: '2760', Zpy_cm3: 823, Zpy_cm3_text: '823',
      callName: 'H-450×300' },
    { series: 'HM', label: 'H-446×302×13×21', H: 446, B: 302, tw: 13, tf: 21, r: 13,
      A_cm2: 180.8, A_cm2_text: '180.8', unitWeightKgPerM: 142, unitWeightKgPerM_text: '142',
      Ix_cm4: 65000, Ix_cm4_text: '65000', Iy_cm4: 9650, Iy_cm4_text: '9650',
      ix_cm: 19.0, ix_cm_text: '19.0', iy_cm: 7.31, iy_cm_text: '7.31',
      Zx_cm3: 2920, Zx_cm3_text: '2920', Zy_cm3: 639, Zy_cm3_text: '639',
      ib_sn400: 8.24, ib_sn490: 8.24, ib_text: '8.24',
      eta_sn400: 5.79, eta_sn490: 5.79, eta_text: '5.79',
      lb_m_sn400: 8.08, lb_m_sn490: 5.84, lb_m_text: '8.08(5.84)',
      wtClassColumn: 'FA（FA）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 2920, Zxe_cm3_text: '2920（2920）', Zye_cm3: 639, Zye_cm3_text: '639（639）', Ae_cm2: 180.8, Ae_cm2_text: '180.8（180.8）',
      Zpx_cm3: 3250, Zpx_cm3_text: '3250', Zpy_cm3: 976, Zpy_cm3_text: '976',
      callName: 'H-450×300' },
    { series: 'HM', label: 'H-482×300×11×15', H: 482, B: 300, tw: 11, tf: 15, r: 13,
      A_cm2: 141.2, A_cm2_text: '141.2', unitWeightKgPerM: 111, unitWeightKgPerM_text: '111',
      Ix_cm4: 58300, Ix_cm4_text: '58300', Iy_cm4: 6760, Iy_cm4_text: '6760',
      ix_cm: 20.3, ix_cm_text: '20.3', iy_cm: 6.92, iy_cm_text: '6.92',
      Zx_cm3: 2420, Zx_cm3_text: '2420', Zy_cm3: 450, Zy_cm3_text: '450',
      ib_sn400: 7.99, ib_sn490: 7.99, ib_text: '7.99',
      eta_sn400: 8.56, eta_sn490: 8.56, eta_text: '8.56',
      lb_m_sn400: 5.30, lb_m_sn490: 3.83, lb_m_text: '5.30(3.83)',
      wtClassColumn: 'FB（FD）', wtClassBeam: 'FB（FC）',
      Zxe_cm3: 2420, Zxe_cm3_text: '2420（2420）', Zye_cm3: 450, Zye_cm3_text: '450（450）', Ae_cm2: 141.2, Ae_cm2_text: '141.2（141.2）',
      Zpx_cm3: 2700, Zpx_cm3_text: '2700', Zpy_cm3: 690, Zpy_cm3_text: '690',
      callName: 'H-500×300' },
    { series: 'HM', label: 'H-488×300×11×18', H: 488, B: 300, tw: 11, tf: 18, r: 13,
      A_cm2: 159.2, A_cm2_text: '159.2', unitWeightKgPerM: 125, unitWeightKgPerM_text: '125',
      Ix_cm4: 68900, Ix_cm4_text: '68900', Iy_cm4: 8110, Iy_cm4_text: '8110',
      ix_cm: 20.8, ix_cm_text: '20.8', iy_cm: 7.14, iy_cm_text: '7.14',
      Zx_cm3: 2820, Zx_cm3_text: '2820', Zy_cm3: 540, Zy_cm3_text: '540',
      ib_sn400: 8.10, ib_sn490: 8.10, ib_text: '8.10',
      eta_sn400: 7.32, eta_sn490: 7.32, eta_text: '7.32',
      lb_m_sn400: 6.29, lb_m_sn490: 4.55, lb_m_text: '6.29(4.55)',
      wtClassColumn: 'FA（FD）', wtClassBeam: 'FA（FB）',
      Zxe_cm3: 2820, Zxe_cm3_text: '2820（2820）', Zye_cm3: 540, Zye_cm3_text: '540（540）', Ae_cm2: 159.2, Ae_cm2_text: '159.2（159.2）',
      Zpx_cm3: 3130, Zpx_cm3_text: '3130', Zpy_cm3: 825, Zpy_cm3_text: '825',
      callName: 'H-500×300' },
    { series: 'HM', label: 'H-494×302×13×21', H: 494, B: 302, tw: 13, tf: 21, r: 13,
      A_cm2: 187.1, A_cm2_text: '187.1', unitWeightKgPerM: 147, unitWeightKgPerM_text: '147',
      Ix_cm4: 81700, Ix_cm4_text: '81700', Iy_cm4: 9650, Iy_cm4_text: '9650',
      ix_cm: 20.9, ix_cm_text: '20.9', iy_cm: 7.18, iy_cm_text: '7.18',
      Zx_cm3: 3310, Zx_cm3_text: '3310', Zy_cm3: 639, Zy_cm3_text: '639',
      ib_sn400: 8.18, ib_sn490: 8.18, ib_text: '8.18',
      eta_sn400: 6.37, eta_sn490: 6.37, eta_text: '6.37',
      lb_m_sn400: 7.29, lb_m_sn490: 5.27, lb_m_text: '7.29(5.27)',
      wtClassColumn: 'FA（FA）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 3310, Zxe_cm3_text: '3310（3310）', Zye_cm3: 639, Zye_cm3_text: '639（639）', Ae_cm2: 187.1, Ae_cm2_text: '187.1（187.1）',
      Zpx_cm3: 3700, Zpx_cm3_text: '3700', Zpy_cm3: 978, Zpy_cm3_text: '978',
      callName: 'H-500×300' },
    { series: 'HM', label: 'H-582×300×12×17', H: 582, B: 300, tw: 12, tf: 17, r: 13,
      A_cm2: 169.2, A_cm2_text: '169.2', unitWeightKgPerM: 133, unitWeightKgPerM_text: '133',
      Ix_cm4: 98900, Ix_cm4_text: '98900', Iy_cm4: 7660, Iy_cm4_text: '7660',
      ix_cm: 24.2, ix_cm_text: '24.2', iy_cm: 6.73, iy_cm_text: '6.73',
      Zx_cm3: 3400, Zx_cm3_text: '3400', Zy_cm3: 511, Zy_cm3_text: '511',
      ib_sn400: 7.90, ib_sn490: 7.90, ib_text: '7.90',
      eta_sn400: 9.01, eta_sn490: 9.01, eta_text: '9.01',
      lb_m_sn400: 4.98, lb_m_sn490: 3.60, lb_m_text: '4.98(3.60)',
      wtClassColumn: 'FC（FD）', wtClassBeam: 'FA（FB）',
      Zxe_cm3: 3400, Zxe_cm3_text: '3400（3400）', Zye_cm3: 511, Zye_cm3_text: '511（511）', Ae_cm2: 169.2, Ae_cm2_text: '169.2（165.3）',
      Zpx_cm3: 3820, Zpx_cm3_text: '3820', Zpy_cm3: 786, Zpy_cm3_text: '786',
      callName: 'H-600×300' },
    { series: 'HM', label: 'H-588×300×12×20', H: 588, B: 300, tw: 12, tf: 20, r: 13,
      A_cm2: 187.2, A_cm2_text: '187.2', unitWeightKgPerM: 147, unitWeightKgPerM_text: '147',
      Ix_cm4: 114000, Ix_cm4_text: '114000', Iy_cm4: 9010, Iy_cm4_text: '9010',
      ix_cm: 24.7, ix_cm_text: '24.7', iy_cm: 6.94, iy_cm_text: '6.94',
      Zx_cm3: 3890, Zx_cm3_text: '3890', Zy_cm3: 601, Zy_cm3_text: '601',
      ib_sn400: 8.01, ib_sn490: 8.01, ib_text: '8.01',
      eta_sn400: 7.85, eta_sn490: 7.85, eta_text: '7.85',
      lb_m_sn400: 5.80, lb_m_sn490: 4.19, lb_m_text: '5.80(4.19)',
      wtClassColumn: 'FC（FD）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 3890, Zxe_cm3_text: '3890（3890）', Zye_cm3: 601, Zye_cm3_text: '601（601）', Ae_cm2: 187.2, Ae_cm2_text: '187.2（183.3）',
      Zpx_cm3: 4350, Zpx_cm3_text: '4350', Zpy_cm3: 921, Zpy_cm3_text: '921',
      callName: 'H-600×300' },
    { series: 'HM', label: 'H-594×302×14×23', H: 594, B: 302, tw: 14, tf: 23, r: 13,
      A_cm2: 217.1, A_cm2_text: '217.1', unitWeightKgPerM: 170, unitWeightKgPerM_text: '170',
      Ix_cm4: 134000, Ix_cm4_text: '134000', Iy_cm4: 10600, Iy_cm4_text: '10600',
      ix_cm: 24.8, ix_cm_text: '24.8', iy_cm: 6.98, iy_cm_text: '6.98',
      Zx_cm3: 4500, Zx_cm3_text: '4500', Zy_cm3: 700, Zy_cm3_text: '700',
      ib_sn400: 8.08, ib_sn490: 8.08, ib_text: '8.08',
      eta_sn400: 6.91, eta_sn490: 6.91, eta_text: '6.91',
      lb_m_sn400: 6.64, lb_m_sn490: 4.80, lb_m_text: '6.64(4.80)',
      wtClassColumn: 'FA（FC）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 4500, Zxe_cm3_text: '4500（4500）', Zye_cm3: 700, Zye_cm3_text: '700（700）', Ae_cm2: 217.1, Ae_cm2_text: '217.1（217.1）',
      Zpx_cm3: 5060, Zpx_cm3_text: '5060', Zpy_cm3: 1080, Zpy_cm3_text: '1080',
      callName: 'H-600×300' },
    { series: 'HM', label: 'H-692×300×13×20', H: 692, B: 300, tw: 13, tf: 20, r: 18,
      A_cm2: 207.5, A_cm2_text: '207.5', unitWeightKgPerM: 163, unitWeightKgPerM_text: '163',
      Ix_cm4: 168000, Ix_cm4_text: '168000', Iy_cm4: 9020, Iy_cm4_text: '9020',
      ix_cm: 28.5, ix_cm_text: '28.5', iy_cm: 6.59, iy_cm_text: '6.59',
      Zx_cm3: 4870, Zx_cm3_text: '4870', Zy_cm3: 601, Zy_cm3_text: '601',
      ib_sn400: 7.81, ib_sn490: 7.81, ib_text: '7.81',
      eta_sn400: 9.01, eta_sn490: 9.01, eta_text: '9.01',
      lb_m_sn400: 4.93, lb_m_sn490: 3.56, lb_m_text: '4.93(3.56)',
      wtClassColumn: 'FD（FD）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 4870, Zxe_cm3_text: '4870（4870）', Zye_cm3: 601, Zye_cm3_text: '601（601）', Ae_cm2: 207.5, Ae_cm2_text: '207.5（196.4）',
      Zpx_cm3: 5500, Zpx_cm3_text: '5500', Zpy_cm3: 930, Zpy_cm3_text: '930',
      callName: 'H-700×300' },
    { series: 'HM', label: 'H-700×300×13×24', H: 700, B: 300, tw: 13, tf: 24, r: 18,
      A_cm2: 231.5, A_cm2_text: '231.5', unitWeightKgPerM: 182, unitWeightKgPerM_text: '182',
      Ix_cm4: 197000, Ix_cm4_text: '197000', Iy_cm4: 10800, Iy_cm4_text: '10800',
      ix_cm: 29.2, ix_cm_text: '29.2', iy_cm: 6.83, iy_cm_text: '6.83',
      Zx_cm3: 5640, Zx_cm3_text: '5640', Zy_cm3: 721, Zy_cm3_text: '721',
      ib_sn400: 7.95, ib_sn490: 7.95, ib_text: '7.95',
      eta_sn400: 7.73, eta_sn490: 7.73, eta_text: '7.73',
      lb_m_sn400: 5.84, lb_m_sn490: 4.23, lb_m_text: '5.84(4.23)',
      wtClassColumn: 'FD（FD）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 5640, Zxe_cm3_text: '5640（5640）', Zye_cm3: 721, Zye_cm3_text: '721（721）', Ae_cm2: 231.5, Ae_cm2_text: '231.5（220.4）',
      Zpx_cm3: 6340, Zpx_cm3_text: '6340', Zpy_cm3: 1110, Zpy_cm3_text: '1110',
      callName: 'H-700×300' },
    { series: 'HM', label: 'H-708×302×15×28', H: 708, B: 302, tw: 15, tf: 28, r: 18,
      A_cm2: 269.7, A_cm2_text: '269.7', unitWeightKgPerM: 212, unitWeightKgPerM_text: '212',
      Ix_cm4: 233000, Ix_cm4_text: '233000', Iy_cm4: 12900, Iy_cm4_text: '12900',
      ix_cm: 29.4, ix_cm_text: '29.4', iy_cm: 6.91, iy_cm_text: '6.91',
      Zx_cm3: 6590, Zx_cm3_text: '6590', Zy_cm3: 853, Zy_cm3_text: '853',
      ib_sn400: 8.04, ib_sn490: 8.04, ib_text: '8.04',
      eta_sn400: 6.73, eta_sn490: 6.73, eta_text: '6.73',
      lb_m_sn400: 6.78, lb_m_sn490: 4.91, lb_m_text: '6.78(4.91)',
      wtClassColumn: 'FB（FD）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 6590, Zxe_cm3_text: '6590（6590）', Zye_cm3: 853, Zye_cm3_text: '853（853）', Ae_cm2: 269.7, Ae_cm2_text: '269.7（269.0）',
      Zpx_cm3: 7430, Zpx_cm3_text: '7430', Zpy_cm3: 1320, Zpy_cm3_text: '1320',
      callName: 'H-700×300' },
    { series: 'HM', label: 'H-792×300×14×22', H: 792, B: 300, tw: 14, tf: 22, r: 18,
      A_cm2: 239.5, A_cm2_text: '239.5', unitWeightKgPerM: 188, unitWeightKgPerM_text: '188',
      Ix_cm4: 248000, Ix_cm4_text: '248000', Iy_cm4: 9920, Iy_cm4_text: '9920',
      ix_cm: 32.2, ix_cm_text: '32.2', iy_cm: 6.44, iy_cm_text: '6.44',
      Zx_cm3: 6270, Zx_cm3_text: '6270', Zy_cm3: 661, Zy_cm3_text: '661',
      ib_sn400: 7.74, ib_sn490: 7.74, ib_text: '7.74',
      eta_sn400: 9.28, eta_sn490: 9.28, eta_text: '9.28',
      lb_m_sn400: 4.73, lb_m_sn490: 3.42, lb_m_text: '4.73(3.42)',
      wtClassColumn: 'FD（FD）', wtClassBeam: 'FA（FB）',
      Zxe_cm3: 6270, Zxe_cm3_text: '6270（6270）', Zye_cm3: 661, Zye_cm3_text: '661（661）', Ae_cm2: 239.5, Ae_cm2_text: '233.8（219.7）',
      Zpx_cm3: 7140, Zpx_cm3_text: '7140', Zpy_cm3: 1030, Zpy_cm3_text: '1030',
      callName: 'H-800×300' },
    { series: 'HM', label: 'H-800×300×14×26', H: 800, B: 300, tw: 14, tf: 26, r: 18,
      A_cm2: 263.5, A_cm2_text: '263.5', unitWeightKgPerM: 207, unitWeightKgPerM_text: '207',
      Ix_cm4: 286000, Ix_cm4_text: '286000', Iy_cm4: 11700, Iy_cm4_text: '11700',
      ix_cm: 33.0, ix_cm_text: '33.0', iy_cm: 6.67, iy_cm_text: '6.67',
      Zx_cm3: 7160, Zx_cm3_text: '7160', Zy_cm3: 781, Zy_cm3_text: '781',
      ib_sn400: 7.87, ib_sn490: 7.87, ib_text: '7.87',
      eta_sn400: 8.08, eta_sn490: 8.08, eta_text: '8.08',
      lb_m_sn400: 5.54, lb_m_sn490: 4.00, lb_m_text: '5.54(4.00)',
      wtClassColumn: 'FD（FD）', wtClassBeam: 'FA（FB）',
      Zxe_cm3: 7160, Zxe_cm3_text: '7160（7160）', Zye_cm3: 781, Zye_cm3_text: '781（781）', Ae_cm2: 263.5, Ae_cm2_text: '257.8（243.7）',
      Zpx_cm3: 8100, Zpx_cm3_text: '8100', Zpy_cm3: 1210, Zpy_cm3_text: '1210',
      callName: 'H-800×300' },
    { series: 'HM', label: 'H-808×303×16×30', H: 808, B: 303, tw: 16, tf: 30, r: 18,
      A_cm2: 303.7, A_cm2_text: '303.7', unitWeightKgPerM: 238, unitWeightKgPerM_text: '238',
      Ix_cm4: 334000, Ix_cm4_text: '334000', Iy_cm4: 13800, Iy_cm4_text: '13800',
      ix_cm: 33.2, ix_cm_text: '33.2', iy_cm: 6.74, iy_cm_text: '6.74',
      Zx_cm3: 8270, Zx_cm3_text: '8270', Zy_cm3: 914, Zy_cm3_text: '914',
      ib_sn400: 7.96, ib_sn490: 7.96, ib_text: '7.96',
      eta_sn400: 7.10, eta_sn490: 7.10, eta_text: '7.10',
      lb_m_sn400: 6.37, lb_m_sn490: 4.61, lb_m_text: '6.37(4.61)',
      wtClassColumn: 'FC（FD）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 8270, Zxe_cm3_text: '8270（8270）', Zye_cm3: 914, Zye_cm3_text: '914（914）', Ae_cm2: 303.7, Ae_cm2_text: '303.7（294.1）',
      Zpx_cm3: 9390, Zpx_cm3_text: '9390', Zpy_cm3: 1420, Zpy_cm3_text: '1420',
      callName: 'H-800×300' },
    { series: 'HM', label: 'H-816×303×17×34', H: 816, B: 303, tw: 17, tf: 34, r: 18,
      A_cm2: 336.0, A_cm2_text: '336.0', unitWeightKgPerM: 264, unitWeightKgPerM_text: '264',
      Ix_cm4: 378000, Ix_cm4_text: '378000', Iy_cm4: 15800, Iy_cm4_text: '15800',
      ix_cm: 33.6, ix_cm_text: '33.6', iy_cm: 6.86, iy_cm_text: '6.86',
      Zx_cm3: 9270, Zx_cm3_text: '9270', Zy_cm3: 1040, Zy_cm3_text: '1040',
      ib_sn400: 8.05, ib_sn490: 8.05, ib_text: '8.05',
      eta_sn400: 6.38, eta_sn490: 6.38, eta_text: '6.38',
      lb_m_sn400: 7.17, lb_m_sn490: 5.19, lb_m_text: '7.17(5.19)',
      wtClassColumn: 'FB（FD）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 9270, Zxe_cm3_text: '9270（9270）', Zye_cm3: 1040, Zye_cm3_text: '1040（1040）', Ae_cm2: 336.0, Ae_cm2_text: '336.0（332.8）',
      Zpx_cm3: 10500, Zpx_cm3_text: '10500', Zpy_cm3: 1620, Zpy_cm3_text: '1620',
      callName: 'H-800×300' },
    { series: 'HM', label: 'H-890×299×15×23', H: 890, B: 299, tw: 15, tf: 23, r: 18,
      A_cm2: 266.9, A_cm2_text: '266.9', unitWeightKgPerM: 210, unitWeightKgPerM_text: '210',
      Ix_cm4: 339000, Ix_cm4_text: '339000', Iy_cm4: 10300, Iy_cm4_text: '10300',
      ix_cm: 35.6, ix_cm_text: '35.6', iy_cm: 6.20, iy_cm_text: '6.20',
      Zx_cm3: 7610, Zx_cm3_text: '7610', Zy_cm3: 687, Zy_cm3_text: '687',
      ib_sn400: 7.59, ib_sn490: 7.59, ib_text: '7.59',
      eta_sn400: 9.83, eta_sn490: 9.83, eta_text: '9.83',
      lb_m_sn400: 4.39, lb_m_sn490: 3.17, lb_m_text: '4.39(3.17)',
      wtClassColumn: 'FD（FD）', wtClassBeam: 'FA（FC）',
      Zxe_cm3: 7610, Zxe_cm3_text: '7610（7610）', Zye_cm3: 687, Zye_cm3_text: '687（687）', Ae_cm2: 253.6, Ae_cm2_text: '253.6（237.5）',
      Zpx_cm3: 8750, Zpx_cm3_text: '8750', Zpy_cm3: 1080, Zpy_cm3_text: '1080',
      callName: 'H-900×300' },
    // HN（細幅）手入力データ
    { series: 'HN', label: 'H-150×75×5×7', H: 150, B: 75, tw: 5, tf: 7, r: 8,
      A_cm2: 17.85, A_cm2_text: '17.85', unitWeightKgPerM: 14.0, unitWeightKgPerM_text: '14.0',
      Ix_cm4: 666, Ix_cm4_text: '666', Iy_cm4: 49.5, Iy_cm4_text: '49.5',
      ix_cm: 6.11, ix_cm_text: '6.11', iy_cm: 1.66, iy_cm_text: '1.66',
      Zx_cm3: 88.8, Zx_cm3_text: '88.8', Zy_cm3: 13.2, Zy_cm3_text: '13.2',
      ib_sn400: 1.96, ib_sn490: 1.96, ib_text: '1.96',
      eta_sn400: 5.60, eta_sn490: 5.60, eta_text: '5.60',
      lb_m_sn400: 1.99, lb_m_sn490: 1.44, lb_m_text: '1.99(1.44)',
      wtClassColumn: 'FA', wtClassBeam: 'FA',
      Zxe_cm3: 88.8, Zxe_cm3_text: '88.8', Zye_cm3: 13.2, Zye_cm3_text: '13.2', Ae_cm2: 17.85, Ae_cm2_text: '17.85',
      Zpx_cm3: 102, Zpx_cm3_text: '102', Zpy_cm3: 20.8, Zpy_cm3_text: '20.8',
      callName: 'H-150×75' },
    { series: 'HN', label: 'H-175×90×5×8', H: 175, B: 90, tw: 5, tf: 8, r: 8,
      A_cm2: 22.90, A_cm2_text: '22.90', unitWeightKgPerM: 18.0, unitWeightKgPerM_text: '18.0',
      Ix_cm4: 1210, Ix_cm4_text: '1210', Iy_cm4: 97.5, Iy_cm4_text: '97.5',
      ix_cm: 7.26, ix_cm_text: '7.26', iy_cm: 2.06, iy_cm_text: '2.06',
      Zx_cm3: 138, Zx_cm3_text: '138', Zy_cm3: 21.7, Zy_cm3_text: '21.7',
      ib_sn400: 2.39, ib_sn490: 2.39, ib_text: '2.39',
      eta_sn400: 5.81, eta_sn490: 5.81, eta_text: '5.81',
      lb_m_sn400: 2.34, lb_m_sn490: 1.69, lb_m_text: '2.34(1.69)',
      wtClassColumn: 'FA', wtClassBeam: 'FA',
      Zxe_cm3: 138, Zxe_cm3_text: '138（138）', Zye_cm3: 21.7, Zye_cm3_text: '21.7（21.7）', Ae_cm2: 22.90, Ae_cm2_text: '22.90（22.90）',
      Zpx_cm3: 156, Zpx_cm3_text: '156', Zpy_cm3: 33.6, Zpy_cm3_text: '33.6',
      callName: 'H-175×90' },
    { series: 'HN', label: 'H-198×99×4.5×7', H: 198, B: 99, tw: 4.5, tf: 7, r: 8,
      A_cm2: 22.69, A_cm2_text: '22.69', unitWeightKgPerM: 17.8, unitWeightKgPerM_text: '17.8',
      Ix_cm4: 1540, Ix_cm4_text: '1540', Iy_cm4: 113, Iy_cm4_text: '113',
      ix_cm: 8.25, ix_cm_text: '8.25', iy_cm: 2.24, iy_cm_text: '2.24',
      Zx_cm3: 156, Zx_cm3_text: '156', Zy_cm3: 22.9, Zy_cm3_text: '22.9',
      ib_sn400: 2.60, ib_sn490: 2.60, ib_text: '2.60',
      eta_sn400: 7.43, eta_sn490: 7.43, eta_text: '7.43',
      lb_m_sn400: 1.99, lb_m_sn490: 1.44, lb_m_text: '1.99(1.44)',
      wtClassColumn: 'FA（FD）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 156, Zxe_cm3_text: '156（156）', Zye_cm3: 22.9, Zye_cm3_text: '22.9（22.9）', Ae_cm2: 22.69, Ae_cm2_text: '22.69（22.69）',
      Zpx_cm3: 175, Zpx_cm3_text: '175', Zpy_cm3: 35.5, Zpy_cm3_text: '35.5',
      callName: 'H-200×100' },
    { series: 'HN', label: 'H-200×100×5.5×8', H: 200, B: 100, tw: 5.5, tf: 8, r: 8,
      A_cm2: 26.67, A_cm2_text: '26.67', unitWeightKgPerM: 20.9, unitWeightKgPerM_text: '20.9',
      Ix_cm4: 1810, Ix_cm4_text: '1810', Iy_cm4: 134, Iy_cm4_text: '134',
      ix_cm: 8.23, ix_cm_text: '8.23', iy_cm: 2.24, iy_cm_text: '2.24',
      Zx_cm3: 181, Zx_cm3_text: '181', Zy_cm3: 26.7, Zy_cm3_text: '26.7',
      ib_sn400: 2.63, ib_sn490: 2.63, ib_text: '2.63',
      eta_sn400: 6.57, eta_sn490: 6.57, eta_text: '6.57',
      lb_m_sn400: 2.27, lb_m_sn490: 1.64, lb_m_text: '2.27(1.64)',
      wtClassColumn: 'FA', wtClassBeam: 'FA',
      Zxe_cm3: 181, Zxe_cm3_text: '181（181）', Zye_cm3: 26.7, Zye_cm3_text: '26.7（26.7）', Ae_cm2: 26.67, Ae_cm2_text: '26.67（26.67）',
      Zpx_cm3: 205, Zpx_cm3_text: '205', Zpy_cm3: 41.6, Zpy_cm3_text: '41.6',
      callName: 'H-200×100' },
    { series: 'HN', label: 'H-248×124×5×8', H: 248, B: 124, tw: 5, tf: 8, r: 8,
      A_cm2: 31.99, A_cm2_text: '31.99', unitWeightKgPerM: 25.1, unitWeightKgPerM_text: '25.1',
      Ix_cm4: 3450, Ix_cm4_text: '3450', Iy_cm4: 255, Iy_cm4_text: '255',
      ix_cm: 10.4, ix_cm_text: '10.4', iy_cm: 2.82, iy_cm_text: '2.82',
      Zx_cm3: 278, Zx_cm3_text: '278', Zy_cm3: 41.1, Zy_cm3_text: '41.1',
      ib_sn400: 3.27, ib_sn490: 3.27, ib_text: '3.27',
      eta_sn400: 8.19, eta_sn490: 8.19, eta_text: '8.19',
      lb_m_sn400: 2.27, lb_m_sn490: 1.64, lb_m_text: '2.27(1.64)',
      wtClassColumn: 'FC（FD）', wtClassBeam: 'FA（FB）',
      Zxe_cm3: 278, Zxe_cm3_text: '278（278）', Zye_cm3: 41.1, Zye_cm3_text: '41.1（41.1）', Ae_cm2: 31.99, Ae_cm2_text: '31.99（31.38）',
      Zpx_cm3: 312, Zpx_cm3_text: '312', Zpy_cm3: 63.2, Zpy_cm3_text: '63.2',
      callName: 'H-250×125' },
    { series: 'HN', label: 'H-250×125×6×9', H: 250, B: 125, tw: 6, tf: 9, r: 8,
      A_cm2: 36.97, A_cm2_text: '36.97', unitWeightKgPerM: 29.0, unitWeightKgPerM_text: '29.0',
      Ix_cm4: 3960, Ix_cm4_text: '3960', Iy_cm4: 294, Iy_cm4_text: '294',
      ix_cm: 10.4, ix_cm_text: '10.4', iy_cm: 2.82, iy_cm_text: '2.82',
      Zx_cm3: 317, Zx_cm3_text: '317', Zy_cm3: 47.0, Zy_cm3_text: '47.0',
      ib_sn400: 3.30, ib_sn490: 3.30, ib_text: '3.30',
      eta_sn400: 7.33, eta_sn490: 7.33, eta_text: '7.33',
      lb_m_sn400: 2.56, lb_m_sn490: 1.85, lb_m_text: '2.56(1.85)',
      wtClassColumn: 'FA（FC）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 317, Zxe_cm3_text: '317（317）', Zye_cm3: 47.0, Zye_cm3_text: '47.0（47.0）', Ae_cm2: 36.97, Ae_cm2_text: '36.97（36.97）',
      Zpx_cm3: 358, Zpx_cm3_text: '358', Zpy_cm3: 72.7, Zpy_cm3_text: '72.7',
      callName: 'H-250×125' },
    { series: 'HN', label: 'H-298×149×5.5×8', H: 298, B: 149, tw: 5.5, tf: 8, r: 13,
      A_cm2: 40.80, A_cm2_text: '40.80', unitWeightKgPerM: 32.0, unitWeightKgPerM_text: '32.0',
      Ix_cm4: 6320, Ix_cm4_text: '6320', Iy_cm4: 442, Iy_cm4_text: '442',
      ix_cm: 12.4, ix_cm_text: '12.4', iy_cm: 3.29, iy_cm_text: '3.29',
      Zx_cm3: 424, Zx_cm3_text: '424', Zy_cm3: 59.3, Zy_cm3_text: '59.3',
      ib_sn400: 3.85, ib_sn490: 3.85, ib_text: '3.85',
      eta_sn400: 9.61, eta_sn490: 9.61, eta_text: '9.61',
      lb_m_sn400: 2.27, lb_m_sn490: 1.64, lb_m_text: '2.27(1.64)',
      wtClassColumn: 'FD（FD）', wtClassBeam: 'FB（FB）',
      Zxe_cm3: 424, Zxe_cm3_text: '424（424）', Zye_cm3: 59.3, Zye_cm3_text: '59.3（59.3）', Ae_cm2: 40.80, Ae_cm2_text: '40.80（39.05）',
      Zpx_cm3: 475, Zpx_cm3_text: '475', Zpy_cm3: 91.8, Zpy_cm3_text: '91.8',
      callName: 'H-300×150' },
    { series: 'HN', label: 'H-300×150×6.5×9', H: 300, B: 150, tw: 6.5, tf: 9, r: 13,
      A_cm2: 46.78, A_cm2_text: '46.78', unitWeightKgPerM: 36.7, unitWeightKgPerM_text: '36.7',
      Ix_cm4: 7210, Ix_cm4_text: '7210', Iy_cm4: 508, Iy_cm4_text: '508',
      ix_cm: 12.4, ix_cm_text: '12.4', iy_cm: 3.29, iy_cm_text: '3.29',
      Zx_cm3: 481, Zx_cm3_text: '481', Zy_cm3: 67.7, Zy_cm3_text: '67.7',
      ib_sn400: 3.87, ib_sn490: 3.87, ib_text: '3.87',
      eta_sn400: 8.61, eta_sn490: 8.61, eta_text: '8.61',
      lb_m_sn400: 2.56, lb_m_sn490: 1.85, lb_m_text: '2.56(1.85)',
      wtClassColumn: 'FB（FD）', wtClassBeam: 'FA（FB）',
      Zxe_cm3: 481, Zxe_cm3_text: '481（481）', Zye_cm3: 67.7, Zye_cm3_text: '67.7（67.7）', Ae_cm2: 46.78, Ae_cm2_text: '46.78（46.78）',
      Zpx_cm3: 542, Zpx_cm3_text: '542', Zpy_cm3: 105, Zpy_cm3_text: '105',
      callName: 'H-300×150' },
    { series: 'HN', label: 'H-346×174×6×9', H: 346, B: 174, tw: 6, tf: 9, r: 13,
      A_cm2: 52.45, A_cm2_text: '52.45', unitWeightKgPerM: 41.2, unitWeightKgPerM_text: '41.2',
      Ix_cm4: 11000, Ix_cm4_text: '11000', Iy_cm4: 791, Iy_cm4_text: '791',
      ix_cm: 14.5, ix_cm_text: '14.5', iy_cm: 3.88, iy_cm_text: '3.88',
      Zx_cm3: 638, Zx_cm3_text: '638', Zy_cm3: 91.0, Zy_cm3_text: '91.0',
      ib_sn400: 4.53, ib_sn490: 4.53, ib_text: '4.53',
      eta_sn400: 10.0, eta_sn490: 10.0, eta_text: '10.0',
      lb_m_sn400: 2.57, lb_m_sn490: 1.86, lb_m_text: '2.57(1.86)',
      wtClassColumn: 'FD（FD）', wtClassBeam: 'FB（FC）',
      Zxe_cm3: 638, Zxe_cm3_text: '638（638）', Zye_cm3: 91.0, Zye_cm3_text: '91.0（91.0）', Ae_cm2: 51.59, Ae_cm2_text: '51.59（49.01）',
      Zpx_cm3: 712, Zpx_cm3_text: '712', Zpy_cm3: 140, Zpy_cm3_text: '140',
      callName: 'H-350×175' },
    { series: 'HN', label: 'H-350×175×7×11', H: 350, B: 175, tw: 7, tf: 11, r: 13,
      A_cm2: 62.91, A_cm2_text: '62.91', unitWeightKgPerM: 49.4, unitWeightKgPerM_text: '49.4',
      Ix_cm4: 13500, Ix_cm4_text: '13500', Iy_cm4: 984, Iy_cm4_text: '984',
      ix_cm: 14.6, ix_cm_text: '14.6', iy_cm: 3.96, iy_cm_text: '3.96',
      Zx_cm3: 771, Zx_cm3_text: '771', Zy_cm3: 112, Zy_cm3_text: '112',
      ib_sn400: 4.60, ib_sn490: 4.60, ib_text: '4.60',
      eta_sn400: 8.35, eta_sn490: 8.35, eta_text: '8.35',
      lb_m_sn400: 3.12, lb_m_sn490: 2.26, lb_m_text: '3.12(2.26)',
      wtClassColumn: 'FC（FD）', wtClassBeam: 'FA（FB）',
      Zxe_cm3: 771, Zxe_cm3_text: '771（771）', Zye_cm3: 112, Zye_cm3_text: '112（112）', Ae_cm2: 62.91, Ae_cm2_text: '62.91（61.75）',
      Zpx_cm3: 864, Zpx_cm3_text: '864', Zpy_cm3: 173, Zpy_cm3_text: '173',
      callName: 'H-350×175' },
    { series: 'HN', label: 'H-354×176×8×13', H: 354, B: 176, tw: 8, tf: 13, r: 13,
      A_cm2: 73.45, A_cm2_text: '73.45', unitWeightKgPerM: 57.7, unitWeightKgPerM_text: '57.7',
      Ix_cm4: 16000, Ix_cm4_text: '16000', Iy_cm4: 1180, Iy_cm4_text: '1180',
      ix_cm: 14.8, ix_cm_text: '14.8', iy_cm: 4.01, iy_cm_text: '4.01',
      Zx_cm3: 906, Zx_cm3_text: '906', Zy_cm3: 134, Zy_cm3_text: '134',
      ib_sn400: 4.65, ib_sn490: 4.65, ib_text: '4.65',
      eta_sn400: 7.20, eta_sn490: 7.20, eta_text: '7.20',
      lb_m_sn400: 3.67, lb_m_sn490: 2.65, lb_m_text: '3.67(2.65)',
      wtClassColumn: 'FA（FD）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 906, Zxe_cm3_text: '906（906）', Zye_cm3: 134, Zye_cm3_text: '134（134）', Ae_cm2: 73.45, Ae_cm2_text: '73.45（73.45）',
      Zpx_cm3: 1020, Zpx_cm3_text: '1020', Zpy_cm3: 208, Zpy_cm3_text: '208',
      callName: 'H-350×175' },
    { series: 'HN', label: 'H-396×199×7×11', H: 396, B: 199, tw: 7, tf: 11, r: 13,
      A_cm2: 71.41, A_cm2_text: '71.41', unitWeightKgPerM: 56.1, unitWeightKgPerM_text: '56.1',
      Ix_cm4: 19800, Ix_cm4_text: '19800', Iy_cm4: 1450, Iy_cm4_text: '1450',
      ix_cm: 16.6, ix_cm_text: '16.6', iy_cm: 4.50, iy_cm_text: '4.50',
      Zx_cm3: 999, Zx_cm3_text: '999', Zy_cm3: 145, Zy_cm3_text: '145',
      ib_sn400: 5.23, ib_sn490: 5.23, ib_text: '5.23',
      eta_sn400: 9.45, eta_sn490: 9.45, eta_text: '9.45',
      lb_m_sn400: 3.14, lb_m_sn490: 2.27, lb_m_text: '3.14(2.27)',
      wtClassColumn: 'FD（FD）', wtClassBeam: 'FB（FB）',
      Zxe_cm3: 999, Zxe_cm3_text: '999（999）', Zye_cm3: 145, Zye_cm3_text: '145（145）', Ae_cm2: 70.54, Ae_cm2_text: '70.54（67.03）',
      Zpx_cm3: 1110, Zpx_cm3_text: '1110', Zpy_cm3: 223, Zpy_cm3_text: '223',
      callName: 'H-400×200' },
    { series: 'HN', label: 'H-400×200×8×13', H: 400, B: 200, tw: 8, tf: 13, r: 13,
      A_cm2: 83.37, A_cm2_text: '83.37', unitWeightKgPerM: 65.4, unitWeightKgPerM_text: '65.4',
      Ix_cm4: 23500, Ix_cm4_text: '23500', Iy_cm4: 1740, Iy_cm4_text: '1740',
      ix_cm: 16.8, ix_cm_text: '16.8', iy_cm: 4.56, iy_cm_text: '4.56',
      Zx_cm3: 1170, Zx_cm3_text: '1170', Zy_cm3: 174, Zy_cm3_text: '174',
      ib_sn400: 5.29, ib_sn490: 5.29, ib_text: '5.29',
      eta_sn400: 8.13, eta_sn490: 8.13, eta_text: '8.13',
      lb_m_sn400: 3.69, lb_m_sn490: 2.67, lb_m_text: '3.69(2.67)',
      wtClassColumn: 'FC（FD）', wtClassBeam: 'FA（FB）',
      Zxe_cm3: 1170, Zxe_cm3_text: '1170（1170）', Zye_cm3: 174, Zye_cm3_text: '174（174）', Ae_cm2: 83.37, Ae_cm2_text: '83.37（81.62）',
      Zpx_cm3: 1310, Zpx_cm3_text: '1310', Zpy_cm3: 267, Zpy_cm3_text: '267',
      callName: 'H-400×200' },
    { series: 'HN', label: 'H-404×201×9×15', H: 404, B: 201, tw: 9, tf: 15, r: 13,
      A_cm2: 95.41, A_cm2_text: '95.41', unitWeightKgPerM: 74.9, unitWeightKgPerM_text: '74.9',
      Ix_cm4: 27200, Ix_cm4_text: '27200', Iy_cm4: 2030, Iy_cm4_text: '2030',
      ix_cm: 16.9, ix_cm_text: '16.9', iy_cm: 4.62, iy_cm_text: '4.62',
      Zx_cm3: 1350, Zx_cm3_text: '1350', Zy_cm3: 202, Zy_cm3_text: '202',
      ib_sn400: 5.34, ib_sn490: 5.34, ib_text: '5.34',
      eta_sn400: 7.16, eta_sn490: 7.16, eta_text: '7.16',
      lb_m_sn400: 4.24, lb_m_sn490: 3.07, lb_m_text: '4.24(3.07)',
      wtClassColumn: 'FA（FD）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 1350, Zxe_cm3_text: '1350（1350）', Zye_cm3: 202, Zye_cm3_text: '202（202）', Ae_cm2: 95.41, Ae_cm2_text: '95.41（95.41）',
      Zpx_cm3: 1510, Zpx_cm3_text: '1510', Zpy_cm3: 312, Zpy_cm3_text: '312',
      callName: 'H-400×200' },
    { series: 'HN', label: 'H-446×199×8×12', H: 446, B: 199, tw: 8, tf: 12, r: 13,
      A_cm2: 82.97, A_cm2_text: '82.97', unitWeightKgPerM: 65.1, unitWeightKgPerM_text: '65.1',
      Ix_cm4: 28100, Ix_cm4_text: '28100', Iy_cm4: 1580, Iy_cm4_text: '1580',
      ix_cm: 18.4, ix_cm_text: '18.4', iy_cm: 4.36, iy_cm_text: '4.36',
      Zx_cm3: 1260, Zx_cm3_text: '1260', Zy_cm3: 159, Zy_cm3_text: '159',
      ib_sn400: 5.16, ib_sn490: 5.16, ib_text: '5.16',
      eta_sn400: 9.64, eta_sn490: 9.64, eta_text: '9.64',
      lb_m_sn400: 3.04, lb_m_sn490: 2.20, lb_m_text: '3.04(2.20)',
      wtClassColumn: 'FD（FD）', wtClassBeam: 'FA（FB）',
      Zxe_cm3: 1260, Zxe_cm3_text: '1260（1260）', Zye_cm3: 159, Zye_cm3_text: '159（159）', Ae_cm2: 81.98, Ae_cm2_text: '81.98（77.38）',
      Zpx_cm3: 1420, Zpx_cm3_text: '1420', Zpy_cm3: 245, Zpy_cm3_text: '245',
      callName: 'H-450×200' },
    { series: 'HN', label: 'H-450×200×9×14', H: 450, B: 200, tw: 9, tf: 14, r: 13,
      A_cm2: 95.43, A_cm2_text: '95.43', unitWeightKgPerM: 74.9, unitWeightKgPerM_text: '74.9',
      Ix_cm4: 32900, Ix_cm4_text: '32900', Iy_cm4: 1870, Iy_cm4_text: '1870',
      ix_cm: 18.6, ix_cm_text: '18.6', iy_cm: 4.43, iy_cm_text: '4.43',
      Zx_cm3: 1460, Zx_cm3_text: '1460', Zy_cm3: 187, Zy_cm3_text: '187',
      ib_sn400: 5.23, ib_sn490: 5.23, ib_text: '5.23',
      eta_sn400: 8.40, eta_sn490: 8.40, eta_text: '8.40',
      lb_m_sn400: 3.53, lb_m_sn490: 2.56, lb_m_text: '3.53(2.56)',
      wtClassColumn: 'FC（FD）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 1460, Zxe_cm3_text: '1460（1460）', Zye_cm3: 187, Zye_cm3_text: '187（187）', Ae_cm2: 95.43, Ae_cm2_text: '95.43（92.81）',
      Zpx_cm3: 1650, Zpx_cm3_text: '1650', Zpy_cm3: 290, Zpy_cm3_text: '290',
      callName: 'H-450×200' },
    { series: 'HN', label: 'H-456×201×10×17', H: 456, B: 201, tw: 10, tf: 17, r: 13,
      A_cm2: 112.0, A_cm2_text: '112.0', unitWeightKgPerM: 87.9, unitWeightKgPerM_text: '87.9',
      Ix_cm4: 39800, Ix_cm4_text: '39800', Iy_cm4: 2310, Iy_cm4_text: '2310',
      ix_cm: 18.9, ix_cm_text: '18.9', iy_cm: 4.54, iy_cm_text: '4.54',
      Zx_cm3: 1750, Zx_cm3_text: '1750', Zy_cm3: 229, Zy_cm3_text: '229',
      ib_sn400: 5.31, ib_sn490: 5.31, ib_text: '5.31',
      eta_sn400: 7.09, eta_sn490: 7.09, eta_text: '7.09',
      lb_m_sn400: 4.26, lb_m_sn490: 3.08, lb_m_text: '4.26(3.08)',
      wtClassColumn: 'FA（FD）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 1750, Zxe_cm3_text: '1750（1750）', Zye_cm3: 229, Zye_cm3_text: '229（229）', Ae_cm2: 112.0, Ae_cm2_text: '112.0（112.0）',
      Zpx_cm3: 1980, Zpx_cm3_text: '1980', Zpy_cm3: 355, Zpy_cm3_text: '355',
      callName: 'H-450×200' },
    { series: 'HN', label: 'H-496×199×9×14', H: 496, B: 199, tw: 9, tf: 14, r: 13,
      A_cm2: 99.29, A_cm2_text: '99.29', unitWeightKgPerM: 77.9, unitWeightKgPerM_text: '77.9',
      Ix_cm4: 40800, Ix_cm4_text: '40800', Iy_cm4: 1840, Iy_cm4_text: '1840',
      ix_cm: 20.3, ix_cm_text: '20.3', iy_cm: 4.31, iy_cm_text: '4.31',
      Zx_cm3: 1650, Zx_cm3_text: '1650', Zy_cm3: 185, Zy_cm3_text: '185',
      ib_sn400: 5.14, ib_sn490: 5.14, ib_text: '5.14',
      eta_sn400: 9.16, eta_sn490: 9.16, eta_text: '9.16',
      lb_m_sn400: 3.19, lb_m_sn490: 2.31, lb_m_text: '3.19(2.31)',
      wtClassColumn: 'FD（FD）', wtClassBeam: 'FA（FB）',
      Zxe_cm3: 1650, Zxe_cm3_text: '1650（1650）', Zye_cm3: 185, Zye_cm3_text: '185（185）', Ae_cm2: 98.35, Ae_cm2_text: '98.35（92.53）',
      Zpx_cm3: 1870, Zpx_cm3_text: '1870', Zpy_cm3: 288, Zpy_cm3_text: '288',
      callName: 'H-500×200' },
    { series: 'HN', label: 'H-500×200×10×16', H: 500, B: 200, tw: 10, tf: 16, r: 13,
      A_cm2: 112.3, A_cm2_text: '112.3', unitWeightKgPerM: 88.2, unitWeightKgPerM_text: '88.2',
      Ix_cm4: 46800, Ix_cm4_text: '46800', Iy_cm4: 2140, Iy_cm4_text: '2140',
      ix_cm: 20.4, ix_cm_text: '20.4', iy_cm: 4.36, iy_cm_text: '4.36',
      Zx_cm3: 1870, Zx_cm3_text: '1870', Zy_cm3: 214, Zy_cm3_text: '214',
      ib_sn400: 5.20, ib_sn490: 5.20, ib_text: '5.20',
      eta_sn400: 8.13, eta_sn490: 8.13, eta_text: '8.13',
      lb_m_sn400: 3.64, lb_m_sn490: 2.63, lb_m_text: '3.64(2.63)',
      wtClassColumn: 'FC（FD）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 1870, Zxe_cm3_text: '1870（1870）', Zye_cm3: 214, Zye_cm3_text: '214（214）', Ae_cm2: 112.3, Ae_cm2_text: '112.3（108.8）',
      Zpx_cm3: 2130, Zpx_cm3_text: '2130', Zpy_cm3: 333, Zpy_cm3_text: '333',
      callName: 'H-500×200' },
    { series: 'HN', label: 'H-506×201×11×19', H: 506, B: 201, tw: 11, tf: 19, r: 13,
      A_cm2: 129.3, A_cm2_text: '129.3', unitWeightKgPerM: 102, unitWeightKgPerM_text: '102',
      Ix_cm4: 55500, Ix_cm4_text: '55500', Iy_cm4: 2580, Iy_cm4_text: '2580',
      ix_cm: 20.7, ix_cm_text: '20.7', iy_cm: 4.46, iy_cm_text: '4.46',
      Zx_cm3: 2190, Zx_cm3_text: '2190', Zy_cm3: 257, Zy_cm3_text: '257',
      ib_sn400: 5.28, ib_sn490: 5.28, ib_text: '5.28',
      eta_sn400: 7.00, eta_sn490: 7.00, eta_text: '7.00',
      lb_m_sn400: 4.29, lb_m_sn490: 3.10, lb_m_text: '4.29(3.10)',
      wtClassColumn: 'FA（FD）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 2190, Zxe_cm3_text: '2190（2190）', Zye_cm3: 257, Zye_cm3_text: '257（257）', Ae_cm2: 129.3, Ae_cm2_text: '129.3（129.3）',
      Zpx_cm3: 2500, Zpx_cm3_text: '2500', Zpy_cm3: 399, Zpy_cm3_text: '399',
      callName: 'H-500×200' },
    { series: 'HN', label: 'H-596×199×10×15', H: 596, B: 199, tw: 10, tf: 15, r: 13,
      A_cm2: 117.8, A_cm2_text: '117.8', unitWeightKgPerM: 92.5, unitWeightKgPerM_text: '92.5',
      Ix_cm4: 66600, Ix_cm4_text: '66600', Iy_cm4: 1980, Iy_cm4_text: '1980',
      ix_cm: 23.8, ix_cm_text: '23.8', iy_cm: 4.10, iy_cm_text: '4.10',
      Zx_cm3: 2240, Zx_cm3_text: '2240', Zy_cm3: 199, Zy_cm3_text: '199',
      ib_sn400: 5.03, ib_sn490: 5.03, ib_text: '5.03',
      eta_sn400: 10.0, eta_sn490: 10.0, eta_text: '10.0',
      lb_m_sn400: 2.85, lb_m_sn490: 2.06, lb_m_text: '2.85(2.06)',
      wtClassColumn: 'FD（FD）', wtClassBeam: 'FA（FC）',
      Zxe_cm3: 2240, Zxe_cm3_text: '2240（2240）', Zye_cm3: 199, Zye_cm3_text: '199（199）', Ae_cm2: 111.7, Ae_cm2_text: '111.7（104.5）',
      Zpx_cm3: 2580, Zpx_cm3_text: '2580', Zpy_cm3: 312, Zpy_cm3_text: '312',
      callName: 'H-600×200' },
    { series: 'HN', label: 'H-600×200×11×17', H: 600, B: 200, tw: 11, tf: 17, r: 13,
      A_cm2: 131.7, A_cm2_text: '131.7', unitWeightKgPerM: 103, unitWeightKgPerM_text: '103',
      Ix_cm4: 75600, Ix_cm4_text: '75600', Iy_cm4: 2270, Iy_cm4_text: '2270',
      ix_cm: 24.0, ix_cm_text: '24.0', iy_cm: 4.16, iy_cm_text: '4.16',
      Zx_cm3: 2520, Zx_cm3_text: '2520', Zy_cm3: 227, Zy_cm3_text: '227',
      ib_sn400: 5.09, ib_sn490: 5.09, ib_text: '5.09',
      eta_sn400: 8.98, eta_sn490: 8.98, eta_text: '8.98',
      lb_m_sn400: 3.22, lb_m_sn490: 2.33, lb_m_text: '3.22(2.33)',
      wtClassColumn: 'FD（FD）', wtClassBeam: 'FA（FB）',
      Zxe_cm3: 2520, Zxe_cm3_text: '2520（2520）', Zye_cm3: 227, Zye_cm3_text: '227（227）', Ae_cm2: 130.3, Ae_cm2_text: '130.3（121.6）',
      Zpx_cm3: 2900, Zpx_cm3_text: '2900', Zpy_cm3: 358, Zpy_cm3_text: '358',
      callName: 'H-600×200' },
    { series: 'HN', label: 'H-606×201×12×20', H: 606, B: 201, tw: 12, tf: 20, r: 13,
      A_cm2: 149.8, A_cm2_text: '149.8', unitWeightKgPerM: 118, unitWeightKgPerM_text: '118',
      Ix_cm4: 88300, Ix_cm4_text: '88300', Iy_cm4: 2720, Iy_cm4_text: '2720',
      ix_cm: 24.3, ix_cm_text: '24.3', iy_cm: 4.26, iy_cm_text: '4.26',
      Zx_cm3: 2910, Zx_cm3_text: '2910', Zy_cm3: 270, Zy_cm3_text: '270',
      ib_sn400: 5.17, ib_sn490: 5.17, ib_text: '5.17',
      eta_sn400: 7.80, eta_sn490: 7.80, eta_text: '7.80',
      lb_m_sn400: 3.77, lb_m_sn490: 2.72, lb_m_text: '3.77(2.72)',
      wtClassColumn: 'FC（FD）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 2910, Zxe_cm3_text: '2910（2910）', Zye_cm3: 270, Zye_cm3_text: '270（270）', Ae_cm2: 149.8, Ae_cm2_text: '149.8（143.7）',
      Zpx_cm3: 3360, Zpx_cm3_text: '3360', Zpy_cm3: 426, Zpy_cm3_text: '426',
      callName: 'H-600×200' },
    { series: 'HN', label: 'H-612×202×13×23', H: 612, B: 202, tw: 13, tf: 23, r: 13,
      A_cm2: 168.0, A_cm2_text: '168.0', unitWeightKgPerM: 132, unitWeightKgPerM_text: '132',
      Ix_cm4: 101000, Ix_cm4_text: '101000', Iy_cm4: 3170, Iy_cm4_text: '3170',
      ix_cm: 24.6, ix_cm_text: '24.6', iy_cm: 4.35, iy_cm_text: '4.35',
      Zx_cm3: 3310, Zx_cm3_text: '3310', Zy_cm3: 314, Zy_cm3_text: '314',
      ib_sn400: 5.25, ib_sn490: 5.25, ib_text: '5.25',
      eta_sn400: 6.91, eta_sn490: 6.91, eta_text: '6.91',
      lb_m_sn400: 4.31, lb_m_sn490: 3.12, lb_m_text: '4.31(3.12)',
      wtClassColumn: 'FB（FD）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 3310, Zxe_cm3_text: '3310（3310）', Zye_cm3: 314, Zye_cm3_text: '314（314）', Ae_cm2: 168.0, Ae_cm2_text: '168.0（166.7）',
      Zpx_cm3: 3820, Zpx_cm3_text: '3820', Zpy_cm3: 495, Zpy_cm3_text: '495',
      callName: 'H-600×200' },
    { series: 'HM', label: 'H-900×300×16×28', H: 900, B: 300, tw: 16, tf: 28, r: 18,
      A_cm2: 305.8, A_cm2_text: '305.8', unitWeightKgPerM: 240, unitWeightKgPerM_text: '240',
      Ix_cm4: 404000, Ix_cm4_text: '404000', Iy_cm4: 12600, Iy_cm4_text: '12600',
      ix_cm: 36.4, ix_cm_text: '36.4', iy_cm: 6.43, iy_cm_text: '6.43',
      Zx_cm3: 8990, Zx_cm3_text: '8990', Zy_cm3: 842, Zy_cm3_text: '842',
      ib_sn400: 7.75, ib_sn490: 7.75, ib_text: '7.75',
      eta_sn400: 8.31, eta_sn490: 8.31, eta_text: '8.31',
      lb_m_sn400: 5.30, lb_m_sn490: 3.83, lb_m_text: '5.30(3.83)',
      wtClassColumn: 'FD（FD）', wtClassBeam: 'FA（FB）',
      Zxe_cm3: 8990, Zxe_cm3_text: '8990（8990）', Zye_cm3: 842, Zye_cm3_text: '842（842）', Ae_cm2: 299.3, Ae_cm2_text: '299.3（280.9）',
      Zpx_cm3: 10300, Zpx_cm3_text: '10300', Zpy_cm3: 1320, Zpy_cm3_text: '1320',
      callName: 'H-900×300' },
    { series: 'HM', label: 'H-912×302×18×34', H: 912, B: 302, tw: 18, tf: 34, r: 18,
      A_cm2: 360.1, A_cm2_text: '360.1', unitWeightKgPerM: 283, unitWeightKgPerM_text: '283',
      Ix_cm4: 491000, Ix_cm4_text: '491000', Iy_cm4: 15700, Iy_cm4_text: '15700',
      ix_cm: 36.9, ix_cm_text: '36.9', iy_cm: 6.59, iy_cm_text: '6.59',
      Zx_cm3: 10800, Zx_cm3_text: '10800', Zy_cm3: 1040, Zy_cm3_text: '1040',
      ib_sn400: 7.90, ib_sn490: 7.90, ib_text: '7.90',
      eta_sn400: 7.01, eta_sn490: 7.01, eta_text: '7.01',
      lb_m_sn400: 6.40, lb_m_sn490: 4.62, lb_m_text: '6.40(4.62)',
      wtClassColumn: 'FC（FD）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 10800, Zxe_cm3_text: '10800（10800）', Zye_cm3: 1040, Zye_cm3_text: '1040（1040）', Ae_cm2: 360.1, Ae_cm2_text: '360.1（346.7）',
      Zpx_cm3: 12300, Zpx_cm3_text: '12300', Zpy_cm3: 1620, Zpy_cm3_text: '1620',
      callName: 'H-900×300' },
    { series: 'HM', label: 'H-918×303×19×37', H: 918, B: 303, tw: 19, tf: 37, r: 18,
      A_cm2: 387.4, A_cm2_text: '387.4', unitWeightKgPerM: 304, unitWeightKgPerM_text: '304',
      Ix_cm4: 535000, Ix_cm4_text: '535000', Iy_cm4: 17200, Iy_cm4_text: '17200',
      ix_cm: 37.2, ix_cm_text: '37.2', iy_cm: 6.67, iy_cm_text: '6.67',
      Zx_cm3: 11700, Zx_cm3_text: '11700', Zy_cm3: 1140, Zy_cm3_text: '1140',
      ib_sn400: 7.96, ib_sn490: 7.96, ib_text: '7.96',
      eta_sn400: 6.52, eta_sn490: 6.52, eta_text: '6.52',
      lb_m_sn400: 6.94, lb_m_sn490: 5.02, lb_m_text: '6.94(5.02)',
      wtClassColumn: 'FB（FD）', wtClassBeam: 'FA（FA）',
      Zxe_cm3: 11700, Zxe_cm3_text: '11700（11700）', Zye_cm3: 1140, Zye_cm3_text: '1140（1140）', Ae_cm2: 387.4, Ae_cm2_text: '387.4（381.0）',
      Zpx_cm3: 13400, Zpx_cm3_text: '13400', Zpy_cm3: 1780, Zpy_cm3_text: '1780',
      callName: 'H-900×300' },
    // 以降、未指示のサンプルは一旦削除
  ];
  const [catalogEntries, setCatalogEntries] = useState<HBeamCatalogEntry[]>(defaultCatalog);
  const [hSeries, setHSeries] = useState<HSeries>('HW');
  const [hCallName, setHCallName] = useState<string>('');
  const [hSizeIndex, setHSizeIndex] = useState<number>(0);

  // 呼称の導出
  const getCallName = (e: HBeamCatalogEntry): string => {
    if ((e as any).callName) return (e as any).callName as string;
    const m = e.label.match(/^H-([^×]+)×([^×]+)/);
    return m ? `H-${m[1]}×${m[2]}` : `H-${e.H}×${e.B}`;
  };

  const callNamesInSeries = useMemo(() => {
    const list = Array.from(new Set(catalogEntries.filter(e=>e.series===hSeries).map(getCallName)));
    return list;
  }, [catalogEntries, hSeries]);

  // 規格選択ON時は、現在選択中のシリーズ/サイズの値を数値欄へ反映
  useEffect(() => {
    if (hCatalogMode) {
      if (!hCallName) {
        const first = callNamesInSeries[0];
        if (first) setHCallName(first);
      }
      const items = catalogEntries.filter(e => e.series === hSeries && getCallName(e) === (hCallName || callNamesInSeries[0]));
      const item = items[hSizeIndex];
      if (item) {
        setHH(item.H);
        setHB(item.B);
        setHtw(item.tw);
        setHtf(item.tf);
        if (typeof item.r === 'number' && !Number.isNaN(item.r)) setHRootR(item.r as number);
      }
    }
  }, [hCatalogMode, hSeries, hCallName, hSizeIndex, catalogEntries, callNamesInSeries]);

  // CSVインポート（series,label,H,B,tw,tf,r,A_cm2,unitWeightKgPerM,Ix_cm4,Iy_cm4,ix_cm,iy_cm,Zx_cm3,Zy_cm3,ib,eta,lb_m,wtClassColumn,wtClassBeam,Zxe_cm3,Zye_cm3,Ae_cm2,Zpx_cm3,Zpy_cm3,callName）
  const [csvText, setCsvText] = useState<string>('');
  const importCsv = () => {
    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    const [head, ...rows] = lines;
    const cols = head.split(',').map(s=>s.trim());
    const idxEq = (name: string) => cols.findIndex(c=>c.toLowerCase()===name.toLowerCase());
    const colIndex = (names: string[]) => {
      for (const n of names) {
        const i = idxEq(n);
        if (i >= 0) return i;
      }
      return -1;
    };
    const parseDual = (raw: string | number | undefined): { sn400?: number; sn490?: number } => {
      if (raw === undefined || raw === null) return {};
      if (typeof raw === 'number' && !Number.isNaN(raw)) return { sn400: raw, sn490: raw };
      const s = String(raw).trim();
      if (!s) return {};
      // パターン: a(b) または a / b または a,b
      const mParen = s.match(/^\s*([+-]?[0-9]*\.?[0-9]+)\s*[\(\/]\s*([+-]?[0-9]*\.?[0-9]+)\s*[\)]?\s*$/);
      if (mParen) {
        const sn400 = parseFloat(mParen[1]);
        const sn490 = parseFloat(mParen[2]);
        return {
          sn400: Number.isFinite(sn400) ? sn400 : undefined,
          sn490: Number.isFinite(sn490) ? sn490 : undefined,
        };
      }
      // a,b 形式
      const parts = s.split(/\s*[;,\/]\s*/).filter(Boolean);
      if (parts.length === 2) {
        const sn400 = parseFloat(parts[0]);
        const sn490 = parseFloat(parts[1]);
        return {
          sn400: Number.isFinite(sn400) ? sn400 : undefined,
          sn490: Number.isFinite(sn490) ? sn490 : undefined,
        };
      }
      const v = parseFloat(s);
      if (Number.isFinite(v)) return { sn400: v, sn490: v };
      return {};
    };
    const iSeries = colIndex(['series']);
    const iLabel = colIndex(['label', '呼称']);
    const iH = colIndex(['H']);
    const iB = colIndex(['B']);
    const itw = colIndex(['tw','t1','t_w']);
    const itf = colIndex(['tf','t2','t_f']);
    const ir = colIndex(['r']);
    const iA = colIndex(['A_cm2','A','area_cm2','断面積']);
    const iw = colIndex(['unitWeightKgPerM','W_kgm','質量','単位質量','重量']);
    const iIx = colIndex(['Ix_cm4','Ix','I_x_cm4']);
    const iIy = colIndex(['Iy_cm4','Iy','I_y_cm4']);
    const iix = colIndex(['ix_cm','ix']);
    const iiy = colIndex(['iy_cm','iy']);
    const iZx = colIndex(['Zx_cm3','Zx']);
    const iZy = colIndex(['Zy_cm3','Zy']);
    const iib = colIndex(['ib','曲げ用ib']);
    const ieta = colIndex(['eta','η']);
    const ilb = colIndex(['lb_m','lb','横座屈長さ']);
    const iWtCol = colIndex(['wtClassColumn','幅厚比種別柱','幅厚比(柱)']);
    const iWtBeam = colIndex(['wtClassBeam','幅厚比種別梁','幅厚比(梁)']);
    const iZxe = colIndex(['Zxe_cm3','Zxe']);
    const iZye = colIndex(['Zye_cm3','Zye']);
    const iAe = colIndex(['Ae_cm2','Ae']);
    const iZpx = colIndex(['Zpx_cm3','Zpx']);
    const iZpy = colIndex(['Zpy_cm3','Zpy']);
    const iCallName = colIndex(['callName']);
    const parsed: HBeamCatalogEntry[] = rows.map(rw => {
      const f = rw.split(',');
      const dualIb = iib>=0 ? parseDual(f[iib]) : {};
      const dualEta = ieta>=0 ? parseDual(f[ieta]) : {};
      const dualLb = ilb>=0 ? parseDual(f[ilb]) : {};
      return {
        series: (f[iSeries] as HSeries) || 'HM',
        label: f[iLabel],
        H: parseFloat(f[iH]),
        B: parseFloat(f[iB]),
        tw: parseFloat(f[itw]),
        tf: parseFloat(f[itf]),
        r: ir>=0? parseFloat(f[ir]) : undefined,
        A_cm2: iA>=0? parseFloat(f[iA]) : undefined,
        A_cm2_text: iA>=0? String(f[iA]) : undefined,
        unitWeightKgPerM: iw>=0? parseFloat(f[iw]) : undefined,
        unitWeightKgPerM_text: iw>=0? String(f[iw]) : undefined,
        Ix_cm4: iIx>=0? parseFloat(f[iIx]) : undefined,
        Ix_cm4_text: iIx>=0? String(f[iIx]) : undefined,
        Iy_cm4: iIy>=0? parseFloat(f[iIy]) : undefined,
        Iy_cm4_text: iIy>=0? String(f[iIy]) : undefined,
        ix_cm: iix>=0? parseFloat(f[iix]) : undefined,
        ix_cm_text: iix>=0? String(f[iix]) : undefined,
        iy_cm: iiy>=0? parseFloat(f[iiy]) : undefined,
        iy_cm_text: iiy>=0? String(f[iiy]) : undefined,
        Zx_cm3: iZx>=0? parseFloat(f[iZx]) : undefined,
        Zx_cm3_text: iZx>=0? String(f[iZx]) : undefined,
        Zy_cm3: iZy>=0? parseFloat(f[iZy]) : undefined,
        Zy_cm3_text: iZy>=0? String(f[iZy]) : undefined,
        ib_sn400: dualIb.sn400, ib_sn490: dualIb.sn490,
        ib_text: iib>=0? String(f[iib]) : undefined,
        eta_sn400: dualEta.sn400, eta_sn490: dualEta.sn490,
        eta_text: ieta>=0? String(f[ieta]) : undefined,
        lb_m_sn400: dualLb.sn400, lb_m_sn490: dualLb.sn490,
        lb_m_text: ilb>=0? String(f[ilb]) : undefined,
        wtClassColumn: iWtCol>=0? String(f[iWtCol]).trim() : undefined,
        wtClassBeam: iWtBeam>=0? String(f[iWtBeam]).trim() : undefined,
        Zxe_cm3: iZxe>=0? parseFloat(f[iZxe]) : undefined,
        Zxe_cm3_text: iZxe>=0? String(f[iZxe]) : undefined,
        Zye_cm3: iZye>=0? parseFloat(f[iZye]) : undefined,
        Zye_cm3_text: iZye>=0? String(f[iZye]) : undefined,
        Ae_cm2: iAe>=0? parseFloat(f[iAe]) : undefined,
        Ae_cm2_text: iAe>=0? String(f[iAe]) : undefined,
        Zpx_cm3: iZpx>=0? parseFloat(f[iZpx]) : undefined,
        Zpx_cm3_text: iZpx>=0? String(f[iZpx]) : undefined,
        Zpy_cm3: iZpy>=0? parseFloat(f[iZpy]) : undefined,
        Zpy_cm3_text: iZpy>=0? String(f[iZpy]) : undefined,
        callName: iCallName>=0? String(f[iCallName]).trim() : undefined,
      } as HBeamCatalogEntry;
    }).filter(e=>!Number.isNaN(e.H));
    if (parsed.length>0) {
      setCatalogEntries(parsed);
      // 最初の行でUIを同期
      const e0 = parsed[0];
      setHSeries(e0.series);
      setHCallName(getCallName(e0));
      setHSizeIndex(0);
      setHH(e0.H); setHB(e0.B); setHtw(e0.tw); setHtf(e0.tf); if (typeof e0.r === 'number' && !Number.isNaN(e0.r)) setHRootR(e0.r as number);
    }
  };
  const steelDensity = 7.85; // g/cm3

  const sectionResults = useMemo(() => {
    let areaMm2 = 0;
    let IxMm4 = 0;
    let IyMm4 = 0;
    let ZxMm3 = 0;
    let ZyMm3 = 0;
    let unitWeightKgPerM = 0;
    let ixCm = 0;
    let iyCm = 0;

    if (sectionType === 'rectangle') {
      const b = rectB;
      const h = rectH;
      areaMm2 = b * h;
      IxMm4 = (b * Math.pow(h, 3)) / 12;
      IyMm4 = (h * Math.pow(b, 3)) / 12;
      ZxMm3 = IxMm4 / (h / 2);
      ZyMm3 = IyMm4 / (b / 2);
    } else if (sectionType === 'circle') {
      const d = circD;
      areaMm2 = (Math.PI * Math.pow(d, 2)) / 4;
      IxMm4 = (Math.PI * Math.pow(d, 4)) / 64;
      IyMm4 = IxMm4;
      ZxMm3 = IxMm4 / (d / 2);
      ZyMm3 = ZxMm3;
    } else {
      const selectedCall = hCallName || callNamesInSeries[0];
      const filteredByCall = catalogEntries.filter(
        e => e.series === hSeries && getCallName(e) === selectedCall
      );
      const fallbackSeries = catalogEntries.filter(e => e.series === hSeries);
      const seriesItems = filteredByCall.length > 0 ? filteredByCall : fallbackSeries;
      const safeIndex = Math.min(hSizeIndex, Math.max(seriesItems.length - 1, 0));
      const item = seriesItems[safeIndex];

      if (item && hCatalogMode) {
        const areaCm2Catalog = typeof item.A_cm2 === 'number' && !Number.isNaN(item.A_cm2)
          ? item.A_cm2
          : typeof item.unitWeightKgPerM === 'number' && !Number.isNaN(item.unitWeightKgPerM)
            ? item.unitWeightKgPerM / 0.785
            : undefined;
        const IxCm4Catalog = typeof item.Ix_cm4 === 'number' && !Number.isNaN(item.Ix_cm4) ? item.Ix_cm4 : undefined;
        const IyCm4Catalog = typeof item.Iy_cm4 === 'number' && !Number.isNaN(item.Iy_cm4) ? item.Iy_cm4 : undefined;
        const ZxCm3Catalog = typeof item.Zx_cm3 === 'number' && !Number.isNaN(item.Zx_cm3) ? item.Zx_cm3 : undefined;
        const ZyCm3Catalog = typeof item.Zy_cm3 === 'number' && !Number.isNaN(item.Zy_cm3) ? item.Zy_cm3 : undefined;
        const ixCmCatalog = typeof item.ix_cm === 'number' && !Number.isNaN(item.ix_cm) ? item.ix_cm : undefined;
        const iyCmCatalog = typeof item.iy_cm === 'number' && !Number.isNaN(item.iy_cm) ? item.iy_cm : undefined;

        const H = item.H;
        const B = item.B;
        const tw = item.tw;
        const tf = item.tf;
        const r = Math.max(item.r ?? 0, 0);
        const hWeb = Math.max(H - 2 * tf, 0);

        if (typeof areaCm2Catalog === 'number') {
          areaMm2 = areaCm2Catalog * 100;
        } else {
          const areaFlange = 2 * (B * tf);
          const areaWeb = tw * hWeb;
          const cornerReduction = r > 0 ? 4 * (Math.PI / 4 - 1) * r * r : 0;
          areaMm2 = Math.max(areaFlange + areaWeb - cornerReduction, 0);
        }

        if (typeof IxCm4Catalog === 'number') {
          IxMm4 = IxCm4Catalog * 1e4;
        } else {
          const y = H / 2 - tf / 2;
          const IxFlange = 2 * ((B * Math.pow(tf, 3)) / 12 + (B * tf) * Math.pow(y, 2));
          const IxWeb = (tw * Math.pow(hWeb, 3)) / 12;
          IxMm4 = IxFlange + IxWeb;
        }

        if (typeof IyCm4Catalog === 'number') {
          IyMm4 = IyCm4Catalog * 1e4;
        } else {
          const IyFlange = 2 * ((tf * Math.pow(B, 3)) / 12);
          const IyWeb = (hWeb * Math.pow(tw, 3)) / 12;
          IyMm4 = IyFlange + IyWeb;
        }

        ZxMm3 = typeof ZxCm3Catalog === 'number' ? ZxCm3Catalog * 1000 : (IxMm4 > 0 ? IxMm4 / (H / 2) : 0);
        ZyMm3 = typeof ZyCm3Catalog === 'number' ? ZyCm3Catalog * 1000 : (IyMm4 > 0 ? IyMm4 / (B / 2) : 0);

        unitWeightKgPerM = typeof item.unitWeightKgPerM === 'number' && !Number.isNaN(item.unitWeightKgPerM)
          ? item.unitWeightKgPerM
          : areaMm2 > 0
            ? (areaMm2 / 100) * 0.785
            : 0;

        ixCm = typeof ixCmCatalog === 'number' ? ixCmCatalog : 0;
        iyCm = typeof iyCmCatalog === 'number' ? iyCmCatalog : 0;
      } else {
        const H = hH;
        const B = hB;
        const tw = htw;
        const tf = htf;
        const r = Math.max(hRootR, 0);
        const hWeb = Math.max(H - 2 * tf, 0);
        const areaFlange = 2 * (B * tf);
        const areaWeb = tw * hWeb;
        const cornerReduction = r > 0 ? 4 * (Math.PI / 4 - 1) * r * r : 0;
        areaMm2 = Math.max(areaFlange + areaWeb - cornerReduction, 0);
        const y = H / 2 - tf / 2;
        const IxFlange = 2 * ((B * Math.pow(tf, 3)) / 12 + (B * tf) * Math.pow(y, 2));
        const IxWeb = (tw * Math.pow(hWeb, 3)) / 12;
        IxMm4 = IxFlange + IxWeb;
        const IyFlange = 2 * ((tf * Math.pow(B, 3)) / 12);
        const IyWeb = (hWeb * Math.pow(tw, 3)) / 12;
        IyMm4 = IyFlange + IyWeb;
        const Hhalf = H / 2;
        const Bhalf = B / 2;
        ZxMm3 = IxMm4 > 0 ? IxMm4 / Hhalf : 0;
        ZyMm3 = IyMm4 > 0 ? IyMm4 / Bhalf : 0;
      }
    }

    const areaCm2 = areaMm2 / 100;
    const IxCm4 = IxMm4 / 1e4;
    const IyCm4 = IyMm4 / 1e4;
    const ZxCm3 = ZxMm3 / 1000;
    const ZyCm3 = ZyMm3 / 1000;

    if (unitWeightKgPerM === 0) {
      unitWeightKgPerM = areaCm2 * 0.785;
    }

    if (ixCm === 0 && areaMm2 > 0 && IxMm4 > 0) {
      const ixMm = Math.sqrt(IxMm4 / areaMm2);
      ixCm = ixMm / 10;
    }
    if (iyCm === 0 && areaMm2 > 0 && IyMm4 > 0) {
      const iyMm = Math.sqrt(IyMm4 / areaMm2);
      iyCm = iyMm / 10;
    }

    return {
      areaMm2,
      areaCm2,
      IxMm4,
      IxCm4,
      IyMm4,
      IyCm4,
      ZxMm3,
      ZxCm3,
      ZyMm3,
      ZyCm3,
      ixCm,
      iyCm,
      unitWeightKgPerM,
    };
  }, [sectionType, rectB, rectH, circD, hCatalogMode, catalogEntries, hSeries, hCallName, callNamesInSeries, hSizeIndex, hH, hB, htw, htf, hRootR]);

  const [compareSlots, setCompareSlots] = useState<{ A?: SectionSummary; B?: SectionSummary }>({});

  const fmt = (v: number, digits = 2) => {
    if (!Number.isFinite(v)) return '—';
    return v.toLocaleString('ja-JP', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
  };

  const currentSectionLabel = useMemo(() => {
    if (sectionType === 'rectangle') {
      return `長方形 ${fmt(rectB, 0)} × ${fmt(rectH, 0)} mm`;
    }
    if (sectionType === 'circle') {
      return `円形 φ${fmt(circD, 0)} mm`;
    }
    if (sectionType === 'hshape' && hCatalogMode) {
      const item = catalogEntries.filter(e => e.series === hSeries && getCallName(e) === (hCallName || callNamesInSeries[0]))[hSizeIndex];
      if (item) {
        const call = getCallName(item);
        return `H形鋼 ${call} (${item.label})`;
      }
    }
    if (sectionType === 'hshape') {
      return `H形鋼 H${fmt(hH, 0)} × B${fmt(hB, 0)} × tw${fmt(htw, 1)} × tf${fmt(htf, 1)} mm`;
    }
    return '断面';
  }, [sectionType, rectB, rectH, circD, hCatalogMode, catalogEntries, hSeries, hCallName, callNamesInSeries, hSizeIndex, hH, hB, htw, htf]);

  const currentSummary = useMemo<SectionSummary>(() => {
    return {
      label: currentSectionLabel,
      areaMm2: Number(sectionResults.areaMm2 ?? 0),
      areaCm2: Number(sectionResults.areaCm2 ?? 0),
      IxMm4: Number(sectionResults.IxMm4 ?? 0),
      IxCm4: Number(sectionResults.IxCm4 ?? 0),
      IyMm4: Number(sectionResults.IyMm4 ?? 0),
      IyCm4: Number(sectionResults.IyCm4 ?? 0),
      ZxMm3: Number(sectionResults.ZxMm3 ?? 0),
      ZxCm3: Number(sectionResults.ZxCm3 ?? 0),
      ZyMm3: Number(sectionResults.ZyMm3 ?? 0),
      ZyCm3: Number(sectionResults.ZyCm3 ?? 0),
      ixCm: Number(sectionResults.ixCm ?? 0),
      iyCm: Number(sectionResults.iyCm ?? 0),
      unitWeight: Number(sectionResults.unitWeightKgPerM ?? 0),
    };
  }, [
    currentSectionLabel,
    sectionResults.areaMm2,
    sectionResults.areaCm2,
    sectionResults.IxMm4,
    sectionResults.IxCm4,
    sectionResults.IyMm4,
    sectionResults.IyCm4,
    sectionResults.ZxMm3,
    sectionResults.ZxCm3,
    sectionResults.ZyMm3,
    sectionResults.ZyCm3,
    sectionResults.ixCm,
    sectionResults.iyCm,
    sectionResults.unitWeightKgPerM,
  ]);

  const captureComparison = (slot: 'A' | 'B') => {
    setCompareSlots(prev => ({
      ...prev,
      [slot]: { ...currentSummary },
    }));
  };

  const clearComparison = (slot?: 'A' | 'B') => {
    if (!slot) {
      setCompareSlots({});
    } else {
      setCompareSlots(prev => {
        const next = { ...prev };
        delete next[slot];
        return next;
      });
    }
  };

  const diffSummary = useMemo(() => {
    const { A, B } = compareSlots;
    if (!A || !B) return null;
    return {
      areaMm2: B.areaMm2 - A.areaMm2,
      areaCm2: B.areaCm2 - A.areaCm2,
      IxCm4: B.IxCm4 - A.IxCm4,
      IyCm4: B.IyCm4 - A.IyCm4,
      ZxCm3: B.ZxCm3 - A.ZxCm3,
      ZyCm3: B.ZyCm3 - A.ZyCm3,
      ixCm: B.ixCm - A.ixCm,
      iyCm: B.iyCm - A.iyCm,
      unitWeight: B.unitWeight - A.unitWeight,
    };
  }, [compareSlots]);

  const fmtDiff = (value: number, digits = 2) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toLocaleString('ja-JP', {
      maximumFractionDigits: digits,
      minimumFractionDigits: 0,
    })}`;
  };

  // ==========================================
  //  TAB 2: 門型ラーメン (D値法)
  //  TAB 3: 梁の検討 (木造/S造)
  // ==========================================
  type BeamSupport = 'simple' | 'fixed' | 'cantilever';
  type LoadType = 'uniform' | 'center';

  // --- 梁の検討タブ用 State ---
  const [beamSpan, setBeamSpan] = useState<number>(3000); // L (mm)
  const [beamLoad, setBeamLoad] = useState<number>(10);   // w(kN/m) or P(kN)
  const [beamE, setBeamE] = useState<number>(205000);     // N/mm2
  const [beamIx, setBeamIx] = useState<number>(8500);     // cm4 (入力用)
  const [beamSupport, setBeamSupport] = useState<BeamSupport>('simple');
  const [loadType, setLoadType] = useState<LoadType>('uniform');
  
  // 単純梁タブ用の追加ステート（断面自動計算用）
  const [beamWidth, setBeamWidth] = useState<number>(105); // 梁幅 (mm)
  const [beamHeight, setBeamHeight] = useState<number>(240); // 梁成 (mm)
  const [beamLoadNpm, setBeamLoadNpm] = useState<number>(2000); // 等分布荷重 (N/m)
  const [useAutoSection, setUseAutoSection] = useState<boolean>(true); // 断面自動計算を使用するか
  // 木造(製材・無等級材)の材料。2026-11-16 監査で差し替え
  //   Fb・Fs: 平成12年建設省告示第1452号 第五号(無等級材)の表(国交省 告示 PDF で確認。令和8年告示336号の改正は枠組壁工法材のみで無等級材は変わらない)
  //     べいまつ(あかまつ・くろまつと同じ欄) Fb 28.2 / Fs 2.4、ひのき(からまつ・ひば等と同じ欄) 26.7 / 2.1、すぎ(もみ・えぞまつ等と同じ欄) 22.2 / 1.8
  //   E: 日本建築学会「木質構造設計規準」の無等級材の値(すぎ 7.0・ひのき 9.0・べいまつ 10.0 kN/mm²)
  //   旧版は「曲げ許容応力度の目安 22 N/mm²」で判定していたが、22.2 はすぎの基準強度 Fb そのもので、
  //   長期許容応力度 1.1Fb/3 = 8.1 N/mm² の 2.7 倍。危険側の誤りだった
  const WOOD_SPECIES = {
    SUGI: { label: 'すぎ(無等級材)', E: 7000, Fb: 22.2, Fs: 1.8 },
    HINOKI: { label: 'ひのき(無等級材)', E: 9000, Fb: 26.7, Fs: 2.1 },
    BEIMATSU: { label: 'べいまつ(無等級材)', E: 10000, Fb: 28.2, Fs: 2.4 },
  } as const;
  type WoodKey = keyof typeof WOOD_SPECIES | 'CUSTOM';
  const [beamWood, setBeamWood] = useState<WoodKey>('BEIMATSU');
  const [customE, setCustomE] = useState<number>(10000);
  const [customFb, setCustomFb] = useState<number>(28.2);
  const [customFs, setCustomFs] = useState<number>(2.4);
  // 断面性能を直接入れるとき(S造など)の応力度の確認。空欄なら応力度は判定しない
  const [beamZx, setBeamZx] = useState<string>('');
  const [beamFb, setBeamFb] = useState<string>('');
  // 変形増大係数(平成12年建設省告示第1459号): 木造 2、鉄骨造 1
  const [beamCreep, setBeamCreep] = useState<number>(1);

  // N値計算(金物)タブ用のステート
  // 告示1460号第二号ただし書の「N値計算法」: N = A1×B1 − L(平屋・2階建ての2階)、N = A1×B1 + A2×B2 − L(2階建ての1階)
  // A1 = 当該柱の両側の壁倍率の差 + 筋かいの補正値、A2 = 上の 2 階の柱の同じ値
  const [nValueWall1, setNValueWall1] = useState<number>(2.5); // 当該階 片側の壁倍率
  const [nValueWall2, setNValueWall2] = useState<number>(0); // 当該階 反対側の壁倍率
  const [nValueCorr1, setNValueCorr1] = useState<number>(0); // 当該階 筋かいの補正値
  const [nValueWall3, setNValueWall3] = useState<number>(0); // 2階 片側
  const [nValueWall4, setNValueWall4] = useState<number>(0); // 2階 反対側
  const [nValueCorr2, setNValueCorr2] = useState<number>(0); // 2階 補正値
  const [nValuePositionType, setNValuePositionType] = useState<'CORNER' | 'General'>('CORNER'); // 柱の位置
  const [nValueFloorType, setNValueFloorType] = useState<'TOP' | 'OTHER'>('TOP'); // 階層

  // 集中荷重タブ用のState
  const [plP, setPlP] = useState<number>(10);    // 荷重 P (kN)
  const [plL, setPlL] = useState<number>(4000);  // スパン L (mm)
  const [plA, setPlA] = useState<number>(1500);  // 位置 a (mm)
  const [plE, setPlE] = useState<number>(205000); // E (N/mm2)
  const [plI, setPlI] = useState<number>(2000);   // I (cm4)

  // 接合部の仕様(平成12年建設省告示第1460号 表三 (い)〜(ぬ))と、N値計算法で各仕様が受け持てる N値の上限
  // 2026-11-16 監査で差し替え。旧版は記号と金物がずれ((い)を VP/CP-L、(は)を HD-10 としていた)、N≦0 を「不要」としていた。
  // N値の上限は (財)日本住宅・木材技術センター「木造住宅の接合部の設計」の N値計算法の表。
  // 計算例(日本木造住宅産業協会の資料: N=3.0→(ち)、1.9→(と)、1.65→(へ)、0.9→(は)、−0.35→(い))で照合
  const HARDWARE_TYPES = [
    { label: '(い)', spec: '短ほぞ差し・かすがい打ち', max: 0.0 },
    { label: '(ろ)', spec: '長ほぞ差し込み栓打ち・かど金物 CP-L', max: 0.65 },
    { label: '(は)', spec: 'かど金物 CP-T・山形プレート VP', max: 1.0 },
    { label: '(に)', spec: '羽子板ボルト・短ざく金物(スクリュー釘なし)', max: 1.4 },
    { label: '(ほ)', spec: '羽子板ボルト・短ざく金物(スクリュー釘あり)', max: 1.6 },
    { label: '(へ)', spec: '引き寄せ金物 HD-B10・S-HD10(10kN)', max: 1.8 },
    { label: '(と)', spec: '引き寄せ金物 HD-B15・S-HD15(15kN)', max: 2.8 },
    { label: '(ち)', spec: '引き寄せ金物 HD-B20・S-HD20(20kN)', max: 3.7 },
    { label: '(り)', spec: '引き寄せ金物 HD-B25・S-HD25(25kN)', max: 4.7 },
    { label: '(ぬ)', spec: '引き寄せ金物 HD-B15・S-HD15 × 2 組(30kN)', max: 5.6 },
  ];

  // N値計算ロジック
  const nValueResult = useMemo(() => {
    const corner = nValuePositionType === 'CORNER';
    const top = nValueFloorType === 'TOP';
    // B1・B2: 出隅 0.8 / その他 0.5。L: 平屋・最上階 出隅 0.4 / その他 0.6、2階建ての1階 出隅 1.0 / その他 1.6
    const coef = corner ? 0.8 : 0.5;
    const L_correction = top ? (corner ? 0.4 : 0.6) : (corner ? 1.0 : 1.6);
    const f = (v: number) => (Number.isFinite(v) ? v : 0);
    const A1 = Math.abs(f(nValueWall1) - f(nValueWall2)) + f(nValueCorr1);
    const A2 = top ? 0 : Math.abs(f(nValueWall3) - f(nValueWall4)) + f(nValueCorr2);
    const nValue = A1 * coef + (top ? 0 : A2 * coef) - L_correction;
    const resultHardware = HARDWARE_TYPES.find((h) => nValue <= h.max + 1e-9) ?? null; // 5.6 を超えると告示の仕様に無い
    return { nValue, resultHardware, coef, L_correction, A1, A2, top };
  }, [nValueWall1, nValueWall2, nValueCorr1, nValueWall3, nValueWall4, nValueCorr2, nValuePositionType, nValueFloorType]);

  // 集中荷重計算ロジック
  const plResults = useMemo(() => {
    const P = plP;
    const l = plL;
    const a = plA;
    const b = l - a;
    const E = plE;
    const I = plI * 10000; // cm4 -> mm4
    // 荷重点はスパンの内側(0 < a < L)。外れると b が負になり式が成り立たない
    const valid = [P, l, a, E, I].every(Number.isFinite) && l > 0 && a > 0 && a < l && E > 0 && I > 0;
    if (!valid) return { RA: NaN, RB: NaN, MC: NaN, deltaC: NaN, deltaMax: NaN, x0: NaN, valid };

    const RA = (P * b) / l;
    const RB = (P * a) / l;
    const MC = (P * a * b) / l; // kN・mm
    const deltaC = (P * 1000 * Math.pow(a, 2) * Math.pow(b, 2)) / (3 * E * I * l);

    // 最大たわみ位置 x0 (条件: a > b)
    let x0 = 0;
    let deltaMax = 0;
    if (a >= b) {
      x0 = Math.sqrt((a / 3) * (a + 2 * b));
      deltaMax = (P * 1000 * b * Math.pow(a * a + 2 * a * b, 1.5)) / (9 * Math.sqrt(3) * E * I * l);
    } else {
      // b > a の場合は対称に計算
      const a_rev = b;
      const b_rev = a;
      const x0_rev = Math.sqrt((a_rev / 3) * (a_rev + 2 * b_rev));
      x0 = l - x0_rev;
      deltaMax = (P * 1000 * b_rev * Math.pow(a_rev * a_rev + 2 * a_rev * b_rev, 1.5)) / (9 * Math.sqrt(3) * E * I * l);
    }

    return { RA, RB, MC: MC / 1000, deltaC, deltaMax, x0, valid };
  }, [plP, plL, plA, plE, plI]);

  // --- B. 門型ラーメン (D値法近似) State ---
  const [portalH, setPortalH] = useState<number>(3000); // mm
  const [portalL, setPortalL] = useState<number>(6000); // mm
  const [portalQ, setPortalQ] = useState<number>(20);   // 水平力 Q (kN)
  const [colIx, setColIx] = useState<number>(10000);    // 柱 I (cm4)
  const [beamIxVal, setBeamIxVal] = useState<number>(15000); // 梁 I (cm4)
  const [portalE, setPortalE] = useState<number>(205000);
  const [colBase, setColBase] = useState<'fixed'|'pin'>('fixed'); // 柱脚

  // 既存の簡易層間変形計算用State（後方互換性のため保持）
  const [storyH, setStoryH] = useState<number>(3000); // mm
  const [lateralW, setLateralW] = useState<number>(10); // kN
  const [nCols, setNCols] = useState<number>(2);
  const [E, setE] = useState<number>(205000); // N/mm2 (鋼)
  const [Icol, setIcol] = useState<number>(8.5e8); // mm4 (例)
  const [bayL, setBayL] = useState<number>(6000); // mm
  const [hasBrace, setHasBrace] = useState<boolean>(true);

  // 単純梁タブ用の断面性能自動計算
  const beamSectionResults = useMemo(() => {
    if (!useAutoSection) return null;
    // 断面二次モーメント I = bh^3 / 12
    const I = (beamWidth * Math.pow(beamHeight, 3)) / 12;
    // 断面係数 Z = bh^2 / 6
    const Z = (beamWidth * Math.pow(beamHeight, 2)) / 6;
    return { I, Z };
  }, [useAutoSection, beamWidth, beamHeight]);

  // 単一部材計算ロジック
  const wood = beamWood === 'CUSTOM' ? { label: 'その他', E: customE, Fb: customFb, Fs: customFs } : WOOD_SPECIES[beamWood];
  const beamResults = useMemo(() => {
    const L = beamSpan; // mm
    const E = useAutoSection ? wood.E : beamE;    // N/mm2
    const I = useAutoSection && beamSectionResults
      ? beamSectionResults.I
      : beamIx * 10000; // cm4 -> mm4

    // 荷重変換: kN, m -> N, mm
    // 等分布 w (kN/m) = w (N/mm)。木造(断面自動)の等分布は画面で N/m を入れるので 1/1000 して N/mm
    // 集中 P (kN) = P * 1000 (N)
    // 旧版は木造の等分布で N/m 欄(beamLoadNpm)を計算に使わず、隠れた kN/m 欄(既定 10 kN/m)で計算していた
    const w = useAutoSection && loadType === 'uniform' ? beamLoadNpm / 1000 : beamLoad; // N/mm (等分布)
    const P = beamLoad * 1000; // N (集中)

    let Mmax = 0; // N.mm
    let Qmax = 0; // N
    let Delta = 0; // mm

    if (beamSupport === 'simple') {
      if (loadType === 'uniform') {
        // 単純梁・等分布: M = wL^2/8, Q = wL/2, d = 5wL^4 / 384EI
        Mmax = (w * L * L) / 8;
        Qmax = (w * L) / 2;
        Delta = (5 * w * Math.pow(L, 4)) / (384 * E * I);
      } else {
        // 単純梁・中央集中: M = PL/4, Q = P/2, d = PL^3 / 48EI
        Mmax = (P * L) / 4;
        Qmax = P / 2;
        Delta = (P * Math.pow(L, 3)) / (48 * E * I);
      }
    } else if (beamSupport === 'fixed') {
      if (loadType === 'uniform') {
        // 両端固定・等分布: M端 = wL^2/12, M中 = wL^2/24, Q = wL/2, d = wL^4 / 384EI
        Mmax = (w * L * L) / 12; // 端部モーメントを採用
        Qmax = (w * L) / 2;
        Delta = (w * Math.pow(L, 4)) / (384 * E * I);
      } else {
        // 両端固定・中央集中: M = PL/8, Q = P/2, d = PL^3 / 192EI
        Mmax = (P * L) / 8;
        Qmax = P / 2;
        Delta = (P * Math.pow(L, 3)) / (192 * E * I);
      }
    } else if (beamSupport === 'cantilever') {
      if (loadType === 'uniform') {
        // 片持ち・等分布: M = wL^2/2, Q = wL, d = wL^4 / 8EI
        Mmax = (w * L * L) / 2;
        Qmax = w * L;
        Delta = (w * Math.pow(L, 4)) / (8 * E * I);
      } else {
        // 片持ち・先端集中: M = PL, Q = P, d = PL^3 / 3EI
        Mmax = P * L;
        Qmax = P;
        Delta = (P * Math.pow(L, 3)) / (3 * E * I);
      }
    }

    // 判定(長期)
    // たわみ: 平成12年建設省告示第1459号 たわみ × 変形増大係数 / スパン ≦ 1/250(木造 2、鉄骨造 1)
    //   旧版は係数なしの L/300 で、木造のクリープ(係数 2)を見ていなかった
    // 曲げ・せん断: 令89条 長期許容応力度 1.1F/3(木材)。せん断応力度は長方形断面で 1.5Q/A
    const creep = useAutoSection ? 2 : beamCreep;
    const limitDelta = L / 250 / creep; // 素のたわみで比べる上限
    const Z = useAutoSection && beamSectionResults ? beamSectionResults.Z : (parseFloat(beamZx) || 0) * 1000; // mm3
    const fb = useAutoSection ? (1.1 * wood.Fb) / 3 : parseFloat(beamFb) || 0;
    const fs = useAutoSection ? (1.1 * wood.Fs) / 3 : 0;
    const sigma = Z > 0 ? Mmax / Z : 0;
    const tau = useAutoSection && beamWidth > 0 && beamHeight > 0 ? (1.5 * Qmax) / (beamWidth * beamHeight) : 0;
    const sigmaChecked = Z > 0 && fb > 0;
    const tauChecked = useAutoSection && fs > 0;
    const valid = [L, E, I, w, P].every(Number.isFinite) && L > 0 && E > 0 && I > 0;

    return {
      M_kNm: Mmax / 1000000,
      Q_kN: Qmax / 1000,
      Delta_mm: Delta,
      sigma: sigma,
      tau,
      isDeltaSafe: Delta <= limitDelta,
      isSigmaSafe: !sigmaChecked || sigma <= fb,
      isTauSafe: !tauChecked || tau <= fs,
      sigmaChecked,
      tauChecked,
      limitDelta: limitDelta,
      limitSigma: fb,
      limitTau: fs,
      creep,
      E,
      valid,
      I: I,
      Z
    };
  }, [beamSpan, beamLoad, beamE, beamIx, beamSupport, loadType, useAutoSection, beamSectionResults, beamLoadNpm, wood, beamZx, beamFb, beamCreep, beamWidth, beamHeight]);

  // ラーメン計算ロジック
  const portalResults = useMemo(() => {
    // 剛度 k = I / L (cm3)
    const kc = colIx / portalH; // 柱剛度 (cm3)
    const kb = beamIxVal / portalL; // 梁剛度 (cm3)
    
    // 剛比 k_bar = kb / kc
    const k_bar = kb / kc;

    // 1 層 1 スパンの対称な門型は、たわみ角法で解ける(柱・梁の曲げ変形のみ。軸・せん断変形は無視)。2026-11-16 監査で差し替え
    //   柱脚固定: 柱の水平剛性 = a·12EIc/H³、a = (0.5 + 3k)/(2 + 3k)
    //             柱脚 M = Qc·H·(1 + 3k)/(1 + 6k)、柱頭 M = Qc·H·3k/(1 + 6k)(和 = Qc·H)
    //   柱脚ピン: a = 0.5k/(1 + 2k)、柱脚 M = 0、柱頭 M = Qc·H
    // 2D 骨組の剛性マトリクス解で照合済み(H 3m・L 6m・Ic 10000・Ib 15000 cm⁴・Q 20kN で δ 1.70mm、柱脚 17.7・柱頭 12.3 kN·m)。
    // 旧版は D値法の a(固定で (0.5+k)/(2+k)、多層骨組向けの略算で 1 層門型では剛性を低く見る)を使い、
    // 柱脚 M を常に Qc·H/2、柱頭 M を Qc·H·k/(2k+1) としていた(柱頭+柱脚が Qc·H にならない誤り)
    let a = 0;
    let aDvalue = 0; // 参考: 武藤の D値法の a
    if (colBase === 'fixed') {
      a = (0.5 + 3 * k_bar) / (2 + 3 * k_bar);
      aDvalue = (0.5 + k_bar) / (2 + k_bar);
    } else {
      a = (0.5 * k_bar) / (1 + 2 * k_bar);
      aDvalue = a;
    }

    // 柱1本あたりの負担せん断力 Qc
    const Qc = portalQ / 2;

    // 層剛性 (2本分)
    const Ic_mm4 = colIx * 10000;
    const K_col = a * (12 * portalE * Ic_mm4) / Math.pow(portalH, 3); // N/mm
    const K_total = K_col * 2; // 2本分

    const drift_mm = (portalQ * 1000) / K_total;
    const ratio = 1 / (drift_mm > 0 ? portalH / drift_mm : 9999);

    // モーメント (kNm)
    let Mc_btm = 0;
    let Mc_top = 0;
    const QcH = Qc * (portalH / 1000);
    if (colBase === 'fixed') {
      Mc_btm = QcH * (1 + 3 * k_bar) / (1 + 6 * k_bar);
      Mc_top = QcH * (3 * k_bar) / (1 + 6 * k_bar);
    } else {
      Mc_btm = 0;
      Mc_top = QcH;
    }

    const Mb_end = Mc_top; // 節点釣り合い
    // 梁は逆対称に曲がるので、梁のせん断力 = 2·Mb / L、柱の軸力 = ±梁のせん断力(風上側が引張)
    const Qb = (2 * Mb_end) / (portalL / 1000);

    return {
      k_bar,
      a,
      aDvalue,
      drift_mm,
      ratio,
      Mc_top,
      Mc_btm,
      Mb_end,
      Qb,
      Qc
    };
  }, [portalH, portalL, portalQ, colIx, beamIxVal, portalE, colBase]);

  // 既存の簡易層間変形計算（後方互換性のため保持）
  const frameResults = useMemo(() => {
    // 1層ラーメン近似: 各柱固定端、上部剛梁 → 各柱の横剛性 k = 12EI/H^3
    // 層せん断剛性 K = nCols * 12 E I / H^3, 層間変形 δ = W / K
    const H = storyH;
    const WkN = lateralW; // kN
    const W = WkN * 1000; // N
    const EI = E * Icol; // N·mm2
    const K_story = nCols > 0 ? (nCols * 12 * EI) / Math.pow(H, 3) : 0; // N/mm
    const driftMm = K_story > 0 ? W / K_story : 0;
    const driftRatio = H > 0 ? driftMm / H : 0;
    const Vcol_kN = nCols > 0 ? WkN / nCols : 0;

    // ブレースが有る場合の簡易軸力: 単一対角（テンションブレース）想定
    // 角度θ = atan(H/L)(水平からの角度)。水平力 W はブレース軸力 T の水平成分 T·cosθ で抵抗 → T = W / cosθ
    // (旧版は W / sinθ で、水平成分と鉛直成分を取り違えていた。この計算は画面には出していない)
    const theta = Math.atan2(H, bayL);
    const cosT = Math.cos(theta);
    const braceAxial_kN = hasBrace && cosT > 0 ? WkN / cosT : 0;

    return { driftMm, driftRatio, Vcol_kN, braceAxial_kN, thetaDeg: (theta * 180) / Math.PI };
  }, [storyH, lateralW, nCols, E, Icol, bayL, hasBrace]);

  // 数値フォーマット（指数表記を避ける）
  return (
    <div className="bg-white rounded-b-lg shadow-sm border-b border-gray-100">
      {/* Header & Tabs */}
      {!hideTabBar && (
      <div className="border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div className="p-4 pb-0">
          <div>
            <h3 className="text-[13px] font-medium">構造計算ツール</h3>
            <p className="text-[11px] mt-0.5 opacity-80">建築実務で使える計算・検討ツール集</p>
          </div>
          <div className="mt-3">
            <div className="flex gap-1">
              <button
                onClick={() => setActive('section')}
                className={`px-4 py-2 text-xs rounded-t-lg transition-colors ${
                  active === 'section'
                    ? 'bg-white text-gray-800 font-bold'
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                }`}
              >
                断面性能
              </button>
              <button
                onClick={() => setActive('portal')}
                className={`px-4 py-2 text-xs rounded-t-lg transition-colors ${
                  active === 'portal'
                    ? 'bg-white text-gray-800 font-bold'
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                }`}
              >
                門型ラーメン (水平力)
              </button>
              <button
                onClick={() => setActive('beam')}
                className={`px-4 py-2 text-xs rounded-t-lg transition-colors ${
                  active === 'beam'
                    ? 'bg-white text-gray-800 font-bold'
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                }`}
              >
                梁の検討 (木造/S造)
              </button>
              <button
                onClick={() => setActive('nvalue')}
                className={`px-4 py-2 text-xs rounded-t-lg transition-colors ${
                  active === 'nvalue'
                    ? 'bg-white text-gray-800 font-bold'
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                }`}
              >
                N値計算(金物)
              </button>
              <button
                onClick={() => {
                  setActive('formulas');
                  setSelectedPattern(null); // タブ切り替え時にパターン選択画面に戻る
                }}
                className={`px-4 py-2 text-xs rounded-t-lg transition-colors ${
                  active === 'formulas'
                    ? 'bg-white text-gray-800 font-bold'
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                }`}
              >
                公式集
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      <div className="p-4 text-[12px] text-gray-700">
        {active === 'section' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-[11px]">断面種類</label>
              <select 
                value={sectionType} 
                onChange={e=>setSectionType(e.target.value as SectionType)} 
                onClick={(e) => {
                  if (!isLoggedIn) {
                    alert('入力するには会員登録（無料）が必要です。');
                    e.preventDefault();
                  }
                }}
                className="px-2 py-1 border rounded text-[12px]"
              >
                <option value="rectangle">長方形</option>
                <option value="circle">円形</option>
                <option value="hshape">H形鋼</option>
              </select>
            </div>

            {sectionType==='rectangle' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <label className="flex items-center gap-1">b(mm)<input 
                  type="number" 
                  value={rectB} 
                  onChange={e=>setRectB(parseFloat(e.target.value))} 
                  onClick={(e) => {
                    if (!isLoggedIn) {
                      alert('入力するには会員登録（無料）が必要です。');
                      e.preventDefault();
                    }
                  }}
                  className="w-24 px-2 py-1 border rounded"
                /></label>
                <label className="flex items-center gap-1">h(mm)<input 
                  type="number" 
                  value={rectH} 
                  onChange={e=>setRectH(parseFloat(e.target.value))} 
                  onClick={(e) => {
                    if (!isLoggedIn) {
                      alert('入力するには会員登録（無料）が必要です。');
                      e.preventDefault();
                    }
                  }}
                  className="w-24 px-2 py-1 border rounded"
                /></label>
              </div>
            )}
            {sectionType==='circle' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <label className="flex items-center gap-1">d(mm)<input 
                  type="number" 
                  value={circD} 
                  onChange={e=>setCircD(parseFloat(e.target.value))} 
                  onClick={(e) => {
                    if (!isLoggedIn) {
                      alert('入力するには会員登録（無料）が必要です。');
                      e.preventDefault();
                    }
                  }}
                  className="w-24 px-2 py-1 border rounded"
                /></label>
              </div>
            )}
            {sectionType==='hshape' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="inline-flex items-center gap-2 text-[11px]"><input 
                    type="checkbox" 
                    checked={hCatalogMode} 
                    onChange={e=>setHCatalogMode(e.target.checked)} 
                    onClick={(e) => {
                      if (!isLoggedIn) {
                        alert('入力するには会員登録（無料）が必要です。');
                        e.preventDefault();
                      }
                    }}
                  />規格選択を使う</label>
                  {hCatalogMode && (
                    <>
                      <label className="flex items-center gap-1">シリーズ
                        <select 
                          value={hSeries} 
                          onChange={e=>setHSeries(e.target.value as any)} 
                          onClick={(e) => {
                            if (!isLoggedIn) {
                              alert('入力するには会員登録（無料）が必要です。');
                              e.preventDefault();
                            }
                          }}
                          className="px-2 py-1 border rounded text-[12px]"
                        >
                          <option value="HN">{hSeriesLabel.HN}</option>
                          <option value="HM">{hSeriesLabel.HM}</option>
                          <option value="HW">{hSeriesLabel.HW}</option>
                        </select>
                      </label>
                      <label className="flex items-center gap-1">呼称
                        <select 
                          value={hCallName} 
                          onChange={e=>{ setHCallName(e.target.value); setHSizeIndex(0); }} 
                          onClick={(e) => {
                            if (!isLoggedIn) {
                              alert('入力するには会員登録（無料）が必要です。');
                              e.preventDefault();
                            }
                          }}
                          className="px-2 py-1 border rounded text-[12px]"
                        >
                          {callNamesInSeries.map(name => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      </label>
                      <label className="flex items-center gap-1">サイズ
                        <select 
                          value={hSizeIndex} 
                          onChange={e=>{
                            const idx = parseInt(e.target.value);
                            setHSizeIndex(idx);
                            const items = catalogEntries.filter(e=>e.series===hSeries && getCallName(e)===(hCallName || callNamesInSeries[0]));
                            const item = items[idx];
                            if (item) { setHH(item.H); setHB(item.B); setHtw(item.tw); setHtf(item.tf); if (typeof item.r === 'number' && !Number.isNaN(item.r)) setHRootR(item.r as number); }
                          }} 
                          onClick={(e) => {
                            if (!isLoggedIn) {
                              alert('入力するには会員登録（無料）が必要です。');
                              e.preventDefault();
                            }
                          }}
                          className="px-2 py-1 border rounded text-[12px]"
                        >
                          {catalogEntries.filter(e=>e.series===hSeries && getCallName(e)===(hCallName || callNamesInSeries[0])).map((s, i) => {
                            const withR = (typeof s.r === 'number' && !Number.isNaN(s.r)) ? `${s.label}(r${s.r})` : s.label;
                            return (
                              <option key={s.label} value={i}>{withR}</option>
                            );
                          })}
                        </select>
                      </label>
                    </>
                  )}
                </div>
                {hCatalogMode && (
                  <div className="space-y-2">
                    <textarea 
                      value={csvText} 
                      onChange={e=>setCsvText(e.target.value)} 
                      onClick={(e) => {
                        if (!isLoggedIn) {
                          alert('入力するには会員登録（無料）が必要です。');
                          e.preventDefault();
                        }
                      }}
                      placeholder={
                      "series,label,H,B,tw,tf,r,A_cm2,unitWeightKgPerM,Ix_cm4,Iy_cm4,ix_cm,iy_cm,Zx_cm3,Zy_cm3,ib,eta,lb_m,wtClassColumn,wtClassBeam,Zxe_cm3,Zye_cm3,Ae_cm2,Zpx_cm3,Zpy_cm3,callName\n" +
                      "HW,H-300×300×10×15,300,300,10,15,13,118.5,93.0,1350,1350,10.7,10.7,450,683,1.10(1.05),1.03(1.01),8.5(7.8),B-1,B-1,420,420,110.0,480,480,H-300×300"
                    } className="w-full border rounded p-2 text-[11px]" rows={3} />
                    <button onClick={importCsv} className="yy-btn">CSVインポート</button>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <label className={`flex items-center gap-1 ${hCatalogMode? 'opacity-60' : ''}`}>H(mm)
                    <input
                      type="number"
                      value={hH}
                      onChange={e=>setHH(parseFloat(e.target.value))}
                      onClick={(e) => {
                        if (!isLoggedIn) {
                          alert('入力するには会員登録（無料）が必要です。');
                          e.preventDefault();
                        }
                      }}
                      className={`w-24 px-2 py-1 border rounded ${hCatalogMode? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed' : ''}`}
                      disabled={hCatalogMode}
                    />
                  </label>
                  <label className={`flex items-center gap-1 ${hCatalogMode? 'opacity-60' : ''}`}>B(mm)
                    <input
                      type="number"
                      value={hB}
                      onChange={e=>setHB(parseFloat(e.target.value))}
                      onClick={(e) => {
                        if (!isLoggedIn) {
                          alert('入力するには会員登録（無料）が必要です。');
                          e.preventDefault();
                        }
                      }}
                      className={`w-24 px-2 py-1 border rounded ${hCatalogMode? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed' : ''}`}
                      disabled={hCatalogMode}
                    />
                  </label>
                  <label className={`flex items-center gap-1 ${hCatalogMode? 'opacity-60' : ''}`}>t<wbr/>w(mm)
                    <input
                      type="number"
                      value={htw}
                      onChange={e=>setHtw(parseFloat(e.target.value))}
                      onClick={(e) => {
                        if (!isLoggedIn) {
                          alert('入力するには会員登録（無料）が必要です。');
                          e.preventDefault();
                        }
                      }}
                      className={`w-24 px-2 py-1 border rounded ${hCatalogMode? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed' : ''}`}
                      disabled={hCatalogMode}
                    />
                  </label>
                  <label className={`flex items-center gap-1 ${hCatalogMode? 'opacity-60' : ''}`}>t<wbr/>f(mm)
                    <input
                      type="number"
                      value={htf}
                      onChange={e=>setHtf(parseFloat(e.target.value))}
                      onClick={(e) => {
                        if (!isLoggedIn) {
                          alert('入力するには会員登録（無料）が必要です。');
                          e.preventDefault();
                        }
                      }}
                      className={`w-24 px-2 py-1 border rounded ${hCatalogMode? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed' : ''}`}
                      disabled={hCatalogMode}
                    />
                  </label>
                  <label className={`flex items-center gap-1 ${hCatalogMode? 'opacity-60' : ''}`}>r(mm)
                    <input
                      type="number"
                      value={hRootR}
                      onChange={e=>setHRootR(parseFloat(e.target.value))}
                      onClick={(e) => {
                        if (!isLoggedIn) {
                          alert('入力するには会員登録（無料）が必要です。');
                          e.preventDefault();
                        }
                      }}
                      className={`w-24 px-2 py-1 border rounded ${hCatalogMode? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed' : ''}`}
                      disabled={hCatalogMode}
                    />
                  </label>
                </div>
              </div>
            )}

            {(sectionType==='hshape' && hCatalogMode) ? (
              <div className="p-3 border rounded bg-gray-50">
                {(() => {
                  const it = catalogEntries.filter(e=>e.series===hSeries && getCallName(e)===(hCallName || callNamesInSeries[0]))[hSizeIndex];
                  if (!it) return <div className="text-[10px] text-gray-500">カタログデータがありません</div>;
                  const call = getCallName(it);
                  const show = (v?: number) => (typeof v === 'number' && Number.isFinite(v)) ? String(v) : '—';
                  const lbStr = () => {
                    if (it.lb_m_text) {
                      // 入力文字列を優先（例: 4.54(3.29)）
                      return it.lb_m_text.includes('m') ? it.lb_m_text : `${it.lb_m_text} m`;
                    }
                    const a = typeof it.lb_m_sn400 === 'number' ? `${String(it.lb_m_sn400)} m` : '—';
                    const b = typeof it.lb_m_sn490 === 'number' ? `${String(it.lb_m_sn490)} m` : undefined;
                    return b ? `${a} (${b})` : a;
                  };
                  const ibSingle = (typeof it.ib_sn400 === 'number') ? it.ib_sn400 : (typeof it.ib_sn490 === 'number' ? it.ib_sn490 : undefined);
                  const etaSingle = (typeof it.eta_sn400 === 'number') ? it.eta_sn400 : (typeof it.eta_sn490 === 'number' ? it.eta_sn490 : undefined);
                  return (
                    <>
                      <div>呼称: {call}</div>
                      <div>寸法 H,B,t1,t2,r(mm): {fmt(it.H,0)}, {fmt(it.B,0)}, {fmt(it.tw,1)}, {fmt(it.tf,1)}, {it.r!==undefined?fmt(it.r,0):'—'}</div>
                      <div>断面積 (cm²): {it.A_cm2_text ?? show(it.A_cm2)}</div>
                      <div>単位質量 (kg/m): {it.unitWeightKgPerM_text ?? show(it.unitWeightKgPerM)}</div>
                      <div>断面二次モーメント (cm⁴) Ix,Iy: {it.Ix_cm4_text ?? show(it.Ix_cm4)}, {it.Iy_cm4_text ?? show(it.Iy_cm4)}</div>
                      <div>断面二次半径 (cm) ix,iy: {it.ix_cm_text ?? show(it.ix_cm)}, {it.iy_cm_text ?? show(it.iy_cm)}</div>
                      <div>断面係数 (cm³) Zx,Zy: {it.Zx_cm3_text ?? show(it.Zx_cm3)}, {it.Zy_cm3_text ?? show(it.Zy_cm3)}</div>
                      <div>曲げ応力用 ib: {it.ib_text ?? show(ibSingle)}</div>
                      <div>曲げ応力用 η: {it.eta_text ?? show(etaSingle)}</div>
                      <div>最大横座屈 lb: {lbStr()}</div>
                      <div>幅厚比種別 柱,梁: {it.wtClassColumn || '—'}, {it.wtClassBeam || '—'}</div>
                      <div>有効断面性能 Zxe(cm³),Zye(cm³),Ae(cm²): {it.Zxe_cm3_text ?? show(it.Zxe_cm3)}, {it.Zye_cm3_text ?? show(it.Zye_cm3)}, {it.Ae_cm2_text ?? show(it.Ae_cm2)}</div>
                      <div>塑性断面係数 (cm³) Zpx,Zpy: {it.Zpx_cm3_text ?? show(it.Zpx_cm3)}, {it.Zpy_cm3_text ?? show(it.Zpy_cm3)}</div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 border rounded bg-gray-50">
                    <div className="font-semibold text-sm text-gray-800 mb-1">算出断面（現在）</div>
                    <div>断面積 A: {fmt(sectionResults.areaMm2,0)} mm² ({fmt(sectionResults.areaCm2,2)} cm²)</div>
                    <div>断面二次モーメント Ix: {fmt(sectionResults.IxMm4,0)} mm⁴ ({fmt(sectionResults.IxCm4,0)} cm⁴)</div>
                    <div>断面二次モーメント Iy: {fmt(sectionResults.IyMm4,0)} mm⁴ ({fmt(sectionResults.IyCm4,0)} cm⁴)</div>
                    <div>断面係数 Zx: {fmt(sectionResults.ZxMm3,0)} mm³ ({fmt(sectionResults.ZxCm3,0)} cm³)</div>
                    <div>断面係数 Zy: {fmt(sectionResults.ZyMm3,0)} mm³ ({fmt(sectionResults.ZyCm3,0)} cm³)</div>
                    <div>断面二次半径 ix / iy: {fmt(sectionResults.ixCm,2)} / {fmt(sectionResults.iyCm,2)} cm</div>
                    <div>鋼材とした場合の単位質量: {fmt(sectionResults.unitWeightKgPerM,2)} kg/m <span className="text-[10px] text-gray-500">(7.85 t/m³。木材・RC には使えません)</span></div>
                    {sectionType==='hshape' && (
                      <div className="text-[10px] text-gray-500">寸法入力の H 形鋼は、フランジとウェブの長方形の合成です。フィレット r は断面積にだけ入れ、I・Z には入れていません(カタログ値よりわずかに小さく出ます)。</div>
                    )}
                    {sectionType==='rectangle' && (
                      <div className="text-[10px] text-gray-500">x 軸 = h 方向に曲げる軸(Ix = bh³/12)。木材の欠き込み・ボルト孔による欠損は引いていません。</div>
                    )}
                  </div>
                  <div className="p-3 border rounded bg-gray-50">
                    {hCatalogMode ? (
                      <>
                        <div className="font-medium">カタログ値（JFE等）</div>
                        <div>単位重量: {(() => {
                          const it = catalogEntries.filter(e=>e.series===hSeries && getCallName(e)===(hCallName || callNamesInSeries[0]))[hSizeIndex];
                          return it?.unitWeightKgPerM ? `${fmt(it.unitWeightKgPerM,1)} kg/m` : '—';
                        })()}</div>
                        <div>Ix: {(() => {
                          const it = catalogEntries.filter(e=>e.series===hSeries && getCallName(e)===(hCallName || callNamesInSeries[0]))[hSizeIndex];
                          return it?.Ix_cm4 ? `${fmt(it.Ix_cm4,0)} cm⁴` : '—';
                        })()}</div>
                        <div>Iy: {(() => {
                          const it = catalogEntries.filter(e=>e.series===hSeries && getCallName(e)===(hCallName || callNamesInSeries[0]))[hSizeIndex];
                          return (it as any)?.Iy_cm4 ? `${fmt((it as any).Iy_cm4,0)} cm⁴` : '—';
                        })()}</div>
                        <div>Zx: {(() => {
                          const it = catalogEntries.filter(e=>e.series===hSeries && getCallName(e)===(hCallName || callNamesInSeries[0]))[hSizeIndex];
                          return it?.Zx_cm3 ? `${fmt(it.Zx_cm3,0)} cm³` : '—';
                        })()}</div>
                        <div>Zy: {(() => {
                          const it = catalogEntries.filter(e=>e.series===hSeries && getCallName(e)===(hCallName || callNamesInSeries[0]))[hSizeIndex];
                          return (it as any)?.Zy_cm3 ? `${fmt((it as any).Zy_cm3,0)} cm³` : '—';
                        })()}</div>
                      </>
                    ) : (
                      <div className="text-[10px] text-gray-500">カタログモードをONにすると規格値表示が可能です</div>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500 self-end">
                    注意: 規格選択ON時はカタログ値を使用、OFF時はH形鋼を矩形合成で近似します。
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {active === 'section' && (<>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
          <button
            onClick={() => captureComparison('A')}
            className="yy-btn"
          >
            現在の断面を比較Aに保存
          </button>
          <button
            onClick={() => captureComparison('B')}
            className="yy-btn"
          >
            現在の断面を比較Bに保存
          </button>
          {(compareSlots.A || compareSlots.B) && (
            <button
              onClick={() => clearComparison()}
              className="yy-dt-link"
            >
              比較データをクリア
            </button>
          )}
        </div>

        {(compareSlots.A || compareSlots.B) && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {compareSlots.A && (
              <div className="p-3 border rounded bg-white shadow-sm">
                <div className="font-semibold text-sm text-gray-800">比較A</div>
                <div className="text-[11px] text-gray-500 mb-2">{compareSlots.A.label}</div>
                <div>断面積: {fmt(compareSlots.A.areaMm2, 0)} mm² ({fmt(compareSlots.A.areaCm2, 2)} cm²)</div>
                <div>Ix: {fmt(compareSlots.A.IxMm4, 0)} mm⁴ ({fmt(compareSlots.A.IxCm4, 2)} cm⁴)</div>
                <div>Iy: {fmt(compareSlots.A.IyMm4, 0)} mm⁴ ({fmt(compareSlots.A.IyCm4, 2)} cm⁴)</div>
                <div>Zx: {fmt(compareSlots.A.ZxMm3, 0)} mm³ ({fmt(compareSlots.A.ZxCm3, 2)} cm³)</div>
                <div>Zy: {fmt(compareSlots.A.ZyMm3, 0)} mm³ ({fmt(compareSlots.A.ZyCm3, 2)} cm³)</div>
                <div>断面二次半径: ix {fmt(compareSlots.A.ixCm, 2)} cm / iy {fmt(compareSlots.A.iyCm, 2)} cm</div>
                <div>重量: {fmt(compareSlots.A.unitWeight, 2)} kg/m</div>
                <button
                  onClick={() => clearComparison('A')}
                  className="mt-2 text-[11px] text-red-500 hover:text-red-700"
                >
                  Aをクリア
                </button>
              </div>
            )}
            {compareSlots.B && (
              <div className="p-3 border rounded bg-white shadow-sm">
                <div className="font-semibold text-sm text-gray-800">比較B</div>
                <div className="text-[11px] text-gray-500 mb-2">{compareSlots.B.label}</div>
                <div>断面積: {fmt(compareSlots.B.areaMm2, 0)} mm² ({fmt(compareSlots.B.areaCm2, 2)} cm²)</div>
                <div>Ix: {fmt(compareSlots.B.IxMm4, 0)} mm⁴ ({fmt(compareSlots.B.IxCm4, 2)} cm⁴)</div>
                <div>Iy: {fmt(compareSlots.B.IyMm4, 0)} mm⁴ ({fmt(compareSlots.B.IyCm4, 2)} cm⁴)</div>
                <div>Zx: {fmt(compareSlots.B.ZxMm3, 0)} mm³ ({fmt(compareSlots.B.ZxCm3, 2)} cm³)</div>
                <div>Zy: {fmt(compareSlots.B.ZyMm3, 0)} mm³ ({fmt(compareSlots.B.ZyCm3, 2)} cm³)</div>
                <div>断面二次半径: ix {fmt(compareSlots.B.ixCm, 2)} cm / iy {fmt(compareSlots.B.iyCm, 2)} cm</div>
                <div>重量: {fmt(compareSlots.B.unitWeight, 2)} kg/m</div>
                <button
                  onClick={() => clearComparison('B')}
                  className="mt-2 text-[11px] text-red-500 hover:text-red-700"
                >
                  Bをクリア
                </button>
              </div>
            )}
            {compareSlots.A && compareSlots.B && diffSummary && (
              <div className="p-3 border rounded bg-indigo-50">
                <div className="font-semibold text-sm text-indigo-800">差分（B - A）</div>
                <div className="text-[11px] text-indigo-700">
                  <div>断面積差: {fmtDiff(diffSummary.areaMm2, 0)} mm² / {fmtDiff(diffSummary.areaCm2, 2)} cm²</div>
                  <div>Ix差: {fmtDiff(diffSummary.IxCm4, 2)} cm⁴</div>
                  <div>Iy差: {fmtDiff(diffSummary.IyCm4, 2)} cm⁴</div>
                  <div>Zx差: {fmtDiff(diffSummary.ZxCm3, 2)} cm³</div>
                  <div>Zy差: {fmtDiff(diffSummary.ZyCm3, 2)} cm³</div>
                  <div>二次半径差: ix {fmtDiff(diffSummary.ixCm, 2)} cm / iy {fmtDiff(diffSummary.iyCm, 2)} cm</div>
                  <div>重量差: {fmtDiff(diffSummary.unitWeight, 2)} kg/m</div>
                </div>
              </div>
            )}
          </div>
        )}

        </>)}

        {active === 'portal' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="yy-dt-split">
                
                {/* Input Area */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <p className="font-bold text-gray-700 mb-2">門型フレーム条件</p>
                    
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">階高 H (mm)</label>
                        <input
                          type="number"
                          value={portalH}
                          onChange={e => setPortalH(parseFloat(e.target.value))}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-right focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">スパン L (mm)</label>
                        <input
                          type="number"
                          value={portalL}
                          onChange={e => setPortalL(parseFloat(e.target.value))}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-right focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">柱断面 Ix (cm⁴)</label>
                        <input
                          type="number"
                          value={colIx}
                          onChange={e => setColIx(parseFloat(e.target.value))}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-right focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">梁断面 Ix (cm⁴)</label>
                        <input
                          type="number"
                          value={beamIxVal}
                          onChange={e => setBeamIxVal(parseFloat(e.target.value))}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-right bg-indigo-50 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="block text-[10px] text-gray-500 mb-1">柱脚条件</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setColBase('fixed')}
                          className={`flex-1 py-1 px-2 rounded border text-[11px] transition-colors ${colBase==='fixed' ? 'text-white' : 'bg-white'}`}
                        >
                          固定
                        </button>
                        <button
                          onClick={() => setColBase('pin')}
                          className={`flex-1 py-1 px-2 rounded border text-[11px] transition-colors ${colBase==='pin' ? 'text-white' : 'bg-white'}`}
                        >
                          ピン
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">水平荷重 Q (kN)</label>
                      <input
                        type="number"
                        value={portalQ}
                        onChange={e => setPortalQ(parseFloat(e.target.value))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-right font-bold text-gray-800 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Result Area */}
                <div className="space-y-4">
                  {Number.isFinite(portalResults.drift_mm) && portalResults.drift_mm > 0 ? (
                  <DtResult
                    label="解析結果 (たわみ角法) · 層間変形 δ"
                    value={portalResults.drift_mm.toFixed(2)}
                    unit="mm"
                    sub={`層間変形角 1/${portalResults.ratio.toFixed(0)}`}
                  >
                    <ResultRow k={<>剛比 <span className="font-serif italic">k</span> (梁 Ib/L ÷ 柱 Ic/H)</>} v={portalResults.k_bar.toFixed(2)} />
                    <ResultRow k="柱の剛性低減 a(参考: D値法の a)" v={`${portalResults.a.toFixed(3)}(${portalResults.aDvalue.toFixed(3)})`} />
                    <ResultRow k="柱せん断 Qc(1 本)" v={`${portalResults.Qc.toFixed(1)} kN`} />
                    <ResultRow k="柱頭の曲げ" v={`${portalResults.Mc_top.toFixed(1)} kN·m`} />
                    <ResultRow k="柱脚の曲げ" v={`${portalResults.Mc_btm.toFixed(1)} kN·m`} />
                    <ResultRow k="梁端の曲げ" v={`${portalResults.Mb_end.toFixed(1)} kN·m`} />
                    <ResultRow k="梁のせん断・柱の軸力(±)" v={`${portalResults.Qb.toFixed(1)} kN`} />
                  </DtResult>
                  ) : (
                    <p className="yy-dt-note">階高・スパン・柱と梁の Ix・水平荷重を入れてください。</p>
                  )}

                  <div className="text-[10px] text-gray-400 leading-tight">
                    ※ 1 層 1 スパン・左右対称の門型に、柱頭の高さで水平力 Q をかけたときの解です(たわみ角法。曲げ変形のみで、軸変形・せん断変形・パネルゾーン・P-Δ は見ていません)。鉛直荷重による応力は含みません。
                    <br/>※ 柱脚固定は完全固定です。露出柱脚など半固定の柱脚は、柱脚の回転剛性を入れた計算が要ります。
                    <br/>※ D値法(武藤)の a は多層骨組向けの略算で、1 層の門型では剛性を低めに見ます(参考値として併記)。
                    <br/>※ 層間変形角の制限 1/200(令82条の2)は地震力(一次設計)に対するものです。
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* 単純梁タブ */}
        {active === 'beam' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="mb-3">
              <label className="inline-flex items-center gap-2 text-[11px]">
                <input
                  type="checkbox"
                  checked={useAutoSection}
                  onChange={e => setUseAutoSection(e.target.checked)}
                  className="rounded"
                />
                木造の製材(長方形断面)で検討する(梁幅・梁成・樹種から算出)
              </label>
              <p className="text-[10px] text-gray-500 mt-0.5">外すと、E・Ix・Zx を直接入れて検討します(S造など)。</p>
            </div>

            <div className="yy-dt-split">
              
              {/* Input Area */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <p className="font-bold text-gray-700 mb-2">条件設定</p>
                  
                  <div className="mb-3">
                    <label className="block text-[10px] text-gray-500 mb-1">支持条件</label>
                    <div className="flex gap-2">
                      {[
                        { id: 'simple', label: '単純梁' },
                        { id: 'fixed', label: '両端固定' },
                        { id: 'cantilever', label: '片持ち' }
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setBeamSupport(m.id as BeamSupport)}
                          aria-pressed={beamSupport === m.id}
                          className={`yy-dt-opt flex-1 py-1.5 px-2 text-[11px]${beamSupport === m.id ? ' is-on' : ''}`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">スパン L (mm)</label>
                      <input
                        type="number"
                        value={beamSpan}
                        onChange={e => setBeamSpan(parseFloat(e.target.value))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-right focus:border-blue-500 outline-none"
                      />
                    </div>
                    {useAutoSection ? (
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">樹種</label>
                        <select
                          value={beamWood}
                          onChange={e => setBeamWood(e.target.value as WoodKey)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-[11px] bg-white"
                        >
                          {(Object.keys(WOOD_SPECIES) as (keyof typeof WOOD_SPECIES)[]).map((k) => (
                            <option key={k} value={k}>{WOOD_SPECIES[k].label}</option>
                          ))}
                          <option value="CUSTOM">その他(E・Fb・Fs を入力)</option>
                        </select>
                        <div className="text-[9px] text-gray-400 text-right mt-0.5">E {wood.E} · Fb {wood.Fb} · Fs {wood.Fs} N/mm²</div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">ヤング係数 E</label>
                        <input
                          type="number"
                          value={beamE}
                          onChange={e => setBeamE(parseFloat(e.target.value))}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-right focus:border-blue-500 outline-none"
                        />
                        <div className="text-[9px] text-gray-400 text-right mt-0.5">N/mm²</div>
                      </div>
                    )}
                  </div>

                  {useAutoSection && (
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">梁幅 b (mm)</label>
                        <select
                          value={beamWidth}
                          onChange={e => setBeamWidth(Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-[11px] bg-white"
                        >
                          <option value={105}>105</option>
                          <option value={120}>120</option>
                          <option value={150}>150</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">梁成 h (mm)</label>
                        <input
                          type="number"
                          value={beamHeight}
                          onChange={e => setBeamHeight(parseFloat(e.target.value))}
                          step={30}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-right focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {useAutoSection && beamWood === 'CUSTOM' && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {([
                        ['E', customE, setCustomE],
                        ['Fb(曲げ基準強度)', customFb, setCustomFb],
                        ['Fs(せん断基準強度)', customFs, setCustomFs],
                      ] as [string, number, (v: number) => void][]).map(([k, v, set]) => (
                        <div key={k}>
                          <label className="block text-[10px] text-gray-500 mb-1">{k} N/mm²</label>
                          <input type="number" value={v} onChange={e => set(parseFloat(e.target.value))} className="w-full px-2 py-1.5 border border-gray-300 rounded text-right focus:border-blue-500 outline-none" />
                        </div>
                      ))}
                      <p className="col-span-3 text-[9px] text-gray-400">集成材・LVL・機械等級材などは、告示1452号・製品の基準強度と E を入れてください。</p>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="block text-[10px] text-gray-500 mb-1">荷重条件</label>
                    <div className="flex items-center gap-2 mb-2">
                      <select 
                        value={loadType} 
                        onChange={e => setLoadType(e.target.value as LoadType)}
                        className="px-2 py-1 border rounded text-[11px] bg-white"
                      >
                        <option value="uniform">等分布荷重 (w)</option>
                        <option value="center">中央集中荷重 (P)</option>
                      </select>
                      {useAutoSection && loadType === 'uniform' ? (
                        <input
                          type="number"
                          value={beamLoadNpm}
                          onChange={e => setBeamLoadNpm(parseFloat(e.target.value))}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-right focus:border-blue-500 outline-none"
                        />
                      ) : (
                        <input
                          type="number"
                          value={beamLoad}
                          onChange={e => setBeamLoad(parseFloat(e.target.value))}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-right focus:border-blue-500 outline-none"
                        />
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400 text-right">
                      {useAutoSection && loadType === 'uniform' 
                        ? 'N/m (単位長さあたり)' 
                        : loadType === 'uniform' 
                          ? 'kN/m (単位長さあたり)' 
                          : 'kN (一点集中)'}
                    </div>
                  </div>

                  {!useAutoSection && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">断面二次モーメント Ix (cm⁴)</label>
                          <input
                            type="number"
                            value={beamIx}
                            onChange={e => setBeamIx(parseFloat(e.target.value))}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-right focus:border-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">断面係数 Zx (cm³・任意)</label>
                          <input
                            type="number"
                            value={beamZx}
                            onChange={e => setBeamZx(e.target.value)}
                            placeholder="入れると曲げ応力度を出す"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-right focus:border-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">長期許容曲げ応力度 fb (N/mm²・任意)</label>
                          <input
                            type="number"
                            value={beamFb}
                            onChange={e => setBeamFb(e.target.value)}
                            placeholder="例: 156"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-right focus:border-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">変形増大係数(告示1459号)</label>
                          <select
                            value={beamCreep}
                            onChange={e => setBeamCreep(Number(e.target.value))}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[11px] bg-white"
                          >
                            <option value={1}>1(鉄骨造の梁)</option>
                            <option value={2}>2(木造)</option>
                          </select>
                        </div>
                      </div>
                      <p className="text-[9px] text-gray-400 leading-relaxed">
                        fb は横座屈を拘束した SN400・SS400(F = 235)で上限 F/1.5 = 156 N/mm²。圧縮フランジの横補剛間隔が長いときは、鋼構造許容応力度設計規準の式で低減した値を入れてください(このツールは横座屈を計算しません)。
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Result Area */}
              <div className="space-y-4">
                {beamResults.valid ? (
                <DtResult
                  label={beamSupport === 'fixed' ? '計算結果 · 中央のたわみ δ' : beamSupport === 'cantilever' ? '計算結果 · 先端のたわみ δ' : '計算結果 · 中央のたわみ δ'}
                  value={beamResults.Delta_mm.toFixed(2)}
                  unit="mm"
                  ng={!beamResults.isDeltaSafe || !beamResults.isSigmaSafe || !beamResults.isTauSafe}
                  sub={`δ × ${beamResults.creep} ≦ L/250 → δ ≦ ${beamResults.limitDelta.toFixed(2)} mm(告示1459号)· δ/L = 1/${beamResults.Delta_mm > 0 ? (beamSpan / beamResults.Delta_mm).toFixed(0) : '—'}`}
                >
                  <ResultRow k={beamSupport === 'fixed' && loadType === 'uniform' ? '最大曲げモーメント Mmax(端部。中央は 1/2)' : '最大曲げモーメント Mmax'} v={`${beamResults.M_kNm.toFixed(2)} kN·m`} />
                  <ResultRow k="最大せん断力 Qmax" v={`${beamResults.Q_kN.toFixed(2)} kN`} />
                  {beamResults.sigmaChecked ? (
                    <ResultRow
                      k={`曲げ応力度 σb ≦ 長期 fb ${beamResults.limitSigma.toFixed(1)}`}
                      v={<span className={beamResults.isSigmaSafe ? undefined : 'text-red-700'}>{beamResults.sigma.toFixed(1)} N/mm²(検定比 {(beamResults.sigma / beamResults.limitSigma).toFixed(2)})</span>}
                    />
                  ) : (
                    <ResultRow k="曲げ応力度" v="Zx と fb を入れると判定します" />
                  )}
                  {beamResults.tauChecked && (
                    <ResultRow
                      k={`せん断応力度 τ = 1.5Q/A ≦ 長期 fs ${beamResults.limitTau.toFixed(2)}`}
                      v={<span className={beamResults.isTauSafe ? undefined : 'text-red-700'}>{beamResults.tau.toFixed(2)} N/mm²(検定比 {(beamResults.tau / beamResults.limitTau).toFixed(2)})</span>}
                    />
                  )}
                  <ResultRow k="たわみ判定" v={<span className={beamResults.isDeltaSafe ? undefined : 'text-red-700'}>{beamResults.isDeltaSafe ? 'OK' : 'NG'}</span>} />
                </DtResult>
                ) : (
                  <p className="yy-dt-note">スパン・荷重・断面を入れてください。</p>
                )}
                {useAutoSection && beamSectionResults && (
                  <p className="yy-dt-note">
                    断面性能： I = {Math.round(beamSectionResults.I).toLocaleString()} mm⁴ / Z = {Math.round(beamSectionResults.Z).toLocaleString()} mm³ · E = {beamResults.E} N/mm²
                  </p>
                )}
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  ※ 長期(固定 + 積載)の検討です。荷重には梁の自重を含めてください。短期(積雪・地震)は許容応力度が変わります(木材は短期 2F/3。積雪時は長期 ×1.3・短期 ×0.8。令89条)。
                  {useAutoSection && <><br />※ 木材の長期許容応力度 = 1.1 × 基準強度 / 3(令89条)。基準強度は告示1452号の無等級材。欠き込み・ボルト孔による断面欠損、寸法効果、含水率、めり込み(支点)は見ていません。</>}
                  <br />※ たわみは告示1459号(たわみ × 変形増大係数 ≦ スパン/250)で判定。告示は梁せい/スパンが一定以下(木造 1/12 など)の梁に適用します。床梁は振動・建具への影響も確認してください。
                  {beamSupport === 'cantilever' && <><br />※ 片持ち梁は先端たわみを持ち出し長さで割って判定しています。有効長さの扱いは審査機関の運用を確認してください。</>}
                  {!useAutoSection && <><br />※ 横座屈・局部座屈・ウェブのせん断・継手は見ていません。</>}
                </p>
                
                {/* Diagram Placeholder */}
                <p className="yy-dt-note font-mono">
                  モデル図: {beamSupport === 'simple' ? '△------△' : beamSupport === 'fixed' ? '|------|' : '|------'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* N値計算(金物)タブ */}
        {active === 'nvalue' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-gray-50 p-4 rounded border border-gray-200">
              <p className="font-bold text-gray-700 mb-3">N値計算（金物選定）簡易ツール</p>
              <p className="text-[11px] text-gray-600 mb-4">
                平成12年建設省告示第1460号 第二号ただし書の確認方法のうち「N値計算法」で、柱頭・柱脚の接合部の仕様(表三 (い)〜(ぬ))を選びます。木造軸組の 2 階建てまで。
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* 壁倍率入力 */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-700 text-[12px]">① 柱の両側の耐力壁(検討する階)</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">片側の壁倍率</label>
                      <input type="number" step="0.5" value={nValueWall1} onChange={(e) => setNValueWall1(Number(e.target.value))} className="w-full px-2 py-1.5 border border-gray-300 rounded text-right focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">反対側の壁倍率</label>
                      <input type="number" step="0.5" value={nValueWall2} onChange={(e) => setNValueWall2(Number(e.target.value))} className="w-full px-2 py-1.5 border border-gray-300 rounded text-right focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">筋かいの補正値</label>
                      <input type="number" step="0.5" value={nValueCorr1} onChange={(e) => setNValueCorr1(Number(e.target.value))} className="w-full px-2 py-1.5 border border-gray-300 rounded text-right focus:border-blue-500 outline-none" />
                    </div>
                  </div>
                  <span className="block text-[9px] text-gray-400 leading-relaxed">
                    壁倍率は柱の左右それぞれ(無ければ 0)。面材と筋かいの併用は倍率を足した値(上限 7 で頭打ちにせず実際の和)。
                    筋かいの補正値(片筋かい): 45×90・30×90 は筋かいの上端が この柱の柱頭に付くとき +0.5、柱脚に付くとき −0.5、90×90 は ±2.0、15×90・たすき掛けは 0。両側に筋かいがあるときは解説書の表で。
                  </span>
                  {nValueFloorType === 'OTHER' && (
                    <>
                      <h3 className="font-semibold text-gray-700 text-[12px]">② 上の 2 階の柱の両側の耐力壁</h3>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">片側の壁倍率</label>
                          <input type="number" step="0.5" value={nValueWall3} onChange={(e) => setNValueWall3(Number(e.target.value))} className="w-full px-2 py-1.5 border border-gray-300 rounded text-right focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">反対側の壁倍率</label>
                          <input type="number" step="0.5" value={nValueWall4} onChange={(e) => setNValueWall4(Number(e.target.value))} className="w-full px-2 py-1.5 border border-gray-300 rounded text-right focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">筋かいの補正値</label>
                          <input type="number" step="0.5" value={nValueCorr2} onChange={(e) => setNValueCorr2(Number(e.target.value))} className="w-full px-2 py-1.5 border border-gray-300 rounded text-right focus:border-blue-500 outline-none" />
                        </div>
                      </div>
                      <span className="block text-[9px] text-gray-400">2 階の柱が 1 階の柱と同じ位置に無いときは、2 階が 0 です(ずれている場合は解説書の按分による)。</span>
                    </>
                  )}
                </div>

                {/* 係数選択 */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-700 text-[12px]">柱の位置条件</h3>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">柱の位置</label>
                    <select 
                      value={nValuePositionType} 
                      onChange={(e) => setNValuePositionType(e.target.value as 'CORNER' | 'General')} 
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-[11px] bg-white"
                    >
                      <option value="CORNER">出隅の柱</option>
                      <option value="General">その他の柱</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">階層</label>
                    <select 
                      value={nValueFloorType} 
                      onChange={(e) => setNValueFloorType(e.target.value as 'TOP' | 'OTHER')} 
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-[11px] bg-white"
                    >
                      <option value="TOP">平屋 または 2階建ての2階</option>
                      <option value="OTHER">2階建ての1階</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 結果 */}
              <div className="max-w-[460px]">
                <DtResult
                  label={`判定 · N値 ${nValueResult.nValue.toFixed(2)}`}
                  value={nValueResult.resultHardware ? nValueResult.resultHardware.label : '仕様外'}
                  sub={nValueResult.resultHardware ? nValueResult.resultHardware.spec : 'N > 5.6 は告示の表三に仕様がありません'}
                  text
                  ng={!nValueResult.resultHardware}
                >
                  <ResultRow
                    k="式"
                    v={nValueResult.top
                      ? `${nValueResult.A1.toFixed(2)} × ${nValueResult.coef} − ${nValueResult.L_correction} = ${nValueResult.nValue.toFixed(2)}`
                      : `${nValueResult.A1.toFixed(2)} × ${nValueResult.coef} + ${nValueResult.A2.toFixed(2)} × ${nValueResult.coef} − ${nValueResult.L_correction} = ${nValueResult.nValue.toFixed(2)}`}
                  />
                  <ResultRow k="B1・B2(出隅 0.8 / その他 0.5)" v={nValueResult.coef.toFixed(2)} />
                  <ResultRow k={`L(${nValueResult.top ? '平屋・最上階 出隅 0.4 / その他 0.6' : '2階建ての1階 出隅 1.0 / その他 1.6'})`} v={nValueResult.L_correction.toFixed(2)} />
                  {!nValueResult.resultHardware && <ResultRow k="対応" v="許容応力度計算などで引抜き力を確かめる" />}
                </DtResult>
                <table className="w-full text-[10px] mt-3">
                  <tbody>
                    {HARDWARE_TYPES.map((h, i) => (
                      <tr key={h.label} className={`border-t ${nValueResult.resultHardware?.label === h.label ? 'font-bold' : 'text-gray-500'}`}>
                        <td className="px-1 py-0.5 w-[34px]">{h.label}</td>
                        <td className="px-1 py-0.5">{h.spec}</td>
                        <td className="px-1 py-0.5 text-right whitespace-nowrap">{i === 0 ? 'N ≦ 0.0' : `≦ ${h.max}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="yy-dt-note mt-2 leading-relaxed">
                  ※ 金物は表三の仕様と同等以上の性能のもの(Zマーク同等認定品など)を選びます。N値はその柱の柱頭・柱脚の両方に使います。
                  <br />※ 2025 年 4 月施行の改正で、横架材の上端相互の垂直距離が 3.2 m を超える階は引抜き力の割増(H/2.7)が加わりました。このツールは 3.2 m 以下を前提にしています。
                  <br />※ 存在壁量に算入した準耐力壁等のうち倍率 1.5 を超えるものは、N値計算の対象に入れます(確認申請・審査マニュアル)。
                  <br />※ 3 階建て・許容応力度計算をする建物は対象外です。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 公式集タブ */}
        {active === 'formulas' && (
          <div className="space-y-8">
            {/* 1. 簡略図の選択エリア */}
            {!selectedPattern && (
              <div>
                <h3 className="yy-dt-sec mb-4">計算パターンを選択してください</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div 
                    onClick={() => setSelectedPattern('simple_point')}
                    className="border-2 border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
                  >
                    <svg width="120" height="60" viewBox="0 0 120 60" className="mx-auto mb-2">
                      <line x1="10" y1="40" x2="110" y2="40" stroke="#333" strokeWidth="2" />
                      <path d="M5,50 L10,40 L15,50 Z" fill="none" stroke="#333" />
                      <path d="M105,50 L110,40 L115,50 Z" fill="none" stroke="#333" />
                      <line x1="60" y1="10" x2="60" y2="35" stroke="red" strokeWidth="2" markerEnd="url(#arrow-s)" />
                      <defs><marker id="arrow-s" markerWidth="6" markerHeight="6" refX="0" refY="3" orient="auto"><polygon points="0 0, 6 3, 0 6" fill="red" /></marker></defs>
                    </svg>
                    <span className="text-sm font-medium">単純梁：集中荷重</span>
                  </div>
                  {/* 今後ここに等分布荷重などを追加 */}
                  <div className="border-2 border-gray-100 rounded-lg p-4 text-gray-400 text-center flex items-center justify-center italic text-xs">
                    Coming Soon...
                  </div>
                </div>
              </div>
            )}

            {/* 2 & 3 & 4. 詳細表示・入力・結果エリア */}
            {selectedPattern === 'simple_point' && (
              <div className="animate-fadeIn">
                <button onClick={() => setSelectedPattern(null)} className="yy-dt-link mb-4">← パターン選択に戻る</button>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* 左側：詳細図（SVG） */}
                  <div className="bg-white p-4 border rounded shadow-sm">
                    <h4 className="text-sm font-bold mb-4 text-center text-gray-600">詳細図・公式</h4>
                    <svg viewBox="0 0 400 300" className="w-full h-auto">
                      {/* 梁本体 */}
                      <line x1="50" y1="80" x2="350" y2="80" stroke="#333" strokeWidth="3" />
                      
                      {/* 支点と反力ラベル */}
                      <path d="M40,95 L50,80 L60,95 Z" fill="none" stroke="#333" />
                      <text x="35" y="115" className="text-[12px] italic">RA</text>
                      <path d="M340,95 L350,80 L360,95 Z" fill="none" stroke="#333" />
                      <line x1="335" y1="100" x2="365" y2="100" stroke="#333" />
                      <text x="340" y="115" className="text-[12px] italic">RB</text>

                      {/* 荷重と寸法a, b */}
                      <g transform={`translate(${50 + (plA/plL)*300}, 0)`}>
                        <line x1="0" y1="20" x2="0" y2="75" stroke="red" strokeWidth="2" markerEnd="url(#arrow-red)" />
                        <text x="5" y="30" fill="red" className="font-bold text-[14px]">P</text>
                      </g>
                      
                      {/* スパンLの寸法線 */}
                      <line x1="50" y1="140" x2="350" y2="140" stroke="#999" />
                      <line x1="50" y1="135" x2="50" y2="145" stroke="#999" />
                      <line x1="350" y1="135" x2="350" y2="145" stroke="#999" />
                      <text x="190" y="155" fill="#666" className="text-[12px]">L (span)</text>

                      {/* a, bの寸法線 */}
                      <line x1="50" y1="175" x2={50 + (plA/plL)*300} y2="175" stroke="#999" strokeDasharray="2" />
                      <text x={40 + (plA/plL)*150} y="190" fill="#666" className="text-[11px]">a</text>
                      <line x1={50 + (plA/plL)*300} y1="175" x2="350" y2="175" stroke="#999" strokeDasharray="2" />
                      <text x={340 - (plL-plA)/plL*150} y="190" fill="#666" className="text-[11px]">b</text>

                      {/* 公式の表示（テキスト） */}
                      <g transform="translate(50, 220)" className="text-[10px] fill-blue-700 font-mono">
                        <text y="0">RA = P * b / L</text>
                        <text y="15">RB = P * a / L</text>
                        <text y="30">MC = P * a * b / L</text>
                        <text y="45">δC = (P * a² * b²) / (3 * E * I * L)</text>
                      </g>

                      <defs>
                        <marker id="arrow-red" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                          <polygon points="0 0, 10 3.5, 0 7" fill="red" />
                        </marker>
                      </defs>
                    </svg>
                  </div>

                  {/* 右側：入力と結果 */}
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 border rounded">
                      <h4 className="font-bold mb-3 text-sm border-b pb-1">入力パラメーター</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-gray-500 uppercase">P (kN)</label>
                          <input type="number" value={plP} onChange={e=>setPlP(Number(e.target.value))} className="w-full p-1 border rounded" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 uppercase">L (mm)</label>
                          <input type="number" value={plL} onChange={e=>setPlL(Number(e.target.value))} className="w-full p-1 border rounded" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 uppercase">a (mm)</label>
                          <input type="number" value={plA} onChange={e=>setPlA(Number(e.target.value))} className="w-full p-1 border rounded" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 uppercase">E (N/mm²)</label>
                          <input type="number" value={plE} onChange={e=>setPlE(Number(e.target.value))} className="w-full p-1 border rounded" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] text-gray-500 uppercase">I (cm⁴)</label>
                          <input type="number" value={plI} onChange={e=>setPlI(Number(e.target.value))} className="w-full p-1 border rounded" />
                        </div>
                      </div>
                    </div>

                    {!plResults.valid ? (
                      <p className="yy-dt-note">P・L・E・I を入れ、荷重の位置 a を 0 &lt; a &lt; L にしてください。</p>
                    ) : (
                    <DtResult
                      label="計算結果 · 荷重直下のたわみ δC"
                      value={plResults.deltaC.toFixed(2)}
                      unit="mm"
                      sub={`※最大たわみ δmax = ${plResults.deltaMax.toFixed(2)} mm (x=${plResults.x0.toFixed(0)}mm)`}
                    >
                      <ResultRow k="反力 RA" v={`${plResults.RA.toFixed(2)} kN`} />
                      <ResultRow k="反力 RB" v={`${plResults.RB.toFixed(2)} kN`} />
                      <ResultRow k="最大モーメント MC" v={`${plResults.MC.toFixed(2)} kNm`} />
                    </DtResult>
                    )}
                    <p className="text-[10px] text-gray-400">※ 単純支持・弾性・曲げ変形のみ。梁の自重は含みません。</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StructuralTools;

