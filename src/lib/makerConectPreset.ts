/**
 * 他の画面（建材Chatbot・メーカー資料箱）から「このメーカーに問い合わせる」で
 * Maker conect を開くときの受け渡し。開いた側は一度読んだら消す。
 */
export const PRESET_KEY = 'makerconect-preset';
export const PRESET_EVENT = 'makerconect-preset';

export type MakerConectPreset = { makers: string[]; purpose?: string; part?: string };

export function openMakerConect(preset: MakerConectPreset) {
  try {
    sessionStorage.setItem(PRESET_KEY, JSON.stringify(preset));
  } catch {
    /* 受け渡しできなくても画面は開く */
  }
  window.dispatchEvent(new CustomEvent(PRESET_EVENT, { detail: preset }));
  window.dispatchEvent(new CustomEvent('yaneyuka-navigate', { detail: 'makerconect' }));
}

export function takePreset(): MakerConectPreset | null {
  try {
    const raw = sessionStorage.getItem(PRESET_KEY);
    sessionStorage.removeItem(PRESET_KEY);
    return raw ? (JSON.parse(raw) as MakerConectPreset) : null;
  } catch {
    return null;
  }
}
