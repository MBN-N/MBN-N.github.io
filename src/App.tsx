import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { World } from './three/World'
import { Overlay } from './ui/Overlay'
import { Fallback } from './ui/Fallback'
import { Pages } from './ui/Pages'
import { isJourney, parseHash } from './lib/journey'
import { Studio } from './studio/Studio'
import { buildTimeline, bindScroll, totalFrames, scrollPx } from './lib/timeline'

const lite = () =>
  new URLSearchParams(location.search).has('lite') ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
  (window.innerWidth < 520 && !new URLSearchParams(location.search).has('full'))

function Loading({ ready }: { ready: boolean }) {
  const { progress } = useProgress()
  return (
    <div className={`loading ${ready ? 'done' : ''}`}>
      <span>{Math.round(progress)}%</span>
    </div>
  )
}

function Experience() {
  const [ready, setReady] = useState(false)
  const { progress } = useProgress()
  useEffect(() => {
    if (progress >= 100) setReady(true) // latch: only the first scene gates the loader
  }, [progress])
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.09 })
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (t: number) => lenis.raf(t * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    const tl = buildTimeline()
    const st = bindScroll(tl)
    Object.assign(window, { __tl: tl, __lenis: lenis, __px: scrollPx })
    return () => {
      st.kill()
      tl.kill()
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  }, [])
  return (
    <>
      <div className="stage">
        <Canvas dpr={[1, 1.5]} camera={{ fov: 50, near: 0.05, far: 140 }} gl={{ antialias: false, powerPreference: 'high-performance' }}>
          <Suspense fallback={null}>
            <World />
          </Suspense>
        </Canvas>
      </div>
      <Overlay />
      <Loading ready={ready} />
      <div style={{ height: (totalFrames - 1) * scrollPx + window.innerHeight }} />
    </>
  )
}

export default function App() {
  const [isLite] = useState(lite)
  const first = parseHash().seg[0]
  if (first === undefined || first === 'studio') return <Studio />
  if (!isJourney) return <Pages />
  return isLite ? <Fallback /> : <Experience />
}
