import BilingualLegal from '@/components/BilingualLegal';
import { EnglishContent, JapaneseContent } from '../dayline-app-privacy-policy/content';

// Server Component. アプリの英語表示が開く URL。常に英語で開き、EN/JA トグルで切替可能。
export default function DayLineAppPrivacyPolicyEnPage() {
  return (
    <BilingualLegal
      titleEn="DayLine Privacy Policy"
      titleJa="DayLine プライバシーポリシー"
      en={<EnglishContent />}
      ja={<JapaneseContent />}
      defaultLang="en"
      ignoreSavedLang
    />
  );
}
