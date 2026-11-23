import { useEffect, useRef } from 'react'
import { content } from '../lib/journey'

/** Small screens / prefers-reduced-motion: same content, same order, cross-fades instead of the camera flight. */
export function Fallback() {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.target.classList.toggle('in', e.isIntersecting)),
      { threshold: 0.35 },
    )
    root.current?.querySelectorAll('section').forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [])
  return (
    <div ref={root} className="fallback">
      {content.scenes.map((s) => (
        <section key={s.id}>
          <img src={s.layers.hero} alt="" loading="lazy" />
          <div className="fb-text">
            <h1>{s.title.join(' ')}</h1>
            <p>{s.subtitle}</p>
            <small>{s.caption.join(' ')}</small>
            <div className="fb-stats">
              {s.readouts.map((r) => (
                <span key={r.label}>
                  <b>{r.value}</b> {r.label}
                </span>
              ))}
            </div>
            <button className="btn" onClick={() => { location.hash = s.href }}>{s.button}</button>
          </div>
        </section>
      ))}
    </div>
  )
}
