import BilingualLegal from '@/components/BilingualLegal';
import { EnglishContent, JapaneseContent } from './content';

// Server Component. デフォルトは日本語。EN/JA トグルで切替可能。
export default function DayLineAppPrivacyPolicyPage() {
  return (
    <BilingualLegal
      titleEn="DayLine Privacy Policy"
      titleJa="DayLine プライバシーポリシー"
      en={<EnglishContent />}
      ja={<JapaneseContent />}
      defaultLang="ja"
    />
  );
}
