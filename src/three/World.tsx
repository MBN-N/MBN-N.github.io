import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { EffectComposer, Vignette, Noise } from '@react-three/postprocessing'
import * as THREE from 'three'
import { Room } from './Room'
import { DirectionalBlur, DirectionalBlurEffect } from './DirectionalBlur'
import { state, sceneIndexAt } from '../lib/timeline'
import { content } from '../lib/journey'
import tl from '../content/timeline.json'
import { useState } from 'react'

const scenes = content.scenes
const D0 = tl.D0
const NOBLUR = new URLSearchParams(location.search).has('noblur')

function CameraRig() {
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    // verification probe: screen-space box (fractions of the viewport) of the frame's outer rectangle
    ;(window as unknown as Record<string, unknown>).__probe = () => {
      camera.updateMatrixWorld()
      const pts = [[-4.4, 3.1], [4.4, 3.1], [4.4, 8.9], [-4.4, 8.9]].map(([x, y]) => new THREE.Vector3(x, y, 0.1).project(camera))
      const xs = pts.map((p) => (p.x + 1) / 2)
      const ys = pts.map((p) => (1 - p.y) / 2)
      return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
    }
  }, [camera])
  useFrame(() => {
    const d = state.dist
    const t = Math.max(d, 0) / D0
    const y = 6 - 2.8 * t
    const ly = 6 - 1.4 * t
    camera.position.set(state.camX, y, d)
    camera.lookAt(state.camX * 0.3, ly, d - D0)
  })
  return null
}

function Active() {
  const [idx, setIdx] = useState(0)
  useFrame(() => {
    const n = sceneIndexAt(state.frame)
    if (n !== idx) setIdx(n)
  })
  // lazy-load: only the visible scene and the next one are requested
  useEffect(() => {
    const next = scenes[Math.min(idx + 1, scenes.length - 1)]
    Object.values(next.layers).forEach((u) => useTexture.preload(u))
  }, [idx])
  const s = scenes[idx]
  return <Room key={s.id} variant={s.room as 'hall' | 'dark'} layers={s.layers} />
}

function Post() {
  const blur = useRef<DirectionalBlurEffect>(null)
  const vig = useRef<{ darkness: number } | null>(null)
  const small = useMemo(() => new THREE.Vector2(0, 0), [])
  useFrame(() => {
    blur.current?.set(NOBLUR ? 0 : state.blur, state.blurAngle)
    if (vig.current) vig.current.darkness = 0.08 + state.vignette * 0.25
    small.set(0, 0)
  })
  return (
    <EffectComposer multisampling={0}>
      <DirectionalBlur ref={blur} />
      <Vignette ref={vig as never} offset={0.25} darkness={0.9} />
      <Noise opacity={0.02} />
    </EffectComposer>
  )
}

export function World() {
  return (
    <>
      <color attach="background" args={['#f4f5f8']} />
      <CameraRig />
      <Active />
      <Post />
    </>
  )
}
