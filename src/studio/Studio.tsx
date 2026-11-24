import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useT, useLang } from '../lib/i18n'
import { LangToggle } from '../ui/LangToggle'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, MeshReflectorMaterial, PerformanceMonitor, useGLTF, useTexture } from '@react-three/drei'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { useLoader } from '@react-three/fiber'
import { EffectComposer, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import Lenis from 'lenis'
import { parseHash } from '../lib/journey'
import { DirectionalBlur, DirectionalBlurEffect } from '../three/DirectionalBlur'

type Item = { src: string; w: number; h: number; id: string; name: string; turn?: { cols: number; rows: number; frames: number } }
type Stage = { id: string; name: string; title: string[]; sub: string; logo: string; href: string; items: Item[] }

const NAVY = '#181a2c'
const BG = '#f3f4f7'
const GAP = 26 // distance between stages along -z
const HOLD = 10.5 // camera distance from the stage at its hold
const PROD_H = 3.2

/** shared live values (scroll progress -> camera, blur, overlay) */
const live = { target: 0, p: 0, vel: 0, stage: 0, hold: 1, camZ: 0 }

const smooth = (t: number) => t * t * (3 - 2 * t)
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))

function shadowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128)
  r.addColorStop(0, 'rgba(24,26,44,.55)')
  r.addColorStop(0.5, 'rgba(24,26,44,.22)')
  r.addColorStop(1, 'rgba(24,26,44,0)')
  g.fillStyle = r
  g.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(c)
}

const turnVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const turnFrag = `
uniform sampler2D map; uniform float frame; uniform float frames; uniform vec2 grid; varying vec2 vUv;
vec4 cell(float f){ f = mod(f, frames); float c = mod(f, grid.x); float r = floor(f / grid.x);
  vec2 uv = vec2((c + vUv.x) / grid.x, 1.0 - (r + 1.0 - vUv.y) / grid.y); return texture2D(map, uv); }
void main(){ float f0 = floor(frame); float t = frame - f0; vec4 a = cell(f0); vec4 b = cell(f0 + 1.0);
  gl_FragColor = mix(a, b, t);
  #include <colorspace_fragment>
}`

/** real 360-degree turntable (Lucas photos): atlas frames cross-faded, multiplied over the light stage so the white background vanishes */
function TurnProduct({ item, x, z, rot, k, shadow }: { item: Item; x: number; z: number; rot: number; k: number; shadow: THREE.Texture }) {
  const tex = useTexture(item.src)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const h = PROD_H * 1.05
  const w = h * (item.w / item.h)
  const t = item.turn!
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { map: { value: tex }, frame: { value: 0 }, frames: { value: t.frames }, grid: { value: new THREE.Vector2(t.cols, t.rows) } },
        vertexShader: turnVert,
        fragmentShader: turnFrag,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [tex, t],
  )
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!g.current) return
    const tt = clock.elapsedTime
    g.current.position.y = 0.36 + h / 2 + 0.05 + Math.sin(tt * 0.8 + k) * 0.035
    g.current.rotation.y = rot * 0.5
    mat.uniforms.frame.value = (live.p * 110 + k * 7 + tt * 0.9 + 25 * 4) % t.frames
  })
  return (
    <group position={[x, 0, z]}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.37, 0]}>
        <planeGeometry args={[w * 1.5, w * 0.7]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} />
      </mesh>
      <group ref={g}>
        <mesh material={mat}>
          <planeGeometry args={[w, h]} />
        </mesh>
      </group>
    </group>
  )
}

function Product({ item, x, z, rot, k, shadow }: { item: Item; x: number; z: number; rot: number; k: number; shadow: THREE.Texture }) {
  const tex = useTexture(item.src)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const h = PROD_H * Math.min(1, 1.25 * (item.h > item.w * 2.2 ? 1.05 : 0.95))
  const w = h * (item.w / item.h)
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!g.current) return
    const t = clock.elapsedTime
    g.current.position.y = 0.36 + h / 2 + 0.05 + Math.sin(t * 0.8 + k) * 0.035
    g.current.rotation.y = rot + Math.sin(live.p * 9 + k * 1.7) * 0.1 + Math.sin(t * 0.4 + k) * 0.03
  })
  return (
    <group position={[x, 0, z]}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.37, 0]}>
        <planeGeometry args={[w * 1.5, w * 0.7]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} />
      </mesh>
      <group ref={g}>
        <mesh>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial map={tex} transparent alphaTest={0.04} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  )
}

function Plinth({ z }: { z: number }) {
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[4.3, 4.45, 0.36, 96]} />
        <meshStandardMaterial color="#ffffff" roughness={0.18} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.365, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[4.3, 0.025, 12, 160]} />
        <meshBasicMaterial color={NAVY} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[4.5, 0.02, 12, 160]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  )
}

const logoFrag = `
uniform sampler2D map; uniform float sweep; varying vec2 vUv;
void main(){
  vec4 c = texture2D(map, vUv);
  float band = smoothstep(0.11, 0.0, abs(vUv.x * 0.75 + vUv.y * 0.25 - sweep));
  c.rgb += band * 0.3 * c.a;
  gl_FragColor = c;
  #include <colorspace_fragment>
}`

/** a brand logo floating in the space (no board): slow yaw, gentle float, a light sweep across it, reflected by the floor */
function Logo3D({ file, x = 0, y, z, maxW, maxH, phase = 0, still = false }: { file: string; x?: number; y: number; z: number; maxW: number; maxH: number; phase?: number; still?: boolean }) {
  const tex = useTexture(`/brand/${file}`)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 16
  const im = tex.image as { width: number; height: number }
  const asp = im.width / im.height
  const w = Math.min(maxW, maxH * asp)
  const h = w / asp
  const g = useRef<THREE.Group>(null)
  const camera = useThree((st) => st.camera)
  useEffect(() => { camera.layers.enable(1) }, [camera])
  const mat = useMemo(
    () => new THREE.ShaderMaterial({ uniforms: { map: { value: tex }, sweep: { value: -1 } }, vertexShader: turnVert, fragmentShader: logoFrag, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }),
    [tex],
  )
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (!g.current || still) return
    g.current.position.y = y + Math.sin(t * 0.7 + phase) * 0.12
    g.current.rotation.y = Math.sin(t * 0.35 + phase) * 0.2 + Math.sin(live.p * 12 + phase) * 0.12
    mat.uniforms.sweep.value = ((t * 0.28 + phase * 0.37) % 2.6) - 0.7
  })
  return (
    <group ref={g} position={[x, y, z - 5]}>
      <mesh material={mat} layers={1}>
        <planeGeometry args={[w, h]} />
      </mesh>
    </group>
  )
}

/** only the stage(s) near the camera are drawn: no ghosts of far stages, and less to render */
function useNear(z: number): [React.RefObject<THREE.Group | null>, boolean] {
  const g = useRef<THREE.Group>(null)
  const [near, setNear] = useState(false)
  useFrame(() => {
    const d = Math.abs(live.camZ - HOLD - z)
    if (g.current) g.current.visible = d < GAP * 0.9
    const n = d < GAP * 1.6 // textures are only loaded for the stage you are at and the next one
    if (n !== near) setNear(n)
  })
  return [g, near]
}


type CarCfg = {
  url: string
  len: number
  x: number
  yaw: number
  layout: 'above' | 'beside' | 'hoses'
  zUp?: boolean
  hood?: RegExp // meshes (or ancestors) forming the hood: it opens when the camera arrives
  hoodAng?: number
  paint?: string // override body colour (FBX exports that lost their paint)
  bodyRe?: RegExp
}
const CARS: Record<string, CarCfg> = {
  lucas: { url: '/cars3d/lucas/car.glb', len: 8.2, x: 0.9, yaw: -0.42, layout: 'above' },
  motorvac: { url: '/cars3d/motorvac/FINAL_MODEL_GT325.fbx', len: 5.8, x: 0.4, yaw: -0.5, layout: 'beside' },
  vp: { url: '/cars3d/vp/FINAL_MODEL_SF90.fbx', len: 7.2, x: 1.5, yaw: -0.42, layout: 'above' },
  shield: { url: '/cars3d/shield/FINAL_MODEL.fbx', len: 5.6, x: 0.5, yaw: -0.5, layout: 'beside', zUp: true, paint: '#1c2230', bodyRe: /COLORBODY/ },
}

type Ports = { s: number; top: number; bay: THREE.Vector3; w: number }

/** car-paint look for FBX/Phong exports: physical materials with clearcoat, no stray emissive colours */
function upgradeMaterial(mt: THREE.Material, cfg: CarCfg): THREE.Material {
  const p = mt as THREE.MeshPhongMaterial & THREE.MeshPhysicalMaterial
  if (!(p as unknown as { isMeshPhongMaterial?: boolean }).isMeshPhongMaterial) return mt
  const name = (p.name || '').toUpperCase()
  const out = new THREE.MeshPhysicalMaterial({ color: p.color, map: p.map, normalMap: p.normalMap, aoMap: p.aoMap, side: p.side, transparent: p.transparent, opacity: p.opacity, name: p.name })
  const glow = /GLOW|BULB|DRL|INDICATIOR|DISPLAY|INDICATOR/.test(name)
  if (glow) { out.emissive = p.emissive.clone(); out.emissiveMap = p.emissiveMap; out.emissiveIntensity = 0.8 }
  const isBody = cfg.bodyRe?.test(name)
  if (isBody && cfg.paint) {
    out.map = null
    out.color = new THREE.Color(cfg.paint)
    out.metalness = 0.55
    out.roughness = 0.28
    out.clearcoat = 1
    out.clearcoatRoughness = 0.06
  } else if (/CHROME|ALLOY|DISC|MIRROR/.test(name)) {
    out.metalness = 1
    out.roughness = 0.18
  } else if (/GLASS|WINDOW/.test(name)) {
    out.metalness = 0.2
    out.roughness = 0.05
    out.transparent = true
    out.opacity = Math.min(out.opacity, 0.35)
    out.depthWrite = false
  } else {
    out.metalness = 0.15
    out.roughness = /RUBBER|TYRE|PLASTIC/.test(name) ? 0.7 : 0.45
  }
  for (const m of [out.map, out.normalMap]) if (m) m.anisotropy = 16
  out.envMapIntensity = 1
  return out
}

function CarModelInner({ cfg, shadowTex, z, children }: { cfg: CarCfg; shadowTex: THREE.Texture; z: number; children?: (p: Ports) => React.ReactNode }) {
  const isGlb = cfg.url.endsWith('.glb')
  const obj = isGlb
    ? useGLTF(cfg.url).scene
    : useLoader(FBXLoader, cfg.url, (l) => l.setResourcePath(cfg.url.slice(0, cfg.url.lastIndexOf('/') + 1)))
  const g = useRef<THREE.Group>(null)
  const { model, k, off, hoodPivot, ports } = useMemo(() => {
    const inner = obj.clone(true)
    if (cfg.zUp) inner.rotation.x = -Math.PI / 2
    const m = new THREE.Group()
    m.add(inner)
    const b = new THREE.Box3().setFromObject(m)
    const sz = b.getSize(new THREE.Vector3())
    const long = Math.max(sz.x, sz.z)
    if (sz.z > sz.x) m.rotation.y = Math.PI / 2
    const w = new THREE.Group() // identity wrapper: hood pivots live here, in the car's own axes (x = length)
    w.add(m)
    w.updateMatrixWorld(true)
    m.traverse((o) => {
      const me = o as THREE.Mesh
      if (me.isMesh) {
        me.frustumCulled = false
        const ms = (Array.isArray(me.material) ? me.material : [me.material]) as THREE.Material[]
        const next = ms.map((mt) => {
          const u = upgradeMaterial(mt, cfg)
          const pm = u as THREE.MeshPhysicalMaterial
          if (pm.transmission) { pm.transmission = 0; pm.transparent = true; pm.opacity = Math.min(pm.opacity, 0.35); pm.depthWrite = false }
          if (pm.envMapIntensity !== undefined) pm.envMapIntensity = /paint|carpaint/i.test(pm.name) ? 1.8 : Math.max(pm.envMapIntensity, 0.9)
          u.needsUpdate = true
          return u
        })
        me.material = Array.isArray(me.material) ? next : next[0]
      }
    })
    const C = new THREE.Box3().setFromObject(w)
    const cc = C.getCenter(new THREE.Vector3())
    // hood: pivot at the rear edge (top), lifted around the width axis
    let pivot: THREE.Group | null = null
    let s = 1
    const bay = new THREE.Vector3(cc.x, C.min.y + (C.max.y - C.min.y) * 0.55, cc.z)
    let hoodSign = 1
    if (cfg.hood) {
      const hm: THREE.Object3D[] = []
      w.traverse((o) => {
        if (!(o as THREE.Mesh).isMesh) return
        let p: THREE.Object3D | null = o
        while (p && p !== w) { if (cfg.hood!.test(p.name)) { hm.push(o); return } p = p.parent }
      })
      if (hm.length) {
        const H = new THREE.Box3()
        hm.forEach((o) => H.expandByObject(o))
        const hc = H.getCenter(new THREE.Vector3())
        s = hc.x >= cc.x ? 1 : -1
        hoodSign = s
        const hinge = new THREE.Vector3(s > 0 ? H.min.x : H.max.x, H.max.y, hc.z)
        pivot = new THREE.Group()
        pivot.position.copy(hinge)
        w.add(pivot)
        hm.forEach((o) => {
          pivot!.attach(o)
          const mm = (o as THREE.Mesh).material
          ;(Array.isArray(mm) ? mm : [mm]).forEach((x) => { x.side = THREE.DoubleSide })
        })
        bay.set(hc.x, H.min.y, hc.z)
      }
    }
    const kk = cfg.len / long
    const offv = new THREE.Vector3(-cc.x, -C.min.y, -cc.z)
    // ports in the car frame (unscaled): bay centre, top of the body, width
    const toCar = (v: THREE.Vector3) => v.clone().add(offv).multiplyScalar(kk)
    const bayCar = toCar(bay)
    const top = (C.max.y - C.min.y) * kk
    return { model: w, k: kk, off: offv, hoodPivot: pivot ? { pivot, s: hoodSign } : null, ports: { s: hoodSign, top, bay: bayCar, w: (C.max.z - C.min.z) * kk } as Ports }
  }, [obj, cfg])
  const open = useRef(0)
  useFrame(({ clock }, dt) => {
    if (g.current) g.current.rotation.y = cfg.yaw + Math.sin(clock.elapsedTime * 0.25) * 0.06 + Math.sin(live.p * 8) * 0.05
    if (hoodPivot && cfg.hoodAng) {
      const target = Math.abs(live.camZ - HOLD - z) < GAP * 0.4 ? 1 : 0
      open.current += (target - open.current) * Math.min(1, dt * 1.6)
      const a = cfg.hoodAng * smooth(clamp(open.current))
      hoodPivot.pivot.rotation.z = hoodPivot.s * a
    }
  })
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[cfg.x, 0.02, -1]} rotation-z={0}>
        <planeGeometry args={[cfg.len * 1.45, cfg.len * 0.7]} />
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} opacity={0.95} />
      </mesh>
      <group ref={g} position={[cfg.x, 0, -1]}>
        <group scale={k}>
          <primitive object={model} position={off} />
        </group>
        {children?.(ports)}
      </group>
    </>
  )
}

const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1)
blank.needsUpdate = true

/** one machine hose: black rubber tube with coloured couplers, from the machine to a port inside the engine bay */
function Hose({ from, to, lift, color, r = 0.028 }: { from: THREE.Vector3; to: THREE.Vector3; lift: number; color: string; r?: number }) {
  const geo = useMemo(() => {
    const a = from.clone()
    const e = to.clone()
    const mid = a.clone().lerp(e, 0.5)
    const c = new THREE.CatmullRomCurve3(
      [a, a.clone().add(new THREE.Vector3(0, 0.35, 0)), new THREE.Vector3(mid.x, mid.y + lift, mid.z), e.clone().add(new THREE.Vector3(0, 0.45, 0)), e],
      false,
      'catmullrom',
      0.5,
    )
    return { tube: new THREE.TubeGeometry(c, 64, r, 12, false), a, e }
  }, [from, to, lift, r])
  return (
    <group>
      <mesh geometry={geo.tube}>
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.25} />
      </mesh>
      {[geo.a, geo.e].map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[r * 1.7, 16, 12]} />
          <meshStandardMaterial color="#c9ccd2" roughness={0.2} metalness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/** a finished photo-style car scene (cut-out with its products) standing on the floor */
const PHOTO: Record<string, string> = { lucas: '/cars/lucas_gmc.png', motorvac: '/cars/motorvac_bmw.png', shield: '/cars/shield_camry.png', vp: '/cars/vp_vette.png' }

function PhotoCar({ src, z, x = 1.2, h = 5.0, shadowTex }: { src: string; z: number; x?: number; h?: number; shadowTex: THREE.Texture }) {
  const tex = useTexture(src)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 16
  const im = tex.image as { width: number; height: number }
  const w = h * (im.width / im.height)
  const g = useRef<THREE.Group>(null)
  const camera = useThree((st) => st.camera)
  useEffect(() => { camera.layers.enable(1) }, [camera]) // layer 1 is drawn by the main camera but not by the floor's mirror camera: no reflection
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.y = Math.sin(clock.elapsedTime * 0.3) * 0.05 + Math.sin(live.p * 8) * 0.04
  })
  return (
    <group position={[x, 0, z - 1]}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0.1]}>
        <planeGeometry args={[w * 0.95, h * 0.5]} />
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} opacity={0.9} />
      </mesh>
      <group ref={g}>
        <mesh position={[0, h / 2 - 0.05, 0]} layers={1}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial map={tex} transparent alphaTest={0.03} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  )
}

function BrandStage({ stage, z, shadow }: { stage: Stage; z: number; shadow: THREE.Texture }) {
  const n = stage.items.length
  const [g, near] = useNear(z)
  const cfg = CARS[stage.id]
  const renderItems = (p: Ports) => {
    const Pf = (it: Item) => (it.turn ? TurnProduct : Product)
    if (cfg.layout === 'above') {
      // oils float above the open engine bay
      const sc = stage.id === 'vp' ? 0.4 : 0.5
      const gap = stage.id === 'vp' ? 1.0 : 1.15
      return stage.items.map((it, i) => {
        const P = Pf(it)
        const dx = (i - (n - 1) / 2) * gap
        return (
          <group key={it.id} position={[dx, p.top + 0.45, 0.25 * Math.abs(i - (n - 1) / 2)]} scale={sc}>
            <P item={it} x={0} z={0} rot={-cfg.yaw} k={i} shadow={blank} />
          </group>
        )
      })
    }
    if (cfg.layout === 'hoses') {
      // machines stand beside the front wheel; hoses run into the open bay
      const sc = 0.42
      const colors = ['#d62828', '#f0a30a', '#2f80ed']
      const used = [1, 2, 3] // oil/gearbox, brake/coolant, transmission machines get hoses
      return stage.items.map((it, i) => {
        const P = Pf(it)
        const t = 0.8 + i * 0.66 // along the screen-right direction, expressed in the car frame
        const mx = p.bay.x + p.s * 1.0 + Math.cos(cfg.yaw) * t
        const mz = Math.sin(cfg.yaw) * t
        const hose = used.indexOf(i)
        return (
          <group key={it.id}>
            <group position={[mx, 0, mz]} scale={sc}>
              <P item={it} x={0} z={0} rot={-cfg.yaw} k={i} shadow={shadow} />
            </group>
            {hose >= 0 &&
              [-1, 1].map((d) => (
                <Hose
                  key={d}
                  from={new THREE.Vector3(mx + d * 0.1, 1.3, mz)}
                  to={new THREE.Vector3(p.bay.x + p.s * (0.25 - hose * 0.3), p.bay.y - 0.1, p.bay.z + d * 0.22 * (hose + 1))}
                  lift={0.3 + hose * 0.08}
                  color={colors[hose]}
                />
              ))}
          </group>
        )
      })
    }
    // beside: a row of products to the screen-right of the nose
    const sc = 0.42
    const nose = (cfg.len / 2) * 0.98
    return stage.items.map((it, i) => {
      const P = Pf(it)
      const t = 0.35 + i * 0.52
      return (
        <group key={it.id} position={[nose + Math.cos(cfg.yaw) * t, 0, Math.sin(cfg.yaw) * t + 0.2]} scale={sc}>
          <P item={it} x={0} z={0} rot={-cfg.yaw} k={i} shadow={shadow} />
        </group>
      )
    })
  }
  return (
    <group ref={g}>
      {!cfg && stage.items.length > 0 && <Plinth z={z} />}
      {near && (
        <Suspense fallback={null}>
          <Logo3D file={stage.logo} y={cfg ? 6.6 : 5.9} z={z} maxW={stage.id === 'autolube' ? 4.4 : 3.4} maxH={stage.id === 'autolube' ? 2.6 : 1.5} />
        </Suspense>
      )}
      {near && PHOTO[stage.id] && (
        <Suspense fallback={null}>
          <PhotoCar src={PHOTO[stage.id]} z={z} shadowTex={shadow} x={stage.id === 'motorvac' ? 2.3 : stage.id === 'shield' ? 2.0 : stage.id === 'vp' ? 2.0 : undefined} h={stage.id === 'motorvac' ? 4.8 : stage.id === 'shield' ? 4.6 : stage.id === 'vp' ? 4.8 : undefined} />
        </Suspense>
      )}
      {near && cfg && !PHOTO[stage.id] && (
        <Suspense fallback={null}>
          <group position={[0, 0, z]}>
            <CarModelInner cfg={cfg} shadowTex={shadow} z={z}>
              {renderItems}
            </CarModelInner>
          </group>
        </Suspense>
      )}
      {near && !cfg && !PHOTO[stage.id] &&
        stage.items.map((it, i) => {
          const P = it.turn ? TurnProduct : Product
          const a = (i - (n - 1) / 2) * 0.43
          return <P key={it.id} item={it} x={Math.sin(a) * 3.0} z={z - (1 - Math.cos(a)) * 2.6} rot={-a * 0.85} k={i} shadow={shadow} />
        })}
    </group>
  )
}

function FinalStage({ z }: { z: number }) {
  const [g] = useNear(z)
  const asp = useThree((st) => st.size.width / st.size.height)
  const portrait = asp < 1.2
  const sh = portrait ? (1.2 / Math.max(asp, 0.35) - 1) * 8 * 0.2 : 0 // same shift the camera rig applies
  const logos = ['lucas_shield.png', 'motorvac.png', 'vp.png', 'shield_x4.png']
  return (
    <group ref={g}>
      <Suspense fallback={null}>
        <Logo3D file="stl_new.png" x={sh} y={portrait ? 7.4 : 6.2} z={z + 1} maxW={portrait ? 4.6 : 5.4} maxH={1.3} phase={0.5} still />
        {logos.map((f, i) => portrait ? (
          <Logo3D key={f} file={f} x={sh + ((i % 2) - 0.5) * 3.2} y={5.4 - Math.floor(i / 2) * 1.9} z={z + 4} maxW={2.8} maxH={1.5} phase={i * 1.3} still />
        ) : (
          <Logo3D key={f} file={f} x={(i - 1.5) * 2.9} y={3.7 + (i % 2) * 0.2} z={z + 5 - Math.abs(i - 1.5) * 0.8} maxW={2.3} maxH={1.5} phase={i * 1.3} still />
        ))}
      </Suspense>
    </group>
  )
}

function Rig({ count }: { count: number }) {
  useFrame(({ camera }, dt) => {
    const prev = live.p
    live.p += (live.target - live.p) * Math.min(1, dt * 4.2)
    live.vel += ((live.p - prev) / Math.max(dt, 0.001) - live.vel) * Math.min(1, dt * 8)
    const s = live.p * (count - 1)
    const i = Math.min(Math.floor(s), count - 2)
    const f = s - i
    const g = smooth(clamp((f - 0.22) / 0.56)) // plateau at both ends = hold
    const z0 = -i * GAP
    const z1 = -(i + 1) * GAP
    const open = (1 - smooth(clamp(s / 0.45))) * 6 // opening pull-back at the very start
    const cz = THREE.MathUtils.lerp(z0, z1, g) + HOLD + open
    const arc = Math.sin(g * Math.PI)
    const drift = (f - 0.5) * 1.4
    const x = arc * 8.5 * (i % 2 ? -1 : 1) + drift
    const y = 2.2 + arc * 1.4 + open * 0.3
    // portrait screens: pull the camera back so the full scene fits the narrow width
    const asp = (camera as THREE.PerspectiveCamera).aspect || 1
    const back = asp < 1.2 ? (1.2 / Math.max(asp, 0.35) - 1) * 8 : 0
    const sh = back * 0.2
    camera.position.set(x + sh, y + back * 0.12, cz + back)
    camera.lookAt(x * 0.15 + sh, 1.95, cz - HOLD)
    camera.rotation.z += arc * 0.018 * (i % 2 ? -1 : 1)
    live.camZ = cz
    live.stage = Math.round(s)
    live.hold = clamp(1 - Math.abs(s - Math.round(s)) / 0.2)
  })
  return null
}

const MOBILE = typeof window !== 'undefined' && window.matchMedia('(max-width: 820px), (pointer: coarse)').matches

function Post() {
  const blur = useRef<DirectionalBlurEffect>(null)
  useFrame(() => {
    blur.current?.set(clamp(Math.abs(live.vel) * 0.018, 0, 0.045), 0.15)
  })
  if (MOBILE) return null // phones: skip the full-screen post passes, they cost frames
  return (
    <EffectComposer multisampling={0}>
      <DirectionalBlur ref={blur} />
      <Vignette offset={0.3} darkness={0.35} />
    </EffectComposer>
  )
}

function World({ stages }: { stages: Stage[] }) {
  const shadow = useMemo(shadowTexture, [])
  return (
    <>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 16, 52]} />
      <Environment resolution={MOBILE ? 128 : 256} environmentIntensity={0.55}>
        <Lightformer form="rect" intensity={1.2} position={[0, 6, 4]} scale={[14, 3, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[-8, 3, 0]} rotation-y={Math.PI / 2} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[8, 3, 0]} rotation-y={-Math.PI / 2} scale={[10, 3, 1]} />
      </Environment>
      <ambientLight intensity={1.1} />
      <directionalLight position={[6, 12, 8]} intensity={1.8} />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -40]}>
        <planeGeometry args={[120, 160]} />
        {MOBILE
          ? <meshBasicMaterial color="#eceef3" toneMapped={false} />
          : <MeshReflectorMaterial color="#eceef3" blur={[700, 240]} resolution={768} mixBlur={1} mixStrength={9} mirror={0.6} roughness={0.5} depthScale={0.6} minDepthThreshold={0.4} maxDepthThreshold={1.2} metalness={0.05} />}
      </mesh>
      {stages.map((s, i) => (
        <Suspense key={s.id} fallback={null}>
          <BrandStage stage={s} z={-i * GAP} shadow={shadow} />
        </Suspense>
      ))}
      <Suspense fallback={null}>
        <FinalStage z={-stages.length * GAP} />
      </Suspense>
      <Rig count={stages.length + 1} />
      <Post />
    </>
  )
}

const SUB_AR: Record<string, string> = {
  lucas: 'زيوت ومضافات وزيوت محركات',
  motorvac: 'أجهزة الصيانة الوقائية والتشخيص',
  vp: 'وقود سباقات وزيوت ومضافات',
  shield: 'العناية بالسيارات من الداخل والخارج',
}
const NAME_AR: Record<string, string> = { lucas: 'Lucas Oil', motorvac: 'MotorVac', vp: 'VP Racing Fuels', shield: 'Shield' }

function Overlay({ stages }: { stages: Stage[] }) {
  const t = useT()
  const ar = useLang() === 'ar'
  const [idx, setIdx] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    let last = 0
    const tick = () => {
      if (live.stage !== last) {
        last = live.stage
        setIdx(last)
      }
      if (box.current) {
        box.current.style.opacity = String(live.hold)
        box.current.style.transform = `translateY(${(1 - live.hold) * 18}px)`
        box.current.style.filter = live.hold < 0.98 ? `blur(${((1 - live.hold) * 8).toFixed(1)}px)` : 'none'
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  const [menu, setMenu] = useState(false)
  useEffect(() => { const c = () => setMenu(false); window.addEventListener('scroll', c, { passive: true }); return () => window.removeEventListener('scroll', c) }, [])
  const s = stages[idx]
  return (
    <div className="st-ui">
      <header className={menu ? 'mn-open' : ''}>
        <a href="#/"><img src="/brand/stl_new.png" alt="Scan Tool Line" /></a>
        <button type="button" className="mn-btn" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(!menu)}><i /><i /><i /></button>
        <nav onClick={() => setMenu(false)}>
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
      <div ref={box} className={s ? 'st-copy' : 'st-copy st-final'}>
        {s ? (
          <>
            <img className="st-logo" src={`/brand/${s.logo}`} alt={s.name} />
            <small>{s.id === 'autolube' ? t('Group company', 'شركة تابعة') : t('Exclusive agent in Saudi Arabia', 'الوكيل الحصري في السعودية')}</small>
            <h1>{ar ? NAME_AR[s.id] ?? s.title.join(' ') : s.title.join(' ')}</h1>
            <p>{ar ? SUB_AR[s.id] ?? s.sub : s.sub}</p>
            <div className="st-cta">
              {s.id !== 'motorvac' && <a className="st-btn" href={s.href}>{s.id === 'autolube' ? t('View service centres', 'مراكز الصيانة') : t(`Explore ${s.name}`, `استكشف ${NAME_AR[s.id] ?? s.name}`)}</a>}
              {s.id !== 'autolube' && s.id !== 'motorvac' && <a className="st-link" href={`#/products?b=${s.id.replace(/\d+$/, '')}`}>{t('View products', 'عرض المنتجات')} ›</a>}
            </div>
          </>
        ) : (
          <>
            <small>{t('Scan Tool Line', 'خط الأجهزة')}</small>
            <h1>{t('One partner for four world brands', 'شريك واحد لأربع علامات عالمية')}</h1>
            <p>{t('Lucas Oil, MotorVac, VP Racing Fuels and Shield.', 'Lucas Oil و MotorVac و VP Racing Fuels و Shield.')}</p>
            <div className="st-cta">
              <a className="st-btn" href="#/quote">{t('Request a quote', 'اطلب عرض سعر')}</a>
              <a className="st-link" href="#/products">{t('All products', 'كل المنتجات')} ›</a>
            </div>
            <div className="st-cards">
              <a href="#/agencies"><small>{t('Agencies', 'الوكالات')}</small><b>{t('Global agencies', 'الوكالات العالمية')}</b></a>
              <a href="#/ventures"><small>{t('Investment', 'الاستثمار')}</small><b>{t('Partnerships & collaboration', 'الشراكات وفرص التعاون')}</b></a>
            </div>
          </>
        )}
      </div>
      <div className="st-dots">
        {Array.from({ length: stages.length + 1 }, (_, i) => (
          <i key={i} className={i === idx ? 'on' : ''} />
        ))}
      </div>
      <div className="st-hint">{t('Scroll', 'مرّر')}</div>
    </div>
  )
}

function Fps() {
  const el = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    let n = 0
    let t0 = performance.now()
    const tick = (t: number) => {
      n++
      if (t - t0 >= 500) {
        if (el.current) el.current.textContent = `${Math.round((n * 1000) / (t - t0))} fps`
        n = 0
        t0 = t
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <div ref={el} className="st-fps" />
}

export function Studio() {
  const hi = MOBILE ? Math.min(window.devicePixelRatio || 2, 2) : 1.5
  const lo = MOBILE ? Math.min(hi, 1.5) : 1
  const [dpr, setDpr] = useState(hi)
  const [stages, setStages] = useState<Stage[] | null>(null)
  useEffect(() => {
    const lucas = parseHash().seg[1] === 'lucas'
    fetch(lucas ? '/studio_lucas.json' : '/studio.json').then((r) => r.json()).then(setStages)
  }, [])
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.085 })
    let maxScroll = 0
    const measure = () => { maxScroll = document.documentElement.scrollHeight - innerHeight }
    measure(); const ro = new ResizeObserver(measure); ro.observe(document.documentElement); window.addEventListener('resize', measure)
    let raf = 0
    const tick = (t: number) => {
      lenis.raf(t)
      const max = maxScroll
      live.target = max > 0 ? clamp(scrollY / max) : 0
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect(); window.removeEventListener('resize', measure)
      lenis.destroy()
    }
  }, [])
  if (!stages) return <div className="st-load" />
  return (
    <div className="st">
      <div className="st-stage">
        <Canvas dpr={dpr} camera={{ fov: 40, near: 0.1, far: 160 }} gl={{ antialias: !MOBILE, powerPreference: 'high-performance' }}>
          <PerformanceMonitor onDecline={() => setDpr(lo)} onIncline={() => setDpr(hi)} />
          <Suspense fallback={null}>
            <World stages={stages} />
          </Suspense>
        </Canvas>
      </div>
      <Overlay stages={stages} />
      {new URLSearchParams(location.search).has('fps') && <Fps />}
      <div style={{ height: (stages.length * 1500) + innerHeight }} />
    </div>
  )
}
