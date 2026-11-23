import { setLang, useLang } from '../lib/i18n'

export function LangToggle() {
  const lang = useLang()
  return (
    <button type="button" className="lang-toggle" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}>
      {lang === 'ar' ? 'English' : 'العربية'}
    </button>
  )
}
