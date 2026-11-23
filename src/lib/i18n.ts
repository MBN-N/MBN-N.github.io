import { useSyncExternalStore } from 'react'

export type Lang = 'en' | 'ar'

function initial(): Lang {
  try { return localStorage.getItem('stl-lang') === 'ar' ? 'ar' : 'en' } catch { return 'en' }
}
let lang: Lang = initial()
const subs = new Set<() => void>()

function apply() {
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
}
apply()

export function setLang(l: Lang) {
  lang = l
  try { localStorage.setItem('stl-lang', l) } catch { /* private mode */ }
  apply()
  subs.forEach((f) => f())
}

export function useLang(): Lang {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb) } }, () => lang)
}

/** t(english, arabic) picks the string for the current language. */
export function useT() {
  const l = useLang()
  return (en: string, ar: string) => (l === 'ar' ? ar : en)
}
