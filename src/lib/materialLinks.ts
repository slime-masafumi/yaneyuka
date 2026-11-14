/**
 * 建材 16 分類ごとの「つながり」(建材ページの右列。モック「高級感 3」Q9)。
 *   maker … src/data/makers.json / maker-feeds.json の分類名
 *   info … 建築の調べもので出す材料情報の章(section-…)と設計情報の記事(id)。src/lib/infoLinks.ts
 *           (2026-11-14 まで lookup = 条文の目次の章だった)
 *   tools … この分類で使う設計ツール(designToolsMenu の分野 id / ツール id、図は home/toolArt)
 * 対応は内容から手で決めた。合わないものがあればここを直す。
 */
export type MaterialLink = {
  maker: string;
  info: { sections: string[]; posts: string[] };
  tools: Array<{ cat: string; sub: string; art?: string; why: string }>;
};

const RAIN = { cat: 'detail-design', sub: 'building-rainwater', art: 'rain', why: '軒樋・ルーフドレン' };
const COND = { cat: 'detail-design', sub: 'condensation', art: 'cond', why: '外皮の結露を判定' };
const GLASS = { cat: 'detail-design', sub: 'glass-thickness', art: 'glass', why: '風圧力に対する板厚' };
const PALETTE = { cat: 'basic-design', sub: 'color-palette', why: '基準色から配色' };
const JPMA = { cat: 'basic-design', sub: 'jpma-search', why: '日塗工番号・マンセル値' };
const DENS = { cat: 'structural-design', sub: 'density-list', why: '単位体積重量の参考' };
const EXRAIN = { cat: 'exterior-design', sub: 'exterior-rainwater', art: 'rain', why: 'マニング式と耐荷重' };
const PAVE = { cat: 'exterior-design', sub: 'pavement', why: 'TA 法で舗装構成' };
const PLANT = { cat: 'exterior-design', sub: 'plant-selection', why: '条件に合う樹種' };
const SLOPE = { cat: 'exterior-design', sub: 'slope-calc', why: '勾配の換算' };

export const MATERIAL_LINKS: Record<string, MaterialLink> = {
  roof: { maker: '屋根', info: { sections: ['section-6','section-8','section-10','section-11'], posts: ['1'] }, tools: [RAIN, COND] },
  'exterior-wall': { maker: '外壁', info: { sections: ['section-6','section-4','section-9','section-10','section-11'], posts: ['7'] }, tools: [COND, PALETTE, JPMA] },
  opening: { maker: '開口部', info: { sections: ['section-1','section-10','section-8'], posts: ['7'] }, tools: [GLASS, COND] },
  'external-floor': { maker: '外部床', info: { sections: ['section-4','section-2'], posts: [] }, tools: [SLOPE, EXRAIN] },
  'exterior-other': { maker: '外部その他', info: { sections: ['section-6','section-8','section-10'], posts: [] }, tools: [RAIN] },
  'internal-floor': { maker: '内部床', info: { sections: ['section-3','section-2','section-4'], posts: ['6'] }, tools: [DENS, PALETTE] },
  'internal-wall': { maker: '内装壁材', info: { sections: ['section-5','section-3','section-11a','section-9'], posts: ['6'] }, tools: [PALETTE, JPMA, COND] },
  'internal-ceiling': { maker: '内装天井材', info: { sections: ['section-7','section-5','section-11a'], posts: ['39','6'] }, tools: [DENS] },
  'internal-other': { maker: '内装その他', info: { sections: ['section-3','section-5','section-8'], posts: ['3'] }, tools: [DENS] },
  waterproof: { maker: '防水', info: { sections: ['section-10','section-6'], posts: [] }, tools: [RAIN] },
  hardware: { maker: '金物', info: { sections: ['section-14','section-21','section-22','section-8'], posts: [] }, tools: [] },
  furniture: { maker: 'ファニチャー', info: { sections: ['section-2','section-3'], posts: ['3'] }, tools: [PALETTE] },
  'electrical-systems': {
    maker: '電気設備',
    info: { sections: ['section-35','section-40','section-33','section-34'], posts: ['15','16','23'] },
    tools: [
      { cat: 'electrical', sub: 'illumination', why: '照度の算定' },
      { cat: 'electrical', sub: 'elec-capacity', why: '受電・契約電力' },
    ],
  },
  'mechanical-systems': {
    maker: '機械設備',
    info: { sections: ['section-30','section-25','section-28','section-26'], posts: ['34','31','29','30'] },
    tools: [
      { cat: 'mechanical', sub: 'vent-24h', art: 'vent', why: 'シックハウス対策の換気量' },
      { cat: 'mechanical', sub: 'aircon-business', art: 'vent', why: '用途・面積から能力' },
      { cat: 'mechanical', sub: 'duct-sizing', art: 'duct', why: '風量・許容圧損から' },
    ],
  },
  'exterior-infrastructure': { maker: '外構', info: { sections: ['section-23','section-4','section-25'], posts: ['33'] }, tools: [PAVE, EXRAIN, SLOPE] },
  exterior: { maker: 'エクステリア', info: { sections: ['section-2','section-8','section-4'], posts: [] }, tools: [PLANT, PAVE] },
};
