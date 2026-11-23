import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import tlData from '../content/timeline.json'
import { content } from './journey'

gsap.registerPlugin(ScrollTrigger)

export const FPS = tlData.fps
const INTRO = tlData.introFrames // frames 1..34 (shot A, first piece only)
const CYC = tlData.cycleLength // local frames 35..370
const C0 = tlData.cycleStart
export const DARKEST = tlData.darkestLocal

export type TrackName = keyof typeof tlData.tracks

/** Live values written by the master timeline, read by canvas + overlay every frame. */
export const state = {
  frame: 1,
  dist: tlData.D0,
  camX: 0,
  blur: 0,
  blurAngle: 0,
  fade: 0,
  vignette: 0.6,
  roomLight: 1,
  exposure: 1,
  introOp: 0,
  titleOp: 0,
  readoutsOp: 0,
  chevronOp: 0,
  btnOp: 0,
  menuOp: 1,
}
type StateKey = Exclude<keyof typeof state, 'frame'>

export const sceneCount = content.scenes.length
export const totalFrames = INTRO + CYC * Math.max(sceneCount - 1, 0)
export const scrollPx = content.scrollPxPerFrame

/** master frame (1-based) -> cycle index k and local reference frame L (1..370) */
export function locate(m: number) {
  if (m <= INTRO || sceneCount < 2) return { k: 0, L: Math.min(m, tlData.lastLocal) }
  const r = m - C0
  const k = Math.min(Math.floor(r / CYC), sceneCount - 2)
  return { k, L: C0 + (r - CYC * k) }
}
export function sceneIndexAt(m: number) {
  const { k, L } = locate(m)
  return Math.min(L < DARKEST ? k : k + 1, sceneCount - 1)
}
const masterOf = (k: number, L: number) => (k === 0 ? L : C0 + CYC * k + (L - C0))

const SMOOTH: TrackName[] = ['dist', 'camX', 'blur', 'blurAngle', 'fade', 'vignette', 'roomLight', 'exposure']
const UI: TrackName[] = ['introOp', 'titleOp', 'readoutsOp', 'chevronOp', 'btnOp', 'menuOp']

export function buildTimeline() {
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
  // linear frame counter: 1 reference frame = 1/30 s
  tl.fromTo(state, { frame: 1 }, { frame: totalFrames, duration: (totalFrames - 1) / FPS, immediateRender: false }, 0)
  const cycles = Math.max(sceneCount - 1, 1)
  for (let k = 0; k < cycles; k++) {
    const start = k === 0 ? 1 : C0
    for (const [name, L] of Object.entries(tlData.labels)) {
      if (k > 0 && L < C0) continue
      if (L >= start) tl.addLabel(`c${k}_${name}`, (masterOf(k, L) - 1) / FPS)
    }
    const add = (name: TrackName, step: number) => {
      const pts = tlData.tracks[name] as number[][]
      const sel = pts.filter(([L], i) => L >= start && (i % step === 0 || L === 370))
      for (let i = 0; i < sel.length - 1; i++) {
        const [L1, v1] = sel[i]
        const [L2, v2] = sel[i + 1]
        tl.fromTo(
          state,
          { [name]: v1 },
          { [name]: v2, duration: (L2 - L1) / FPS, immediateRender: false },
          (masterOf(k, L1) - 1) / FPS,
        )
      }
    }
    SMOOTH.forEach((n) => add(n, 2))
    UI.forEach((n) => add(n, 1))
  }
  return tl
}

export function bindScroll(tl: gsap.core.Timeline) {
  return ScrollTrigger.create({
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    animation: tl,
  })
}
export type { StateKey }
