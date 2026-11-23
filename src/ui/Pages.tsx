import { Fragment, useEffect, useMemo, useState } from 'react'
import { parseHash } from '../lib/journey'
import company from '../content/company.json'
import { useT, useLang } from '../lib/i18n'
import { STORY_EN, STORY_AR } from '../content/story'
import { LangToggle } from './LangToggle'

type Product = { id: string; bk: string; brand: string; name: string; sku: string; cats: string[]; short: string; desc: string; specs: Record<string, string>; docs: unknown[]; images: string[]; src: string; missing: string[] }
type Data = { products: Product[]; categories: Record<string, { name: string; count: number }[]> }

const BRANDS: [string, string, string][] = [
  ['lucas', 'Lucas Oil', 'lucas.png'],
  ['vp', 'VP Racing Fuels', 'vp.svg'],
  ['shield', 'Shield', 'shield.png'],
]
const { phone, email } = company.contact

function useData() {
  const [d, setD] = useState<Data | null>(null)
  useEffect(() => {
    fetch('/data/products.json').then((r) => r.json()).then(setD)
  }, [])
  return d
}

function Shell({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  const t = useT()
  const [menu, setMenu] = useState(false)
  return (
    <div className={dark ? 'pg pg-dark' : 'pg'}>
      <header className={menu ? 'pg-head mn-open' : 'pg-head'}>
        <a href="#/"><img src="/brand/stl_new.png" alt="Scan Tool Line" /></a>
        <button type="button" className="mn-btn" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(!menu)}><i /><i /><i /></button>
        <nav onClick={() => setMenu(false)}>
          <a href="#/">{t('Home', 'الرئيسية')}</a>
          <a href="#/products">{t('All products', 'كل المنتجات')}</a>
          <a href="#/story">{t('Our story', 'قصتنا')}</a>
          <a href="#/about">{t('About', 'من نحن')}</a>
          <a href="#/agencies">{t('Global agencies', 'الوكالات العالمية')}</a>
          <a href="#/ventures">{t('Partnerships & collaboration', 'الشراكات وفرص التعاون')}</a>
          <a href="#/distributors">{t('Authorised distributors', 'الموزعون المعتمدون')}</a>
          <a href="#/branches">{t('Service centres', 'مراكز الصيانة')}</a>
          <a href="#/contact">{t('Contact', 'تواصل معنا')}</a>
          <LangToggle />
        </nav>
      </header>
      <main className="pg-body">{children}</main>
    </div>
  )
}

function Quote({ p, hideNote }: { p?: Product; hideNote?: boolean }) {
  const t = useT()
  return (
    <>
      <a className="cta" href={p ? `#/quote?p=${p.id}` : '#/quote'}>{t('Request a quote', 'اطلب عرض سعر')}</a>
      <a className="cta ghost" href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a>
      {p && <a className="cta ghost" href="#/distributors">{t('Find an authorised distributor', 'أقرب موزع معتمد')}</a>}
      {!hideNote && <p className="note">{t('For companies and distributors only. No retail prices are listed.', 'للشركات والموزعين فقط. لا نعرض أسعار تجزئة.')}</p>}
    </>
  )
}

function Products({ d }: { d: Data }) {
  const t = useT()
  const { params } = parseHash()
  const b = params.get('b') ?? ''
  const c = params.get('c') ?? ''
  const [q, setQ] = useState('')
  const [more, setMore] = useState(1)
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return d.products.filter((p) => (!b || p.bk === b) && (!c || p.cats.some((x) => x === c || x.split('>').map((s) => s.trim()).includes(c))) && (!t || (p.name + ' ' + p.sku).toLowerCase().includes(t)))
  }, [d, b, c, q])
  const cats = b ? d.categories[b] ?? [] : []
  return (
    <>
      <h1>{c || (b ? BRANDS.find((x) => x[0] === b)?.[1] : t('All products', 'كل المنتجات'))}</h1>
      <p>{list.length} {t('products', 'منتج')}</p>
      <div className="tabs">
        <a href="#/products" className={!b ? 'on' : ''}>{t('All', 'الكل')}</a>
        {BRANDS.map(([k, n]) => (
          <a key={k} href={`#/products?b=${k}`} className={b === k && !c ? 'on' : ''}>{n}</a>
        ))}
      </div>
      {cats.length > 0 && (
        <div className="tabs">
          {cats.map((x) => (
            <a key={x.name} href={`#/products?b=${b}&c=${encodeURIComponent(x.name)}`} className={c === x.name ? 'on' : ''}>{x.name} ({x.count})</a>
          ))}
        </div>
      )}
      <input className="search" placeholder={t('Search name or part number', 'ابحث بالاسم أو رقم القطعة')} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="grid">
        {list.slice(0, 48 * more).map((p) => (
          <a key={p.id} className="card" href={`#/product/${p.id}`}>
            <div className="im">{p.images[0] ? <img src={p.images[0]} alt="" loading="lazy" /> : null}</div>
            <div className="tx">{p.name}<small>{p.brand}{p.sku ? ` · ${p.sku}` : ''}</small></div>
          </a>
        ))}
      </div>
      {list.length > 48 * more && <p><a className="cta ghost" href="#/products" onClick={(e) => { e.preventDefault(); setMore(more + 1) }}>{t('Show more', 'عرض المزيد')}</a></p>}
    </>
  )
}

function Detail({ d, id }: { d: Data; id: string }) {
  const t = useT()
  const p = d.products.find((x) => x.id === id)
  if (!p) return <h1>{t('Product not found', 'المنتج غير موجود')}</h1>
  return (
    <>
      <p><a href={`#/products?b=${p.bk}`}>{t('←', '→')} {p.brand}</a></p>
      <div className="det">
        <div className="gal">{p.images.length ? p.images.map((s) => <img key={s} src={s} alt={p.name} />) : <p>{t('No image available.', 'لا توجد صورة.')}</p>}</div>
        <div>
          <h1>{p.name}</h1>
          <p>{p.brand}{p.sku ? ` · ${t('Part no.', 'رقم القطعة')} ${p.sku}` : ''}</p>
          <p className="desc">{p.short || ''}</p>
          <Quote p={p} />
          {p.desc && <h2>{t('Description', 'الوصف')}</h2>}
          <p className="desc">{p.desc}</p>
          {Object.keys(p.specs).length > 0 && (
            <>
              <h2>{t('Specifications', 'المواصفات')}</h2>
              <dl>{Object.entries(p.specs).map(([k, v]) => (<Fragment key={k}><dt>{k}</dt><dd>{String(v)}</dd></Fragment>))}</dl>
            </>
          )}
          <p className="note">{t('Source', 'المصدر')}: <a href={p.src} target="_blank" rel="noreferrer">{t('manufacturer website', 'موقع المصنّع')}</a></p>
        </div>
      </div>
    </>
  )
}

function Para({ p }: { p: string }) {
  if (p.startsWith('> ')) return <blockquote className="story-quote">{p.slice(2)}</blockquote>
  if (p.startsWith('! ')) return <p className="story-final">{p.slice(2)}</p>
  if (p.startsWith('~ ')) return <p className="story-punch">{p.slice(2)}</p>
  return <p>{p}</p>
}

function Story() {
  const lang = useLang()
  const ar = lang === 'ar'
  const S = ar ? STORY_AR : STORY_EN
  return (
    <div className="story">
      <section className="story-hero">
        <h1>{S.title}</h1>
        <p className="story-lead">{S.subtitle}</p>
        <div className="story-video">
          <video key={lang} controls preload="metadata" playsInline crossOrigin="anonymous" poster="/video/story_poster.jpg">
            <source src="/video/story.mp4" type="video/mp4" />
            <track kind="subtitles" src="/video/story.en.vtt" srcLang="en" label="English" default={!ar} />
            <track kind="subtitles" src="/video/story.ar.vtt" srcLang="ar" label="العربية" default={ar} />
          </video>
        </div>
      </section>
      {S.chapters.map((c, i) => (
        <section className="story-ch" key={i}>
          <span className="story-no">{ar ? String(i + 1).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]) : c.no}</span>
          <div>
            <h2>{c.title}</h2>
            {c.paras.map((p, k) => <Para key={k} p={p} />)}
          </div>
        </section>
      ))}
      <div className="story-end"><Quote /></div>
    </div>
  )
}

const ABOUT_STATS: [string, string, string][] = [
  ['1998', 'Year founded', 'سنة التأسيس'],
  ['30+', 'Years in the automotive industry', 'سنة في قطاع السيارات'],
  ['1,600+', 'Dealers served across the Kingdom', 'تاجر نخدمهم في أنحاء المملكة'],
  ['8', 'Auto Lube service centres in 6 cities', 'مراكز خدمة Auto Lube في 6 مدن'],
  ['73+', 'Technicians and staff at Auto Lube', 'فني وموظف في Auto Lube'],
  ['98,000+', 'Customers served so far', 'عميل خدمناهم حتى اليوم'],
]
const ABOUT_WINS: [string, string][] = [
  ['Exclusive distributor of Lucas Oil since 1998 and of VP Racing Fuels since 2019', 'موزع حصري لـ Lucas Oil منذ 1998 ولـ VP Racing Fuels منذ 2019'],
  ['Shield (South Africa) joined our agencies, with MotorVac already in our line-up', 'انضمت Shield من جنوب أفريقيا إلى وكالاتنا، إضافة إلى MotorVac'],
  ['Official sponsor of the Dakar Rally for a period, and sponsor of motorsport teams', 'راعٍ رسمي لرالي داكار لفترة، وراعٍ لفرق رياضة المحركات'],
  ['Exports to the Gulf countries, with supply chains across the Kingdom', 'نصدّر إلى دول الخليج، وسلاسل إمداد في كل مدن المملكة'],
  ['Next: new agencies, partnerships and collaboration opportunities', 'القادم: وكالات جديدة وشراكات وفرص تعاون'],
]
const ABOUT_BG = ['team.jpg', 'diamond-sponsor.jpg', 'shield-booth.jpg']

function About() {
  const t = useT()
  return (
    <>
      <header className="about-hero" aria-hidden="true">
        <div className="about-bg">{ABOUT_BG.map(f => <img key={f} src={`/about/${f}`} alt="" />)}</div>
      </header>
      <div className="about-intro">
        <h1>{t('About Scan Tool Line', 'عن خط الأجهزة')}</h1>
        <p className="about-thamer">{t('It Began in Thamer’s Workshop', 'بدأت من ورشة ثامر')}</p>
        <p>{t(company.about_en, 'خط الأجهزة (SCAN TOOL LINE) مؤسسة رائدة في مجال المعدات الصناعية والزيوت ووقود السباقات. وهي الوكيل الحصري لعدد من الشركات العالمية مثل Lucas Oil و VP Racing Fuels و MotorVac وعلامات شهيرة أخرى.')}</p>
      </div>

      <section className="about-founder">
        <div className="about-founder-row">
          <div className="about-side">
            <img className="about-portrait" src="/about/mansour.jpg" alt={t('Mr. Mansour Al-Ghamdi', 'الأستاذ منصور الغامدي')} />
            <div className="brands">{[...BRANDS.slice(0, 1), ['motorvac', 'MotorVac', 'motorvac.png'], ...BRANDS.slice(1)].map(([k, n, l]) => k === 'motorvac' ? <span key={k} title={n}><img src={`/brand/${l}`} alt={n} /></span> : <a key={k} href={`#/b/${k}`} title={n}><img src={`/brand/${l}`} alt={n} /></a>)}</div>
          </div>
          <div className="about-founder-text">
        <h2>{t('Led by Mr. Mansour Al-Ghamdi', 'بقيادة الأستاذ منصور الغامدي')}</h2>
        <p className="about-role">{t('Founder and Chairman', 'المؤسس ورئيس الشركة')}</p>
        <p>{t(
          'Mr. Mansour founded Scan Tool Line in 1998 with the exclusive distributorship of Lucas Oil in the Kingdom, and VP Racing Fuels joined in 2019. After 30 years in the automotive industry, he knows the best lubricants and additives in the world, and he has helped small business owners build better futures. Our story began in the workshop of his son, Thamer.',
          'أسس الأستاذ منصور خط الأجهزة عام 1998 بتوزيع حصري لـ Lucas Oil في المملكة، وانضمت VP Racing Fuels عام 2019. وبعد 30 سنة في قطاع السيارات، يعرف أفضل الزيوت والإضافات في العالم، وساعد أصحاب أعمال صغيرة على بناء مستقبل أفضل. وقصتنا بدأت من ورشة ابنه ثامر.')}</p>
          </div>
        </div>
        <blockquote className="story-quote">{t(
          'My vision is to provide the best quality products to the market, to make consumers’ needs easier with high satisfaction. I always focus on solving our customers’ problems with honesty, integrity, hard work and true dedication.',
          'رؤيتي أن أقدّم للسوق أفضل المنتجات، لنسهّل احتياجات العملاء ونحقق رضاهم. وأركّز دائماً على حل مشاكل عملائنا بالصدق والأمانة والعمل الجاد والإخلاص.')}</blockquote>
        <p className="note">{t('From Mr. Mansour’s own words.', 'من كلمة الأستاذ منصور.')}</p>
      </section>

      <section className="about-stats">
        {ABOUT_STATS.map(([n, en, ar]) => <div key={n}><b>{n}</b><span>{t(en, ar)}</span></div>)}
      </section>

      <section>
        <h2>{t('Milestones and what comes next', 'محطات وما هو قادم')}</h2>
        <ul className="about-wins">{ABOUT_WINS.map(([en, ar], i) => <li key={i}>{t(en, ar)}</li>)}</ul>
      </section>

      <p className="about-next">{t('We keep growing step by step: looking for new agencies, building partnerships and opening doors for cooperation with companies that share our commitment to quality.', 'نواصل النمو خطوة بخطوة: نبحث عن وكالات جديدة، ونبني شراكات، ونفتح أبواب التعاون مع شركات تشاركنا الاهتمام بالجودة.')} <a href="#/story">{t('Read our story', 'اقرأ قصتنا')}</a></p>
      <div className="about-cta"><Quote hideNote /></div>
    </>
  )
}

const SERVICES: [string, string, string][] = [
  ['transmission', 'Transmission Fluid Change', 'The first step in keeping a transmission in top shape and preventing problems that lead to costly repairs.'],
  ['engine-oil', 'Engine Oil Change', 'Fresh Lucas engine oil so the engine runs with peace of mind in every season.'],
  ['brake-fluid', 'Brake Fluid Change', 'Smoother, more reliable braking and a longer life for the vehicle, done by certified technicians.'],
  ['power-steering', 'Power Steering Fluid', 'Keeps the power steering system at peak performance and stops leaks and noise.'],
  ['differential', 'Differential Fluid Change', 'A smoother ride and protection for the differential through a complete fluid change.'],
  ['coolant', 'Radiator Coolant', 'Lucas coolant with corrosion and mildew protection to keep the engine cool in summer and warm in winter.'],
  ['engine-service', 'Comprehensive Engine Servicing', 'Every 50,000 km: spark plugs, injector cleaning, fuel additives, throttle body and intake manifold cleaning.'],
  ['brake-disc', 'Brake Disc Skimming', 'Precision skimming of brake discs, delivered with high quality and care.'],
  ['diagnostics', 'Computer Check and General Checkups', 'Regular checks of gear oil, transmission oil, brake fluid and differential oil, with computer diagnostics.'],
]
const SERVICES_AR: Record<string, [string, string]> = {
  transmission: ['تغيير زيت ناقل الحركة', 'الخطوة الأولى للحفاظ على ناقل الحركة في أفضل حال وتجنّب المشكلات التي تقود إلى إصلاحات مكلفة.'],
  'engine-oil': ['تغيير زيت المحرك', 'زيت Lucas طازج ليعمل المحرك براحة بال في كل فصول السنة.'],
  'brake-fluid': ['تغيير سائل الفرامل', 'فرملة أنعم وأكثر موثوقية وعمر أطول للمركبة، بأيدي فنيين معتمدين.'],
  'power-steering': ['سائل التوجيه', 'يُبقي نظام التوجيه في أعلى أداء ويمنع التسرب والضجيج.'],
  differential: ['تغيير زيت الدفرنس', 'قيادة أنعم وحماية للدفرنس عبر تغيير كامل للزيت.'],
  coolant: ['سائل التبريد', 'سائل تبريد Lucas بحماية من التآكل والعفن ليبقى المحرك بارداً في الصيف ودافئاً في الشتاء.'],
  'engine-service': ['صيانة المحرك الشاملة', 'كل ٥٠٬٠٠٠ كم: البواجي، وتنظيف البخاخات، وإضافات الوقود، وتنظيف جسم الخانق ومجمّع السحب.'],
  'brake-disc': ['خراطة أقراص الفرامل', 'خراطة دقيقة لأقراص الفرامل بجودة وعناية عالية.'],
  diagnostics: ['فحص الكمبيوتر والفحص العام', 'فحص دوري لزيت القير وزيت ناقل الحركة وسائل الفرامل وزيت الدفرنس، مع تشخيص بالكمبيوتر.'],
}
const CITY_AR: Record<string, string> = { Riyadh: 'الرياض', Jeddah: 'جدة', Abha: 'أبها', Taif: 'الطائف', Makkah: 'مكة المكرمة', 'Al Khobar': 'الخبر' }
const DISTRICT_AR: Record<string, string> = {
  'Al Andalus': 'الأندلس',
  'Al Naseem (Khurais Road)': 'النسيم (طريق خريص)',
  'Al Wadi (Abu Bakr St.)': 'الوادي (شارع أبي بكر)',
  'Al Nuzha': 'النزهة',
  'Al Muhammadiyah': 'المحمدية',
  'Al Mansak': 'المنسك',
  "Al Qaym Al A'la (Airport Rd.)": 'القيم الأعلى (طريق المطار)',
  'Al Umrah Al Jadidah': 'العمرة الجديدة',
  'Al Jawharah': 'الجوهرة',
}
const BRANCH_IMG: Record<string, string> = { 'Al Naseem': 'naseem', 'Al Wadi': 'wadi', 'Al Nuzha': 'nuzha', 'Al Muhammadiyah': 'muhammadiyah', 'Al Mansak': 'mansak', 'Al Qaym': 'taif', 'Al Umrah': 'umrah', 'Al Andalus': 'khobar', 'Al Jawharah': 'khobar' }
const branchImg = (d: string) => BRANCH_IMG[Object.keys(BRANCH_IMG).find((k) => d.startsWith(k)) ?? ''] ?? 'muhammadiyah'

function Branches() {
  const t = useT()
  const ar = useLang() === 'ar'
  const m = company.maintenance_centre as { name: string; branches: { city: string; district: string; map?: string }[] }
  const cities = Array.from(new Set(m.branches.map((b) => b.city)))
  return (
    <div className="sc">
      <section className="sc-hero" style={{ backgroundImage: 'linear-gradient(90deg,rgba(8,12,30,.92) 30%,rgba(8,12,30,.35)),url(/centres/facade2.jpg)' }}>
        <img src="/brand/autolube.png" alt="Auto Lube" />
        <small>{t('Lucas Quick Service', 'Lucas للخدمة السريعة')}</small>
        <h1>{t('Maintenance centres', 'مراكز الصيانة')}</h1>
        <p>{t('Auto Lube operates the Lucas agency maintenance centres: quick, advanced service built on the latest equipment for preventive maintenance and the best oils and additives.', 'تشغّل Auto Lube مراكز صيانة وكالة Lucas: خدمة سريعة ومتطورة بأحدث المعدات للصيانة الوقائية وأفضل الزيوت والإضافات.')}</p>
        <div className="sc-stats">
          <div><b>{m.branches.length}</b><span>{t('Centres', 'مركز')}</span></div>
          <div><b>{cities.length}</b><span>{t('Cities', 'مدن')}</span></div>
          <div><b>{SERVICES.length}</b><span>{t('Services', 'خدمات')}</span></div>
        </div>
      </section>

      <h2 className="sc-h">{t('Services', 'الخدمات')}</h2>
      <div className="sc-grid">
        {SERVICES.map(([id, title, desc]) => (
          <article key={id} className="sc-card">
            <img src={`/centres/${id}.jpg`} alt={title} loading="lazy" />
            <h3>{ar ? SERVICES_AR[id][0] : title}</h3>
            <p>{ar ? SERVICES_AR[id][1] : desc}</p>
          </article>
        ))}
      </div>

      <h2 className="sc-h">{t('Our centres', 'مراكزنا')}</h2>
      <div className="sc-bg">
        {m.branches.map((b) => (
          <figure key={b.city + b.district}>
            <img src={`/centres/branch-${branchImg(b.district)}.jpg`} alt="" loading="lazy" />
            <figcaption>
              <div><b>{ar ? CITY_AR[b.city] ?? b.city : b.city}</b><span>{ar ? DISTRICT_AR[b.district] ?? b.district : b.district}</span></div>
              {b.map ? <a href={b.map} target="_blank" rel="noreferrer">{t('Open map', 'افتح الخريطة')} ›</a> : <em>{t('Map location soon', 'الموقع قريباً')}</em>}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}

const ENQ = ['Distribution and import', 'Workshops and service centres', 'Fleet and corporate supply', 'Equipment (MotorVac)', 'Other']
const ENQ_AR = ['التوزيع والاستيراد', 'الورش ومراكز الخدمة', 'الأساطيل وتوريد الشركات', 'المعدات (MotorVac)', 'أخرى']


type Dist = { n: string; p: string; c: string; r: string; d: string; lat: number | null; lng: number | null; u: string }
const km = (a: number, b: number, c: number, d: number) => {
  const R = 6371, rad = Math.PI / 180, dLa = (c - a) * rad, dLo = (d - b) * rad
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(dLo / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function Distributors() {
  const t = useT()
  const [all, setAll] = useState<Dist[] | null>(null)
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null)
  const [geo, setGeo] = useState<'idle' | 'wait' | 'denied' | 'insecure' | 'timeout'>('idle')
  const [city, setCity] = useState('')
  const [dis, setDis] = useState('')
  const [shown, setShown] = useState(10)
  useEffect(() => { fetch('/data/distributors.json').then((r) => r.json()).then(setAll).catch(() => setAll([])) }, [])
  const cities = useMemo(() => {
    const m = new Map<string, number>()
    ;(all ?? []).forEach((x) => x.c && m.set(x.c, (m.get(x.c) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)
  }, [all])
  const districts = useMemo(() => {
    const m = new Map<string, number>()
    ;(all ?? []).filter((x) => x.c === city && x.d).forEach((x) => m.set(x.d, (m.get(x.d) ?? 0) + 1))
    return [...m.keys()].sort((a, b) => a.localeCompare(b, 'ar'))
  }, [all, city])
  const locate = () => {
    if (!navigator.geolocation) { setGeo('denied'); return }
    if (!window.isSecureContext) { setGeo('insecure'); return }
    setGeo('wait')
    navigator.geolocation.getCurrentPosition(
      (pos) => { setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeo('idle'); setCity(''); setDis(''); setShown(10) },
      (err) => setGeo(err.code === 3 ? 'timeout' : 'denied'),
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 },
    )
  }
  type Row = Dist & { dist?: number }
  const list: Row[] = useMemo(() => {
    if (!all) return []
    if (me) return all.filter((x) => x.lat != null && x.lng != null).map((x) => ({ ...x, dist: km(me.lat, me.lng, x.lat as number, x.lng as number) })).sort((a, b) => (a.dist as number) - (b.dist as number))
    if (city) return all.filter((x) => x.c === city && (!dis || x.d === dis))
    return []
  }, [all, me, city, dis])
  const mapUrl = (x: Dist) => (x.lat != null ? `https://www.google.com/maps?q=${x.lat},${x.lng}` : /^https?:/.test(x.u) ? x.u : '')
  return (
    <div className="dl">
      <section className="pt-hero">
        <small>{t('Scan Tool Line · Where to buy', 'خط الأجهزة · أين تجد منتجاتنا')}</small>
        <h1>{t('Authorised distributors', 'الموزعون المعتمدون')}</h1>
        <p>{t('Find the nearest authorised distributor to you. Allow your location, or choose your city and neighbourhood.', 'اعثر على أقرب موزع معتمد لك. اسمح بتحديد موقعك، أو اختر مدينتك وحيّك.')}</p>
      </section>
      <div className="dl-box">
        <button type="button" className="cta" onClick={locate} disabled={geo === 'wait'}>{geo === 'wait' ? t('Locating…', 'جارٍ تحديد موقعك…') : t('Find the nearest to me', 'أقرب موزع لي')}</button>
        <p className="dl-priv">{t('Your location stays on your device and is never sent or stored.', 'موقعك يبقى على جهازك ولا يُرسل ولا يُخزَّن.')}</p>
        {geo === 'insecure' && <p className="dl-warn">{t('Location needs a secure (https) connection. Choose your city and neighbourhood below.', 'تحديد الموقع يحتاج اتصالاً آمناً (https). اختر مدينتك وحيّك من الأسفل.')}</p>}
        {geo === 'timeout' && <p className="dl-warn">{t('Locating took too long. Try again, or choose your city below.', 'استغرق تحديد الموقع وقتاً طويلاً. حاول مرة أخرى أو اختر مدينتك من الأسفل.')}</p>}
        {geo === 'denied' && <p className="dl-warn">{t('Location access was blocked. Allow it in your browser settings, or choose your city and neighbourhood below.', 'تم منع الوصول للموقع. اسمح به من إعدادات المتصفح، أو اختر مدينتك وحيّك من الأسفل.')}</p>}
        <div className="dl-or"><span>{t('or choose manually', 'أو اختر يدوياً')}</span></div>
        <div className="dl-sel">
          <label>{t('City', 'المدينة')}
            <select value={city} onChange={(e) => { setCity(e.target.value); setDis(''); setMe(null); setShown(10) }}>
              <option value="">{t('Select a city', 'اختر المدينة')}</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>{t('Neighbourhood', 'الحي')}
            <select value={dis} disabled={!city || !districts.length} onChange={(e) => { setDis(e.target.value); setShown(10) }}>
              <option value="">{t('All neighbourhoods', 'كل الأحياء')}</option>
              {districts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
        </div>
      </div>
      {!all && <p>{t('Loading…', 'جارٍ التحميل…')}</p>}
      {all && (me || city) && (
        <>
          <h2 className="dl-h">{me ? t('Nearest to you', 'الأقرب إليك') : `${city}${dis ? ' · ' + dis : ''}`} <span>{list.length}</span></h2>
          {!list.length && <p>{t('No distributors found for this selection.', 'لا يوجد موزعون لهذا الاختيار.')}</p>}
          <ul className="dl-list">
            {list.slice(0, shown).map((x, i) => (
              <li key={i}>
                <div className="dl-top">
                  <b>{x.n}</b>
                  {x.dist != null && <em>{x.dist < 1 ? t('< 1 km', 'أقل من 1 كم') : `${Math.round(x.dist)} ${t('km', 'كم')}`}</em>}
                </div>
                <span>{[x.c, x.d].filter(Boolean).join(' · ')}</span>
                <div className="dl-act">
                  {x.p && <a className="cta" href={`tel:${x.p.replace(/\s/g, '')}`}>{t('Call', 'اتصال')}</a>}
                  {mapUrl(x) && <a className="cta ghost" target="_blank" rel="noreferrer" href={mapUrl(x)}>{t('Directions', 'الموقع على الخريطة')}</a>}
                </div>
              </li>
            ))}
          </ul>
          {shown < list.length && <button type="button" className="cta ghost" onClick={() => setShown(shown + 10)}>{t('Show more', 'عرض المزيد')}</button>}
        </>
      )}
      <p className="dl-foot">{t('Not sure where to buy, or you are a company? ', 'تحتاج مساعدة أو أنت شركة؟ ')}<a href="#/contact">{t('Contact us', 'تواصل معنا')}</a></p>
    </div>
  )
}

function Contact() {
  const t = useT()
  const ar = useLang() === 'ar'
  const [f, setF] = useState({ company: '', person: '', role: '', phone: '', email: '', type: ENQ[0], msg: '' })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })
  const text = ['Business enquiry', `Company: ${f.company}`, `Name: ${f.person}`, `Role: ${f.role}`, `Phone: ${f.phone}`, `Email: ${f.email}`, `Enquiry: ${f.type}`, '', f.msg].join('\n')
  const ok = f.company.trim() && f.person.trim() && (f.phone.trim() || f.email.trim())
  const dis = ok ? undefined : { opacity: 0.4, pointerEvents: 'none' as const }
  return (
    <div className="ct">
      <section className="ct-hero">
        <small>{t('Business to business', 'من شركة إلى شركة')}</small>
        <h1>{t('Partnerships built for scale', 'شراكات مبنية للتوسع')}</h1>
        <p>{t('Scan Tool Line serves companies only: distributors, workshops, fleets and corporate buyers. Exclusive agent of Lucas Oil, MotorVac, VP Racing Fuels and Shield in Saudi Arabia.', 'خط الأجهزة يخدم الشركات فقط: الموزعين والورش والأساطيل ومشتري الشركات. الوكيل الحصري لعلامات Lucas Oil و MotorVac و VP Racing Fuels و Shield في المملكة العربية السعودية.')}</p>
      </section>
      <div className="ct-cols">
        <div className="ct-side">
          <div className="ct-tiles">
            {[[t('Distributors and importers', 'الموزعون والمستوردون'), t('Wholesale supply of four world brands.', 'توريد بالجملة لأربع علامات عالمية.')], [t('Workshops and service centres', 'الورش ومراكز الخدمة'), t('Oils, additives and service equipment.', 'زيوت وإضافات ومعدات خدمة.')], [t('Fleets and corporate', 'الأساطيل والشركات'), t('Supply programmes for company vehicles.', 'برامج توريد لمركبات الشركات.')]].map(([ti, d]) => (
              <div key={ti}><b>{ti}</b><span>{d}</span></div>
            ))}
          </div>
          <dl className="ct-info">
            <dt>{t('Phone', 'الهاتف')}</dt><dd><a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a></dd>
            <dt>{t('Email', 'البريد')}</dt><dd><a href={`mailto:${email}`}>{email}</a></dd>
            <dt>WhatsApp</dt><dd><a target="_blank" rel="noreferrer" href={`https://wa.me/${phone.replace(/\D/g, '')}`}>{t('Message our business team', 'راسل فريق الأعمال')}</a></dd>
          </dl>
          <p className="ct-note">{t('No retail prices are listed. Quotations are prepared per company.', 'لا نعرض أسعار تجزئة. تُعدّ عروض الأسعار لكل شركة على حدة.')}</p>
        </div>
        <form className="ct-form" onSubmit={(e) => e.preventDefault()}>
          <h2>{t('Business enquiry', 'استفسار تجاري')}</h2>
          <div className="ct-row">
            <label>{t('Company', 'الشركة')} *<input value={f.company} onChange={set('company')} /></label>
            <label>{t('Your name', 'الاسم')} *<input value={f.person} onChange={set('person')} /></label>
          </div>
          <div className="ct-row">
            <label>{t('Job title', 'المسمى الوظيفي')}<input value={f.role} onChange={set('role')} /></label>
            <label>{t('Enquiry type', 'نوع الاستفسار')}<select value={f.type} onChange={set('type')}>{ENQ.map((x, i) => <option key={x} value={x}>{ar ? ENQ_AR[i] : x}</option>)}</select></label>
          </div>
          <div className="ct-row">
            <label>{t('Phone', 'الهاتف')}<input value={f.phone} onChange={set('phone')} /></label>
            <label>{t('Business email', 'البريد الإلكتروني للعمل')}<input type="email" value={f.email} onChange={set('email')} /></label>
          </div>
          <label>{t('How can we help?', 'كيف نخدمكم؟')}<textarea value={f.msg} onChange={set('msg')} /></label>
          <div className="ct-act">
            <a className="ct-btn" style={dis} href={`mailto:${email}?subject=${encodeURIComponent('Business enquiry: ' + f.company)}&body=${encodeURIComponent(text)}`}>{t('Send by email', 'أرسل بالبريد')}</a>
            <a className="ct-btn ghost" style={dis} target="_blank" rel="noreferrer" href={`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`}>{t('Send by WhatsApp', 'أرسل بواتساب')}</a>
          </div>
          <p className="ct-note">{t('The form opens your email app or WhatsApp with the enquiry filled in; nothing is stored on this site.', 'يفتح النموذج تطبيق البريد أو واتساب والاستفسار معبّأ؛ لا يُخزَّن شيء في هذا الموقع.')}</p>
        </form>
      </div>
    </div>
  )
}

function QuoteForm({ d }: { d: Data | null }) {
  const t = useT()
  const { params } = parseHash()
  const prod = d?.products.find((x) => x.id === params.get('p'))
  const [f, setF] = useState({ company: '', person: '', phone: '', email: '', product: '', qty: '', msg: '' })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })
  const product = f.product || (prod ? `${prod.name}${prod.sku ? ' (' + prod.sku + ')' : ''}` : '')
  const text = [`Quote request`, `Company: ${f.company}`, `Contact person: ${f.person}`, `Phone: ${f.phone}`, `Email: ${f.email}`, `Product: ${product}`, `Quantity: ${f.qty}`, '', f.msg].join('\n')
  const ok = f.company.trim() && f.person.trim() && (f.phone.trim() || f.email.trim())
  return (
    <>
      <h1>{t('Request a quote', 'اطلب عرض سعر')}</h1>
      <p>{t('For companies and distributors. Fill in the form, then send it by email or WhatsApp. No retail prices are listed.', 'للشركات والموزعين. عبّئ النموذج ثم أرسله بالبريد أو واتساب. لا نعرض أسعار تجزئة.')}</p>
      <form className="qf" onSubmit={(e) => e.preventDefault()}>
        <label>{t('Company name', 'اسم الشركة')} *<input value={f.company} onChange={set('company')} /></label>
        <label>{t('Contact person', 'الشخص المسؤول')} *<input value={f.person} onChange={set('person')} /></label>
        <label>{t('Phone', 'الهاتف')}<input value={f.phone} onChange={set('phone')} /></label>
        <label>{t('Email', 'البريد الإلكتروني')}<input type="email" value={f.email} onChange={set('email')} /></label>
        <label>{t('Product', 'المنتج')}<input value={product} onChange={set('product')} /></label>
        <label>{t('Quantity', 'الكمية')}<input value={f.qty} onChange={set('qty')} /></label>
        <label>{t('Message', 'الرسالة')}<textarea value={f.msg} onChange={set('msg')} /></label>
        <div>
          <a className="cta" aria-disabled={!ok} style={ok ? undefined : { opacity: .4, pointerEvents: 'none' }} href={`mailto:${email}?subject=${encodeURIComponent('Quote request' + (product ? ': ' + product : ''))}&body=${encodeURIComponent(text)}`}>{t('Send by email', 'أرسل بالبريد')}</a>
          <a className="cta ghost" aria-disabled={!ok} style={ok ? undefined : { opacity: .4, pointerEvents: 'none' }} target="_blank" rel="noreferrer" href={`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`}>{t('Send by WhatsApp', 'أرسل بواتساب')}</a>
        </div>
        <p className="note">{t('The form opens your email app or WhatsApp with the request filled in; nothing is stored on this site.', 'يفتح النموذج تطبيق البريد أو واتساب والطلب معبّأ؛ لا يُخزَّن شيء في هذا الموقع.')}</p>
      </form>
    </>
  )
}


type Field = [string, string, string, string, boolean?, boolean?] // key, label en, label ar, kind, required, textarea
const PT = {
  ventures: {
    kicker: ['Scan Tool Line · Partnerships', 'خط الأجهزة · الشراكات وفرص التعاون'],
    title: ['We invest in what is next.', 'نستثمر في ما هو قادم.'],
    lead: ['Part of our plan is to invest in small and emerging companies, and to grow alongside founders who build with care. If you run a company and want a partnership, tell us about it.', 'من خطط خط الأجهزة الاستثمار في الشركات الصغيرة والناشئة، والنمو مع أصحاب الأفكار الجادة. إذا كانت لديك شركة وتبحث عن شراكة، عرّفنا بها.'],
    cards: [
      ['A clear idea', 'فكرة واضحة', 'A real business, a real need and a plan that makes sense.', 'عمل حقيقي وحاجة حقيقية وخطة منطقية.'],
      ['A committed team', 'فريق جاد', 'People who can carry the idea from paper to market.', 'أشخاص قادرون على نقل الفكرة من الورق إلى السوق.'],
      ['A natural fit', 'توافق طبيعي', 'Value that grows with our network, our brands and our experience.', 'قيمة تنمو مع شبكتنا وعلاماتنا وخبرتنا.'],
    ],
    stepsTitle: ['How it works', 'كيف يتم الأمر'],
    steps: [['Send your request', 'أرسل طلبك'], ['We review it', 'ندرسه'], ['We get in touch', 'نتواصل معك']],
    formTitle: ['Submit a partnership request', 'قدّم طلب شراكة'],
    fields: [
      ['company', 'Company name', 'اسم الشركة', 'text', true],
      ['person', 'Contact person', 'الشخص المسؤول', 'text', true],
      ['phone', 'Phone', 'الهاتف', 'text'],
      ['email', 'Email', 'البريد الإلكتروني', 'email'],
      ['field', 'Field of business', 'مجال الشركة', 'text'],
      ['stage', 'Stage (idea, launched, growing)', 'المرحلة (فكرة، منطلقة، نامية)', 'text'],
      ['msg', 'Tell us about the company and the partnership you have in mind', 'عرّفنا بالشركة وبالشراكة التي تفكر فيها', 'text', false, true],
    ] as Field[],
    subject: 'Partnership request',
    note: ['Sending a request does not guarantee a partnership. Nothing is stored on this site.', 'إرسال الطلب لا يعني الموافقة على الشراكة. ولا يُحفظ شيء في هذا الموقع.'],
  },
  agencies: {
    kicker: ['Scan Tool Line · Agencies', 'خط الأجهزة · الوكالات العالمية'],
    title: ['Bringing world brands to Saudi Arabia.', 'نجلب العلامات العالمية إلى السعودية.'],
    lead: ['One of our goals is to secure more international agencies inside the Kingdom, as we have done with Lucas Oil, VP Racing Fuels, MotorVac and Shield. If you own a brand and want a serious partner here, let us talk.', 'من أهدافنا الحصول على المزيد من الوكالات الدولية داخل المملكة، كما فعلنا مع Lucas Oil و VP Racing Fuels و MotorVac و Shield. إذا كانت لديك علامة وتبحث عن شريك جاد هنا، تواصل معنا.'],
    cards: [
      ['Exclusive representation', 'تمثيل حصري', 'We take a brand to the Saudi market as its exclusive agent.', 'نحمل العلامة إلى السوق السعودي كوكيل حصري لها.'],
      ['Supply to companies', 'توريد للشركات', 'Distributors, workshops, fleets and corporate buyers.', 'الموزعون والورش والأساطيل ومشتري الشركات.'],
      ['A service network', 'شبكة خدمة', 'Auto Lube centres and more than 30 years in the automotive industry.', 'مراكز Auto Lube وأكثر من 30 سنة في قطاع السيارات.'],
    ],
    stepsTitle: ['How it works', 'كيف يتم الأمر'],
    steps: [['Introduce your brand', 'عرّفنا بعلامتك'], ['We study the market fit', 'ندرس ملاءمتها للسوق'], ['We discuss the agreement', 'نتحدث عن الاتفاق']],
    formTitle: ['Propose an agency', 'اقترح وكالة'],
    fields: [
      ['company', 'Brand or company name', 'اسم العلامة أو الشركة', 'text', true],
      ['person', 'Contact person', 'الشخص المسؤول', 'text', true],
      ['phone', 'Phone', 'الهاتف', 'text'],
      ['email', 'Email', 'البريد الإلكتروني', 'email'],
      ['web', 'Website', 'الموقع الإلكتروني', 'text'],
      ['products', 'Products or services', 'المنتجات أو الخدمات', 'text'],
      ['msg', 'Tell us what you are looking for in Saudi Arabia', 'أخبرنا بما تبحث عنه في السعودية', 'text', false, true],
    ] as Field[],
    subject: 'Agency proposal',
    note: ['This is an introduction only. Nothing is stored on this site.', 'هذا تعريف مبدئي فقط. ولا يُحفظ شيء في هذا الموقع.'],
  },
}

function PartnerPage({ kind }: { kind: 'ventures' | 'agencies' }) {
  const t = useT()
  const c = PT[kind]
  const [f, setF] = useState<Record<string, string>>({})
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })
  const text = [c.subject, ...c.fields.map(([k, en]) => `${en}: ${f[k] ?? ''}`)].join('\n')
  const ok = (f.company ?? '').trim() && (f.person ?? '').trim() && ((f.phone ?? '').trim() || (f.email ?? '').trim())
  const dis = ok ? undefined : { opacity: .4, pointerEvents: 'none' as const }
  return (
    <div className="pt">
      <header className="pt-hero">
        <small>{t(c.kicker[0], c.kicker[1])}</small>
        <h1>{t(c.title[0], c.title[1])}</h1>
        <p>{t(c.lead[0], c.lead[1])}</p>
        {kind === 'agencies' && <div className="brands">{BRANDS.slice(0, 1).concat([['motorvac', 'MotorVac', 'motorvac.png']], BRANDS.slice(1)).map(([k, n, l]) => <span key={k} title={n}><img src={`/brand/${l}`} alt={n} /></span>)}</div>}
      </header>
      <div className="pt-cards">
        {c.cards.map((x, i) => (
          <div key={i}><b>{String(i + 1).padStart(2, '0')}</b><h3>{t(x[0], x[1])}</h3><p>{t(x[2], x[3])}</p></div>
        ))}
      </div>
      <section className="pt-steps">
        <h2>{t(c.stepsTitle[0], c.stepsTitle[1])}</h2>
        <ol>{c.steps.map((x, i) => <li key={i}>{t(x[0], x[1])}</li>)}</ol>
      </section>
      <section>
        <h2>{t(c.formTitle[0], c.formTitle[1])}</h2>
        <form className="qf" onSubmit={(e) => e.preventDefault()}>
          {c.fields.map(([k, en, ar, type, req, area]) => (
            <label key={k}>{t(en, ar)}{req ? ' *' : ''}{area ? <textarea value={f[k] ?? ''} onChange={set(k)} /> : <input type={type} value={f[k] ?? ''} onChange={set(k)} />}</label>
          ))}
          <div>
            <a className="cta" aria-disabled={!ok} style={dis} href={`mailto:${email}?subject=${encodeURIComponent(c.subject + (f.company ? ': ' + f.company : ''))}&body=${encodeURIComponent(text)}`}>{t('Send by email', 'أرسل بالبريد')}</a>
            <a className="cta ghost" aria-disabled={!ok} style={dis} target="_blank" rel="noreferrer" href={`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`}>{t('Send by WhatsApp', 'أرسل بواتساب')}</a>
          </div>
          <p className="note">{t(c.note[0], c.note[1])}</p>
        </form>
      </section>
    </div>
  )
}

export function Pages() {
  const t = useT()
  const { seg } = parseHash()
  const d = useData()
  const page = seg[0] ?? ''
  let body: React.ReactNode = <h1>{t('Page not found', 'الصفحة غير موجودة')}</h1>
  if (page === 'quote') body = <QuoteForm d={d} />
  else if (page === 'about') body = <About />
  else if (page === 'story') body = <Story />
  else if (page === 'ventures') body = <PartnerPage kind="ventures" />
  else if (page === 'agencies') body = <PartnerPage kind="agencies" />
  else if (page === 'branches') body = <Branches />
  else if (page === 'contact') body = <Contact />
  else if (page === 'distributors') body = <Distributors />
  else if (!d) body = <p>{t('Loading…', 'جارٍ التحميل…')}</p>
  else if (page === 'products') body = <Products d={d} />
  else if (page === 'product') body = <Detail d={d} id={seg[1]} />
  return <Shell>{body}</Shell>
}
