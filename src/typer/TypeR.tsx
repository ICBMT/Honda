import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import TwistText from '../lib/TwistText'

gsap.registerPlugin(ScrollTrigger)

const MODEL_URL = '/models/honda_civic_type_r.glb'
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
const EXIT: Key[] = [
  { t: 0.8, pos: CABIN, look: WINDSHIELD_LOOK },
  { t: 0.85, pos: new THREE.Vector3(0.45, 1.05, -0.35), look: WINDSHIELD_LOOK },
  { t: ORBIT_FROM, pos: new THREE.Vector3(1.7, 1.15, -1.9), look: new THREE.Vector3(0, 0.95, 0), back: true },
]
const ORBIT_LOOK = new THREE.Vector3(0, 0.95, 0)

// Then one full 360-degree orbit around the outside of the car. It starts at the front-left fender and
// ends back on the left side, pulling out to the framing distance as it goes.
function orbitPose(p: number, fit: number, start: THREE.Vector3) {
  const q = THREE.MathUtils.clamp((p - ORBIT_FROM) / (1 - ORBIT_FROM), 0, 1)
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

    let bodyMat: THREE.MeshStandardMaterial | null = null
    const wheels: THREE.Mesh[] = []
    let loaded = false

    // Scroll-driven car state. The timeline writes into this; the frame loop reads it.
    const state = { carX: -7, carRotY: 0, spin: 0 }

    const resize = () => {
      const w = cv.clientWidth
      const h = cv.clientHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(cv)

    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    loader.load(MODEL_URL, (gltf) => {
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

      // Cabin light fades in as the camera enters and out as it leaves.
      const seated = p >= SEATED_FROM && p <= SEATED_TO
      glowLevel = THREE.MathUtils.damp(glowLevel, seated ? 10 : 0, 6, dt)
      cabinLight.intensity = glowLevel

      const fit = fitFactor()
      let pose: { pos: THREE.Vector3; look: THREE.Vector3 }
      if (p <= SEATED_FROM) pose = poseOn(ENTER, p, fit)
      else if (p < SEATED_TO) pose = { pos: CABIN, look: lookOn(HOLD, p) }
      else if (p < ORBIT_FROM) pose = poseOn(EXIT, p, fit)
      else pose = orbitPose(p, fit, poseOn(EXIT, ORBIT_FROM, fit).pos)
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
    <section ref={root} className="relative h-[520vh] w-full bg-[#05070d]" aria-label="Civic Type-R">
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
