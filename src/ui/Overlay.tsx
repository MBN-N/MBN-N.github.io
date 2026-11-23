import { useEffect, useRef, useState } from 'react'
import { state, sceneIndexAt } from '../lib/timeline'
import { content } from '../lib/journey'

const scenes = content.scenes
const intro = content.intro
const logos = content.logos
const NAV = [['Home','#/'],['All products','#/products'],['Our story','#/story'],['About','#/about'],['Branches','#/branches'],['Contact','#/contact']]

export function Overlay() {
  const [idx, setIdx] = useState(0)
  const refs = {
    fade: useRef<HTMLDivElement>(null),
    intro: useRef<HTMLDivElement>(null),
    title: useRef<HTMLDivElement>(null),
    btn: useRef<HTMLDivElement>(null),
    readouts: useRef<HTMLDivElement>(null),
    chevron: useRef<HTMLSpanElement>(null),
    menu: useRef<HTMLDivElement>(null),
  }
  const last = useRef(0)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    let raf = 0
    const stage = document.querySelector<HTMLElement>('.stage')
    const tick = () => {
      const n = sceneIndexAt(state.frame)
      if (n !== last.current) {
        last.current = n
        setIdx(n)
      }
      const set = (el: HTMLElement | null, op: number, blurPx = 0) => {
        if (!el) return
        el.style.opacity = String(op)
        el.style.filter = blurPx > 0.1 ? `blur(${blurPx.toFixed(1)}px)` : 'none'
      }
      if (stage) stage.style.filter = Math.abs(state.exposure - 1) > 0.01 ? `brightness(${state.exposure.toFixed(3)})` : 'none'
      if (refs.fade.current) refs.fade.current.style.opacity = String(state.fade)
      set(refs.intro.current, state.introOp, (1 - state.introOp) * 6)
      set(refs.title.current, state.titleOp, (1 - state.titleOp) * 8)
      set(refs.btn.current, state.btnOp, (1 - state.btnOp) * 6)
      set(refs.readouts.current, state.readoutsOp)
      set(refs.chevron.current, state.chevronOp)
      set(refs.menu.current, state.menuOp)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  const s = scenes[idx]
  return (
    <>
      <div ref={refs.fade} className="fade" />
      <div className="ui">
        <div ref={refs.menu} className="menu">
          <span className="year">{s.year}</span>
          <span className="pill" role="button" onClick={() => setOpen((o) => !o)}>{open ? 'Close' : 'Menu'}</span>
        </div>
        <div ref={refs.intro} className="intro">
          {intro.map((l) => (
            <div key={l}>{l}</div>
          ))}
          <div className="logos">
            {logos.map((l) => (
              <img key={l} src={`/brand/${l}`} alt="" />
            ))}
          </div>
        </div>
        {open && (
          <nav className="navpanel">
            {NAV.map(([n, h]) => (
              <a key={n} href={h}>{n}</a>
            ))}
          </nav>
        )}
        <div className="title">
          <div ref={refs.title} className="tt">
          <h1>
            {s.title.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </h1>
          <p>{s.subtitle}</p>
          </div>
          <div ref={refs.btn} className="btnrow">
            <button className="btn" onClick={() => { location.hash = s.href }}>{s.button}</button>
            <span ref={refs.chevron} className="chev">›</span>
          </div>
        </div>
        <div ref={refs.readouts} className="readouts">
          <div className="cap">
            {s.caption.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>
          <div className="stats">
            {s.readouts.map((r) => (
              <div key={r.label}>
                <b>{r.value}</b>
                <small>{r.label}</small>
              </div>
            ))}
          </div>
          <div className="lab">
            {s.label.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
