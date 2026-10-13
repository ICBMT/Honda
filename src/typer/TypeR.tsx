import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import TwistText from '../lib/TwistText'

gsap.registerPlugin(ScrollTrigger)

import { modelSrc } from '../lib/preload'
const CAR_LENGTH = 4.6
const CAR_RE = /body_white_ext|tire|tyre|headlight/i
const TYRE_RE = /tire|tyre/i
const TARGET = new THREE.Vector3(0, 0.7, 0)
// Car is centred at the origin, nose toward +X, right-hand side toward +Z.
const BEHIND = new THREE.Vector3(-4.3, 1.25, 0.3)      // behind the car, on its centre line
const REAR_GLASS = new THREE.Vector3(-1.4, 1.1, 0.2)   // just inside the rear glass
const CABIN = new THREE.Vector3(-0.15, 1.02, 0.2)      // seated, between the front seats and dash
const CABIN_LOOK = new THREE.Vector3(CABIN.x + 2, CABIN.y - 0.05, CABIN.z)
const CAR_FOCUS = new THREE.Vector3(0.2, 0.9, 0.2)     // keeps the car framed while the camera enters
const PAINTS = [
  { name: 'Championship White', hex: '#f2f2ef' },
  { name: 'Rally Red', hex: '#c8102e' },
  { name: 'Crystal Black Pearl', hex: '#101216' },
]

// Camera path, keyed by scroll progress. Each segment is a smooth spline through its keys, so nothing cuts or stops.
// Keys marked orbit are pulled back on narrow screens so the whole car stays in frame. Keys marked back
// move away from the car by the same amount, so the glide starts far enough back on a phone.
type Key = { t: number; pos: THREE.Vector3; look: THREE.Vector3; orbit?: boolean; back?: boolean }
const ENTER: Key[] = [
  { t: 0, pos: new THREE.Vector3(0.4, 1.3, 9.5), look: new THREE.Vector3(0, 1.5, 0), orbit: true },
  { t: 0.2, pos: new THREE.Vector3(-3.4, 1.3, 2.4), look: new THREE.Vector3(0.2, 1.0, 0.2) },
  { t: 0.36, pos: BEHIND, look: CAR_FOCUS, back: true },
  { t: 0.46, pos: REAR_GLASS, look: CAR_FOCUS },
  { t: 0.56, pos: CABIN, look: CABIN_LOOK },
]
// Seated: the look drifts from straight ahead down to the dashboard, then up to the windshield on the left.
const DASH_LOOK = new THREE.Vector3(0.5, 0.8, 0.2)
const WINDSHIELD_LOOK = new THREE.Vector3(2.5, 1.05, -0.7)
const HOLD: { t: number; look: THREE.Vector3 }[] = [
  { t: 0.56, look: CABIN_LOOK },
  { t: 0.68, look: DASH_LOOK },
  { t: 0.8, look: WINDSHIELD_LOOK },
]
// Exit: out through the left side of the windshield and past the front-left fender.
const ORBIT_FROM = 0.88
const ROLL_FROM = 0.94          // the orbit ends here and the car starts rolling on the road
const ROLL_SPEED = 6            // world units per second the road runs past when the loop plays
const ROAD_TILE = 10            // world units per repeat of the lane markings
const EXIT: Key[] = [
  { t: 0.8, pos: CABIN, look: WINDSHIELD_LOOK },
  { t: 0.85, pos: new THREE.Vector3(0.45, 1.05, -0.35), look: WINDSHIELD_LOOK },
  { t: ORBIT_FROM, pos: new THREE.Vector3(1.7, 1.15, -1.9), look: new THREE.Vector3(0, 0.95, 0), back: true },
]
const ORBIT_LOOK = new THREE.Vector3(0, 0.95, 0)

// Then one full 360-degree orbit around the outside of the car. It starts at the front-left fender and
// ends back on the left side, pulling out to the framing distance as it goes.
// After that the camera holds on the left side while the car loops on the road.
function roadPose(t: number, fit: number) {
  // Held on the left side with a slow drift, so the loop breathes.
  return { pos: new THREE.Vector3(Math.sin(t * 0.2) * 0.35, 1.25, -9.5 * fit), look: ORBIT_LOOK.clone() }
}

function orbitPose(p: number, fit: number, start: THREE.Vector3) {
  const q = THREE.MathUtils.clamp((p - ORBIT_FROM) / (ROLL_FROM - ORBIT_FROM), 0, 1)
  const e = 0.5 - 0.5 * Math.cos(Math.PI * q)
  const r0 = Math.hypot(start.x, start.z)
  const th0 = Math.atan2(start.z, start.x)
  const r = THREE.MathUtils.lerp(r0, 9.5 * fit, e)
  const th = THREE.MathUtils.lerp(th0, -2.5 * Math.PI, e)
  const y = THREE.MathUtils.lerp(start.y, 1.25, e)
  return { pos: new THREE.Vector3(r * Math.cos(th), y, r * Math.sin(th)), look: ORBIT_LOOK.clone() }
}
const SEATED_FROM = 0.56
const SEATED_TO = 0.8

// Look direction only, while seated. The camera position stays put.
function lookOn(keys: { t: number; look: THREE.Vector3 }[], p: number) {
  const n = keys.length
  const curve = new THREE.CatmullRomCurve3(keys.map((k) => k.look), false, 'centripetal')
  let i = 0
  while (i < n - 2 && p >= keys[i + 1].t) i++
  const f = THREE.MathUtils.clamp((p - keys[i].t) / (keys[i + 1].t - keys[i].t), 0, 1)
  return curve.getPoint((i + f) / (n - 1))
}

// Position and look at scroll progress p, interpolated along a spline through the keys.
function poseOn(keys: Key[], p: number, fit: number) {
  const n = keys.length
  const pts = keys.map((k) => {
    if (k.orbit) return new THREE.Vector3(k.pos.x, k.pos.y, k.pos.z * fit)
    if (k.back) return CAR_FOCUS.clone().lerp(k.pos, fit)
    return k.pos
  })
  const posCurve = new THREE.CatmullRomCurve3(pts, false, 'centripetal')
  const lookCurve = new THREE.CatmullRomCurve3(keys.map((k) => k.look), false, 'centripetal')
  let i = 0
  while (i < n - 2 && p >= keys[i + 1].t) i++
  const f = THREE.MathUtils.clamp((p - keys[i].t) / (keys[i + 1].t - keys[i].t), 0, 1)
  const u = (i + f) / (n - 1)
  return { pos: posCurve.getPoint(u), look: lookCurve.getPoint(u) }
}

// Bounds of the meshes whose material name matches, measured from their real vertices.
function boundsOf(root: THREE.Object3D, re: RegExp) {
  const b = new THREE.Box3()
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const mat = Array.isArray(m.material) ? m.material[0] : m.material
    if (re.test(mat.name || '')) b.expandByObject(m, true)
  })
  return b
}

// Each wheel is a cylinder around its hub (axle along Z). Triangles whose centroid falls inside a wheel cylinder
// move into a per-wheel mesh that pivots on the hub, so tyre, rim, hub and calliper turn together.
function splitWheelParts(src: THREE.Mesh, seeds: THREE.Vector3[], R: number, halfW: number): THREE.Mesh[] {
  const geo = src.geometry as THREE.BufferGeometry
  const pos = geo.attributes.position as THREE.BufferAttribute
  const nor = geo.attributes.normal as THREE.BufferAttribute | undefined
  const uv = geo.attributes.uv as THREE.BufferAttribute | undefined
  const idx = geo.index
  const triCount = idx ? idx.count / 3 : pos.count / 3
  const vi = (t: number, j: number) => (idx ? idx.getX(t * 3 + j) : t * 3 + j)
  const nmWorld = new THREE.Matrix3().getNormalMatrix(src.matrixWorld)
  const identity = new THREE.Matrix3()
  const rest = { p: [] as number[], n: [] as number[], uv: [] as number[] }
  const buckets = seeds.map(() => ({ p: [] as number[], n: [] as number[], uv: [] as number[] }))
  const N = new THREE.Vector3()
  const push = (b: { p: number[]; n: number[]; uv: number[] }, i: number, q: THREE.Vector3, nm: THREE.Matrix3) => {
    b.p.push(q.x, q.y, q.z)
    if (nor) { N.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); b.n.push(N.x, N.y, N.z) }
    if (uv) b.uv.push(uv.getX(i), uv.getY(i))
  }
  let moved = 0
  for (let t = 0; t < triCount; t++) {
    const ids = [vi(t, 0), vi(t, 1), vi(t, 2)]
    const world = ids.map((i) => new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(src.matrixWorld))
    const cx = (world[0].x + world[1].x + world[2].x) / 3
    const cy = (world[0].y + world[1].y + world[2].y) / 3
    const cz = (world[0].z + world[1].z + world[2].z) / 3
    const hit = seeds.findIndex((s) => Math.abs(cz - s.z) < halfW && Math.hypot(cx - s.x, cy - s.y) < R * 1.02)
    if (hit >= 0) {
      moved++
      ids.forEach((i, j) => push(buckets[hit], i, world[j], nmWorld))
    } else {
      ids.forEach((i) => push(rest, i, new THREE.Vector3().fromBufferAttribute(pos, i), identity))
    }
  }
  if (!moved) return []
  const build = (b: { p: number[]; n: number[]; uv: number[] }) => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3))
    if (b.n.length) g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3))
    if (b.uv.length) g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2))
    return g
  }
  src.geometry = build(rest)
  const out: THREE.Mesh[] = []
  buckets.forEach((b, k) => {
    if (!b.p.length) return
    const g = build(b)
    const s = seeds[k]
    g.translate(-s.x, -s.y, -s.z)
    const m = new THREE.Mesh(g, src.material)
    m.position.copy(s)
    m.castShadow = true
    m.receiveShadow = true
    out.push(m)
  })
  return out
}

export default function TypeR() {
  const root = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const paintRef = useRef<(i: number) => void>(() => {})
  const [ready, setReady] = useState(false)
  const [paint, setPaint] = useState(0)

  useEffect(() => {
    const el = root.current!
    const cv = canvas.current!
    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#05070d')
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.55

    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 200)

    const key = new THREE.DirectionalLight('#ffffff', 2.2)
    key.position.set(4, 6, 5)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.left = -4
    key.shadow.camera.right = 4
    key.shadow.camera.top = 4
    key.shadow.camera.bottom = -4
    key.shadow.bias = -0.0005
    scene.add(key)
    const rim = new THREE.DirectionalLight('#ff3340', 3.0)
    rim.position.set(-6, 3, -5)
    scene.add(rim)
    const fill = new THREE.DirectionalLight('#5aa8ff', 0.8)
    fill.position.set(-4, 2, 6)
    scene.add(fill)

    // Floor: a shadow catcher, plus a soft red glow under the car.
    const floor = new THREE.Mesh(new THREE.CircleGeometry(12, 64), new THREE.ShadowMaterial({ opacity: 0.55 }))
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)
    const glowCanvas = document.createElement('canvas')
    glowCanvas.width = glowCanvas.height = 256
    const gctx = glowCanvas.getContext('2d')!
    const grad = gctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    grad.addColorStop(0, 'rgba(255,50,64,0.55)')
    grad.addColorStop(0.5, 'rgba(255,50,64,0.12)')
    grad.addColorStop(1, 'rgba(255,50,64,0)')
    gctx.fillStyle = grad
    gctx.fillRect(0, 0, 256, 256)
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 9),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(glowCanvas), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    )
    glow.rotation.x = -Math.PI / 2
    glow.position.y = 0.002
    scene.add(glow)

    // The car rig. It stays at the origin while the model loads.
    const rig = new THREE.Group()
    scene.add(rig)
    const cabinLight = new THREE.PointLight('#ffe9d6', 0, 7, 1.6)
    cabinLight.position.copy(CABIN).add(new THREE.Vector3(0, 0.1, 0))
    rig.add(cabinLight)

    // Road: appears as the journey ends, then loops on its own clock.
    const roadCv = document.createElement('canvas')
    roadCv.width = roadCv.height = 512
    const rctx = roadCv.getContext('2d')!
    rctx.fillStyle = '#07040a'
    rctx.fillRect(0, 0, 512, 512)
    for (let i = 0; i < 1800; i++) {
      rctx.fillStyle = `rgba(255,40,60,${Math.random() * 0.04})`
      rctx.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 2, 1 + Math.random() * 2)
    }
    rctx.shadowColor = '#ff1030'
    rctx.shadowBlur = 18
    rctx.fillStyle = '#ff2b45'
    rctx.fillRect(0, 12, 512, 7)
    rctx.fillRect(0, 493, 512, 7)
    for (let x = 0; x < 512; x += 256) rctx.fillRect(x, 251, 128, 10)
    rctx.shadowBlur = 0
    const roadTex = new THREE.CanvasTexture(roadCv)
    roadTex.colorSpace = THREE.SRGBColorSpace
    roadTex.wrapS = THREE.RepeatWrapping
    roadTex.wrapT = THREE.RepeatWrapping
    roadTex.repeat.set(400 / ROAD_TILE, 1)
    roadTex.anisotropy = 8
    const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, emissiveMap: roadTex, emissive: '#ff1030', emissiveIntensity: 0.8, roughness: 0.9, metalness: 0, envMapIntensity: 0.12, transparent: true, opacity: 0 })
    const road = new THREE.Mesh(new THREE.PlaneGeometry(400, 40), roadMat)
    road.rotation.x = -Math.PI / 2
    road.position.y = 0.003
    road.receiveShadow = true
    scene.add(road)

    // Airflow: layered glowing streamlines, like a wind-tunnel shot. Rows bend over and around the body,
    // and a dashed streak slides along each row. Smoke trails from the tail.
    const aero = new THREE.Group()
    rig.add(aero)
    const lineMats: LineMaterial[] = []
    const aeroRows: { mat: LineMaterial; speed: number; alpha: number }[] = []
    const profile: [number, number][] = [[-6, 0.4], [-2.4, 0.95], [-1.7, 1.1], [-0.9, 1.42], [0.1, 1.42], [0.9, 1.0], [2.0, 0.85], [2.4, 0.6], [6, 0.4]]
    const topY = (x: number) => {
      for (let i = 0; i < profile.length - 1; i++) {
        const [x0, y0] = profile[i]
        const [x1, y1] = profile[i + 1]
        if (x <= x1) return y0 + (y1 - y0) * THREE.MathUtils.clamp((x - x0) / (x1 - x0), 0, 1)
      }
      return profile[profile.length - 1][1]
    }
    const smooth01 = (v: number) => {
      const t = THREE.MathUtils.clamp(v, 0, 1)
      return t * t * (3 - 2 * t)
    }
    // Smoke texture for the wind-tunnel puffs.
    const smokeCv = document.createElement('canvas')
    smokeCv.width = smokeCv.height = 128
    const sctx = smokeCv.getContext('2d')!
    const sg = sctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    sg.addColorStop(0, 'rgba(255,255,255,0.9)')
    sg.addColorStop(0.45, 'rgba(255,255,255,0.3)')
    sg.addColorStop(1, 'rgba(255,255,255,0)')
    sctx.fillStyle = sg
    sctx.fillRect(0, 0, 128, 128)
    const smokeTex = new THREE.CanvasTexture(smokeCv)
    const smokePuffs: { sprite: THREE.Sprite; mat: THREE.SpriteMaterial; pts: THREE.Vector3[]; speed: number; seed: number; alpha: number }[] = []

    // A row is one airflow path around the car. Thin glowing lines mark the path; smoke puffs ride along it.
    const addRow = (z0: number, y0: number, color: string, width: number, speed: number, dash: number, alpha: number, puffCount: number) => {
      const N = 120
      const pos: number[] = []
      const pts: THREE.Vector3[] = []
      const deflect = Math.abs(z0) < 0.95 ? 1 : 0.35
      for (let i = 0; i < N; i++) {
        const x = 7 - (14 * i) / (N - 1)
        const w = smooth01((4.4 - Math.abs(x)) / 2.4)
        const top = topY(x) + 0.14
        const y = y0 + Math.max(0, top - y0) * w * deflect
        const z = z0 + Math.sign(z0) * 0.4 * w
        pos.push(x, y, z)
        pts.push(new THREE.Vector3(x, y, z))
      }
      const geo = new LineGeometry()
      geo.setPositions(pos)
      const mat = new LineMaterial({ color, linewidth: width, dashed: true, dashSize: dash, gapSize: 0.35, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
      mat.resolution.set(cv.clientWidth || 1, cv.clientHeight || 1)
      const line = new Line2(geo, mat)
      line.computeLineDistances()
      aero.add(line)
      lineMats.push(mat)
      aeroRows.push({ mat, speed, alpha })
      for (let k = 0; k < puffCount; k++) {
        const pmat = new THREE.SpriteMaterial({ map: smokeTex, color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
        const sprite = new THREE.Sprite(pmat)
        aero.add(sprite)
        smokePuffs.push({ sprite, mat: pmat, pts, speed: speed * 0.12, seed: k / puffCount, alpha: 0.5 })
      }
    }
    for (let y0 = 0.15; y0 <= 2.45; y0 += 0.16) {
      addRow(-1.4, y0, '#3ab4ff', 1.2, 0.9, 1.6, 0.3, 3)
      addRow(1.9, y0, '#7fd8ff', 1.0, 0.6, 1.2, 0.18, 2)
    }
    let wheelR = 0.34

    let bodyMat: THREE.MeshStandardMaterial | null = null
    const wheels: THREE.Mesh[] = []
    let loaded = false

    // Scroll-driven car state. The timeline writes into this; the frame loop reads it.
    const state = { carX: -7, carRotY: 0, spin: 0 }

    const resize = () => {
      const w = cv.clientWidth
      const h = cv.clientHeight
      renderer.setSize(w, h, false)
      lineMats.forEach((m) => m.resolution.set(w, h))
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(cv)

    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    loader.load(modelSrc(), (gltf) => {
      const model = gltf.scene
      model.updateMatrixWorld(true)

      // Long axis to X, then scale so the body is CAR_LENGTH long.
      const s0 = boundsOf(model, CAR_RE).getSize(new THREE.Vector3())
      if (s0.z > s0.x) model.rotation.y = Math.PI / 2
      model.updateMatrixWorld(true)
      const s1 = boundsOf(model, CAR_RE).getSize(new THREE.Vector3())
      model.scale.setScalar(CAR_LENGTH / Math.max(s1.x, s1.z))
      model.updateMatrixWorld(true)

      // Centre on the body and stand the tyres on the floor.
      const c = boundsOf(model, CAR_RE).getCenter(new THREE.Vector3())
      const tyre0 = boundsOf(model, TYRE_RE)
      model.position.set(-c.x, -tyre0.min.y, -c.z)
      model.updateMatrixWorld(true)

      // Materials, shadows, and which end is the nose (the headlights sit at the front).
      let noseSum = 0
      model.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh) return
        const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial
        const name = mat.name || ''
        mesh.castShadow = true
        mesh.receiveShadow = true
        if (/headlight/i.test(name)) noseSum += boundsOf(mesh, /./).getCenter(new THREE.Vector3()).x
        if (/body_white_ext/i.test(name)) bodyMat = mat
      })
      if (noseSum < 0) model.rotation.y += Math.PI
      model.updateMatrixWorld(true)
      rig.add(model)
      rig.updateMatrixWorld(true)

      // Wheels: each wheel's triangles move into a mesh that pivots on its hub, so the whole wheel turns together.
      const tyreBox = boundsOf(model, TYRE_RE)
      const R = (tyreBox.max.y - tyreBox.min.y) / 2
      wheelR = R
      const hubY = tyreBox.min.y + R
      const xFront = tyreBox.max.x - R
      const xRear = tyreBox.min.x + R
      const zRight = tyreBox.max.z - 0.125
      const zLeft = tyreBox.min.z + 0.125
      const seeds = [
        new THREE.Vector3(xFront, hubY, zRight),
        new THREE.Vector3(xFront, hubY, zLeft),
        new THREE.Vector3(xRear, hubY, zRight),
        new THREE.Vector3(xRear, hubY, zLeft),
      ]
      const allMeshes: THREE.Mesh[] = []
      model.traverse((o) => { if ((o as THREE.Mesh).isMesh) allMeshes.push(o as THREE.Mesh) })
      allMeshes.forEach((m) => {
        splitWheelParts(m, seeds, R, 0.16).forEach((w) => { rig.add(w); wheels.push(w) })
      })

      loaded = true
      setReady(true)
    })

    // The timeline: roll in, glide into the cabin from behind, look around the dash, leave through the windshield, orbit the car.
    // Only the car and the wheel spin are timed here; the camera is computed from the same progress each frame.
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } })
    tl.to(state, { carX: 0, spin: 1, duration: 0.2, ease: 'power3.out' }, 0)
      .to(state, { spin: 0, duration: 0.05 }, 0.2)
    const trigger = ScrollTrigger.create({ trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.6, animation: tl })

    // Keep the car in frame on narrow screens by pulling the orbit keys back.
    const fitFactor = () => {
      const hHalfTan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect
      const fitDist = (CAR_LENGTH * 0.62) / hHalfTan
      return Math.max(1, 1 + Math.max(0, fitDist - 9.5) / 9.5)
    }

    let last = performance.now()
    let raf = 0
    let visible = true
    let glowLevel = 0
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting }, { threshold: 0 })
    io.observe(el)

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (!visible || !loaded) return

      const p = tl.progress()
      rig.position.x = state.carX
      rig.rotation.y = state.carRotY
      rig.updateMatrixWorld(true)
      wheels.forEach((w) => { w.rotation.z -= dt * state.spin * 14 })

      // The road appears as the journey ends, then loops on its own clock: wheels, lane markings and airflow.
      const tNow = now / 1000
      const roadK = smooth01((p - 0.92) / 0.02)
      const aeroK = smooth01((p - 0.93) / 0.02)
      roadMat.opacity = roadK
      const step = dt * roadK * ROLL_SPEED
      wheels.forEach((w) => { w.rotation.z -= step / wheelR })
      roadTex.offset.x += step / ROAD_TILE
      aeroRows.forEach((r) => {
        r.mat.dashOffset -= dt * r.speed
        r.mat.opacity = aeroK * r.alpha
      })
      smokePuffs.forEach((sp) => {
        const u = (tNow * sp.speed + sp.seed) % 1
        const f = u * (sp.pts.length - 1)
        const i0 = Math.floor(f)
        const i1 = Math.min(sp.pts.length - 1, i0 + 1)
        sp.sprite.position.lerpVectors(sp.pts[i0], sp.pts[i1], f - i0)
        const sz = 0.12 + u * 0.45
        sp.sprite.scale.set(sz, sz, 1)
        sp.mat.opacity = aeroK * Math.min(1, u * 8) * (1 - u) * sp.alpha * 0.6
      })

      // Cabin light fades in as the camera enters and out as it leaves.
      const seated = p >= SEATED_FROM && p <= SEATED_TO
      glowLevel = THREE.MathUtils.damp(glowLevel, seated ? 10 : 0, 6, dt)
      cabinLight.intensity = glowLevel

      const fit = fitFactor()
      let pose: { pos: THREE.Vector3; look: THREE.Vector3 }
      if (p <= SEATED_FROM) pose = poseOn(ENTER, p, fit)
      else if (p < SEATED_TO) pose = { pos: CABIN, look: lookOn(HOLD, p) }
      else if (p < ORBIT_FROM) pose = poseOn(EXIT, p, fit)
      else if (p < ROLL_FROM) pose = orbitPose(p, fit, poseOn(EXIT, ORBIT_FROM, fit).pos)
      else pose = roadPose(tNow, fit)
      camera.position.copy(pose.pos)
      camera.lookAt(pose.look)

      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(frame)

    paintRef.current = (i: number) => {
      if (!bodyMat) return
      const col = new THREE.Color(PAINTS[i].hex)
      gsap.to(bodyMat.color, { r: col.r, g: col.g, b: col.b, duration: 0.9, ease: 'power2.out' })
    }

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      trigger.kill()
      tl.kill()
      renderer.dispose()
      pmrem.dispose()
    }
  }, [])

  useEffect(() => {
    paintRef.current(paint)
  }, [paint, ready])

  return (
    <section ref={root} className="relative h-[560vh] w-full bg-[#05070d]" aria-label="Civic Type-R">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_70%,rgba(200,16,46,0.22),transparent_60%)]" />
        <canvas ref={canvas} className="absolute inset-0 h-full w-full" />

        <h2 className="pointer-events-none absolute left-1/2 top-[7vh] -translate-x-1/2 whitespace-nowrap text-center font-black uppercase leading-none tracking-[0.02em] text-white" style={{ fontSize: 'clamp(40px, 8vw, 150px)' }}>
          <TwistText text="Civic Type-R" />
        </h2>
        <p className="pointer-events-none absolute left-1/2 top-[calc(7vh+clamp(40px,8vw,150px)+1.5vh)] -translate-x-1/2 whitespace-nowrap text-center font-light tracking-[0.35em] text-[#ff3340]" style={{ fontSize: 'clamp(10px, 1vw, 16px)' }}>
          TRACK-BRED · ROAD-LEGAL
        </p>

        <div className="absolute bottom-[7vh] left-1/2 flex -translate-x-1/2 items-center gap-4">
          {PAINTS.map((p, i) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setPaint(i)}
              aria-label={p.name}
              title={p.name}
              className={`h-8 w-8 rounded-full border-2 transition-transform duration-300 hover:scale-125 ${paint === i ? 'scale-110 border-white' : 'border-white/30'}`}
              style={{ background: p.hex }}
            />
          ))}
          <span className="ml-2 font-light tracking-[0.2em] text-white/80" style={{ fontSize: 'clamp(10px, 0.9vw, 14px)' }}>{PAINTS[paint].name.toUpperCase()}</span>
        </div>
        <p className="pointer-events-none absolute bottom-[2.5vh] right-[4vw] text-[10px] tracking-[0.25em] text-white/40">
          SCROLL TO DRIVE
        </p>
      </div>
    </section>
  )
}
