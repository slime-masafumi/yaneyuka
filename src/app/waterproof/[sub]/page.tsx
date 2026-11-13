// 建材の小分類ページ(/waterproof/{小分類}/)。中身は src/lib/materialSubPage.tsx
import { materialSubPage } from '@/lib/materialSubPage';

const p = materialSubPage('waterproof');
export const dynamicParams = false;
export const generateStaticParams = p.generateStaticParams;
export const generateMetadata = p.generateMetadata;
export default p.Page;
