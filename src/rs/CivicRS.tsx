import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import rsLogo from './assets/rs-logo.png'
import streetBg from './assets/street-bg.jpg'

const MODEL_URL = '/models/honda_civic_rs.glb'
const CAR_LENGTH = 6.2 // a little larger again, so the car fills the right side as in the print
const TYRE_RE = /tire|tyre/i
const WHEELS = ['FL', 'FR', 'RL', 'RR']
// A wheel's parts: its tyres, rims, bolts and brakes. Rim meshes are named e.g. eHEV_RS_FL_RIMS_01.
const wheelPart = (w: string) => new RegExp('(^|[^A-Za-z])' + w + '_+(WHEEL|RIMS)')
// Aim above the car so it sits lower in the frame, down on the road.
const TARGET = new THREE.Vector3(0, 1.4, 0)
// Camera: low, front three-quarter, on the car's right side, as in the print.
const CAM_DIR = new THREE.Vector3(0.42, 0.13, 1).normalize()
const CAM_DIST = 18 // fitted to the print: car spans most of the right side and sits on the road

// Final pose (from the print): the front faces the camera, angled toward the left of the frame.
const YAW_END = -1.81
// Entry: the car is sliding sideways (nose toward the camera) and straightens out as it settles.
const YAW_START = -Math.PI / 2
const START_X = 7.5
const START_Z = 2.4
const INTRO = 3.6 // seconds from the car entering view to settling in place
const SMOKE_MAX = 160

// Name of a node plus all its ancestors, so a mesh can be matched by the node names above it.
function chainName(o: THREE.Object3D) {
  let s = ''
  let c: THREE.Object3D | null = o
  while (c) { s += ' ' + (c.name || ''); c = c.parent }
  return s
}

function boundsOf(root: THREE.Object3D, re: RegExp, wheel?: string) {
  const box = new THREE.Box3()
  let any = false
  const wheelRe = wheel ? wheelPart(wheel) : null
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const n = chainName(m)
    if (!re.test(n) || (wheelRe && !wheelRe.test(n))) return
    box.expandByObject(m)
    any = true
  })
  return any ? box : null
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t)
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function smokeTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(235,238,242,0.95)')
  grad.addColorStop(0.45, 'rgba(210,215,222,0.5)')
  grad.addColorStop(1, 'rgba(200,205,212,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export default function CivicRS() {
  const root = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const cv = canvas.current!
    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.55

    const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 200)

    const key = new THREE.DirectionalLight('#ffffff', 2.2)
    key.position.set(4, 6, 5)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.left = -6
    key.shadow.camera.right = 6
    key.shadow.camera.top = 6
    key.shadow.camera.bottom = -6
    key.shadow.bias = -0.0005
    scene.add(key)
    const rim = new THREE.DirectionalLight('#ff3340', 3.0)
    rim.position.set(-6, 3, -5)
    scene.add(rim)
    const fill = new THREE.DirectionalLight('#5aa8ff', 0.8)
    fill.position.set(-4, 2, 6)
    scene.add(fill)

    // The photo road shows through; this plane only catches the car's shadow.
    const shadowPlane = new THREE.Mesh(new THREE.CircleGeometry(14, 64), new THREE.ShadowMaterial({ opacity: 0.6 }))
    shadowPlane.rotation.x = -Math.PI / 2
    shadowPlane.position.y = 0.002
    shadowPlane.receiveShadow = true
    scene.add(shadowPlane)

    // The rig holds the car. It stays at identity while the model is set up, then the intro drives it.
    const rig = new THREE.Group()
    scene.add(rig)
    const wheelPivots: { pivot: THREE.Group; rear: boolean }[] = []

    // Tyre smoke: a pool of soft sprites, recycled as they fade.
    const smokeTex = smokeTexture()
    const smoke: { sprite: THREE.Sprite; mat: THREE.SpriteMaterial; age: number; life: number; vel: THREE.Vector3; alive: boolean }[] = []
    for (let i = 0; i < SMOKE_MAX; i++) {
      const mat = new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 })
      const sprite = new THREE.Sprite(mat)
      sprite.visible = false
      scene.add(sprite)
      smoke.push({ sprite, mat, age: 0, life: 1, vel: new THREE.Vector3(), alive: false })
    }
    let emitAcc = 0

    const resize = () => {
      const w = cv.clientWidth
      const h = cv.clientHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      const dist = CAM_DIST * Math.max(1, 0.9 / camera.aspect)
      camera.position.copy(TARGET).addScaledVector(CAM_DIR, dist)
      camera.lookAt(TARGET)
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(cv)

    let loaded = false
    let introStart = -1

    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    loader.load(MODEL_URL, (gltf) => {
      const model = gltf.scene
      model.updateMatrixWorld(true)

      // Long axis to X, then scale so the car is CAR_LENGTH long.
      const s0 = boundsOf(model, /./)!.getSize(new THREE.Vector3())
      if (s0.z > s0.x) model.rotation.y = Math.PI / 2
      model.updateMatrixWorld(true)
      const s1 = boundsOf(model, /./)!.getSize(new THREE.Vector3())
      model.scale.setScalar(CAR_LENGTH / Math.max(s1.x, s1.z))
      model.updateMatrixWorld(true)

      // Centre on the body and stand the tyres on the road.
      const c = boundsOf(model, /./)!.getCenter(new THREE.Vector3())
      const tyres = boundsOf(model, TYRE_RE)!
      model.position.set(-c.x, -tyres.min.y, -c.z)
      model.updateMatrixWorld(true)

      // Shadows, and which end is the nose (the headlights sit at the front).
      let noseSum = 0
      model.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh) return
        mesh.castShadow = true
        mesh.receiveShadow = true
        if (/headlight/i.test(chainName(mesh))) noseSum += boundsOf(mesh, /./)!.getCenter(new THREE.Vector3()).x
      })
      if (noseSum < 0) model.rotation.y += Math.PI
      model.updateMatrixWorld(true)
      rig.add(model)

      // Contact shadow: a soft dark pool under the tyres, so the car sits on the road.
      const sc = document.createElement('canvas')
      sc.width = 256
      sc.height = 128
      const g = sc.getContext('2d')!
      const grad = g.createRadialGradient(128, 64, 0, 128, 64, 128)
      grad.addColorStop(0, 'rgba(0,0,0,0.85)')
      grad.addColorStop(0.6, 'rgba(0,0,0,0.45)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = grad
      g.fillRect(0, 0, 256, 128)
      const contactTex = new THREE.CanvasTexture(sc)
      const contact = new THREE.Mesh(
        new THREE.PlaneGeometry(CAR_LENGTH * 1.25, CAR_LENGTH * 0.5),
        new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false }),
      )
      contact.rotation.x = -Math.PI / 2
      contact.position.y = 0.004
      rig.add(contact)
      rig.updateMatrixWorld(true)

      // Each wheel gets a pivot on its own hub, so the whole wheel turns about its axle.
      for (const w of WHEELS) {
        const tyre = boundsOf(model, TYRE_RE, w)
        if (!tyre) continue
        const hub = tyre.getCenter(new THREE.Vector3())
        const pivot = new THREE.Group()
        pivot.position.copy(hub)
        rig.add(pivot)
        pivot.updateMatrixWorld(true)
        const parts: THREE.Object3D[] = []
        const wheelRe = wheelPart(w)
        model.traverse((o) => { if ((o as THREE.Mesh).isMesh && wheelRe.test(chainName(o))) parts.push(o) })
        parts.forEach((o) => pivot.attach(o))
        wheelPivots.push({ pivot, rear: w.startsWith('R') })
      }

      loaded = true
      setReady(true)
    })

    let raf = 0
    let last = performance.now()
    let lastX = START_X
    let lastZ = START_Z
    const tmp = new THREE.Vector3()
    // Direction the car last travelled along its path. Smoke trails opposite to it, even after the car has stopped.
    const travel = new THREE.Vector3(-1, 0, 0)
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (!loaded) return
      // Run only while the section is on screen; the intro starts the first time it is.
      const r = cv.getBoundingClientRect()
      const onScreen = r.bottom > 0 && r.top < window.innerHeight
      if (!onScreen) return
      if (introStart < 0) introStart = now

      // Path: roll in from the right, sliding and settling into the print's pose.
      const k = clamp01((now - introStart) / 1000 / INTRO)
      const x = lerp(START_X, 0, easeOutCubic(k))
      const z = lerp(START_Z, 0, easeOutCubic(k))
      const yaw = lerp(YAW_START, YAW_END, easeOutQuad(k))
      rig.position.set(x, 0, z)
      rig.rotation.y = yaw
      rig.updateMatrixWorld(true)
      const vx = dt > 0 ? (x - lastX) / dt : 0
      const vz = dt > 0 ? (z - lastZ) / dt : 0
      lastX = x
      lastZ = z
      const moving = Math.hypot(vx, vz) > 0.05
      if (moving) travel.lerp(tmp.set(vx, 0, vz).normalize(), Math.min(1, dt * 6)).normalize()

      // Wheels: spinning hard while sliding, then burning in place after the car settles.
      const omega = 14 + 26 * (1 - k)
      wheelPivots.forEach(({ pivot }) => { pivot.rotation.z -= dt * omega })

      // Smoke: heavy while drifting in, a steady plume from the rear tyres once settled.
      const rate = moving ? 90 : 40
      emitAcc += rate * dt
      const rears = wheelPivots.filter((w) => w.rear)
      while (emitAcc >= 1 && rears.length) {
        emitAcc -= 1
        const s = smoke.find((p) => !p.alive)
        if (!s) break
        const src = rears[Math.floor(Math.random() * rears.length)].pivot
        src.getWorldPosition(tmp)
        s.sprite.position.set(
          tmp.x + (Math.random() - 0.5) * 0.5,
          tmp.y + 0.1 + Math.random() * 0.1,
          tmp.z + (Math.random() - 0.5) * 0.4,
        )
        // Smoke streams backwards along the path the car followed, and rises as it goes.
        const back = moving ? 1.2 + Math.random() * 0.8 : 0.6 + Math.random() * 0.6
        s.vel.set(
          -travel.x * back + (Math.random() - 0.5) * 0.3,
          0.5 + Math.random() * 0.4,
          -travel.z * back + (Math.random() - 0.5) * 0.3,
        )
        s.age = 0
        s.life = 1.6 + Math.random() * 1.2
        s.alive = true
        s.sprite.visible = true
      }
      smoke.forEach((s) => {
        if (!s.alive) return
        s.age += dt
        if (s.age >= s.life) {
          s.alive = false
          s.sprite.visible = false
          s.mat.opacity = 0
          return
        }
        const t = s.age / s.life
        s.sprite.position.addScaledVector(s.vel, dt)
        s.vel.multiplyScalar(1 - 0.6 * dt)
        s.sprite.scale.setScalar(0.4 + 2.0 * t)
        s.mat.opacity = 0.55 * Math.pow(1 - t, 1.3)
      })

      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh && !(o as THREE.Sprite).isSprite) return
        m.geometry?.dispose()
        const mats = Array.isArray(m.material) ? m.material : [m.material]
        mats.forEach((mat) => mat?.dispose())
      })
      smokeTex.dispose()
      pmrem.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <section ref={root} className="relative h-screen w-full overflow-hidden bg-[#0b0d12] text-white" aria-label="Civic RS">
      {/* Whole-section background: the blurred street from the print */}
      <img src={streetBg} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b0d12]/70 via-[#0b0d12]/25 to-transparent" />

      <div className="relative flex h-full w-full">
        {/* Left: logo and copy */}
        <div className="flex w-[44%] flex-col justify-center pl-[6vw] pr-[3vw]">
          <img src={rsLogo} alt="RS" draggable={false} className="w-[min(30vw,420px)] select-none" />
          <h2 className="mt-[3vh] text-[clamp(22px,2.6vw,44px)] font-bold tracking-[0.02em]">1.5 VTEC TURBO</h2>
          <p className="mt-[2vh] max-w-[30vw] text-[clamp(11px,0.95vw,16px)] leading-relaxed tracking-[0.02em] text-white/85">
            A 1.5-liter VTEC TURBO 176 HP engine with Programmed Fuel Injection technology and a Turbocharger that provides enhanced acceleration and excellent fuel economy.
          </p>
        </div>

        {/* Right: the Civic RS */}
        <div className="relative flex-1">
          <canvas
            ref={canvas}
            className="absolute inset-0 h-full w-full transition-opacity duration-700"
            style={{ opacity: ready ? 1 : 0 }}
          />
        </div>
      </div>

      <p className="absolute bottom-[6vh] right-[4vw] text-[clamp(18px,2.2vw,38px)] font-bold italic tracking-[0.02em] text-white">
        ABSOLUTE THRILL
      </p>
    </section>
  )
}
