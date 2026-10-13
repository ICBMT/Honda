import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import gsap from 'gsap'
import rsLogo from './assets/rs-logo.png'
import streetLeft from './assets/street-left.jpg'

gsap.registerPlugin(ScrollTrigger)

const MODEL_URL = '/models/honda_civic_rs.glb'
const CAR_LENGTH = 4.6
const TYRE_RE = /tire|tyre/i
const WHEELS = ['FL', 'FR', 'RL', 'RR']
const LOOP_A = 2.3 // figure-eight width (x)
const LOOP_B = 1.5 // figure-eight depth (z)

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
  const wheelRe = wheel ? new RegExp('(^|\\s)' + wheel + '_WHEEL') : null
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const n = chainName(m)
    if (!re.test(n)) return
    if (wheelRe && !wheelRe.test(n)) return
    box.expandByObject(m)
    any = true
  })
  return any ? box : null
}

// Position along the drift path for a progress value 0..1.
// 0..0.4: the car rolls in from the right, sliding left.
// 0.4..1: it drives one full figure-eight loop and comes back to the centre.
function pathAt(p: number) {
  if (p <= 0.4) {
    const u = p / 0.4
    return { x: 7 * (1 - u), z: 0, th: 0 }
  }
  const th = Math.PI + ((p - 0.4) / 0.6) * Math.PI * 2
  return { x: LOOP_A * Math.sin(th), z: (LOOP_B * Math.sin(2 * th)) / 2, th }
}

export default function CivicRS() {
  const root = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = root.current!
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

    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 200)
    camera.position.set(4.6, 2.5, 10.2)
    camera.lookAt(0, 0.6, 0)

    const key = new THREE.DirectionalLight('#ffffff', 2.2)
    key.position.set(4, 6, 5)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.left = -5
    key.shadow.camera.right = 5
    key.shadow.camera.top = 5
    key.shadow.camera.bottom = -5
    key.shadow.bias = -0.0005
    scene.add(key)
    const rim = new THREE.DirectionalLight('#ff3340', 3.0)
    rim.position.set(-6, 3, -5)
    scene.add(rim)
    const fill = new THREE.DirectionalLight('#5aa8ff', 0.8)
    fill.position.set(-4, 2, 6)
    scene.add(fill)

    // Road: dark asphalt with red edge lines and lane dashes, scrolling while the car moves.
    const roadCv = document.createElement('canvas')
    roadCv.width = roadCv.height = 512
    const rctx = roadCv.getContext('2d')!
    rctx.fillStyle = '#0b0b0f'
    rctx.fillRect(0, 0, 512, 512)
    for (let i = 0; i < 2200; i++) {
      rctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.035})`
      rctx.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 2, 1 + Math.random() * 2)
    }
    rctx.shadowColor = '#ff1030'
    rctx.shadowBlur = 16
    rctx.fillStyle = '#ff2b45'
    rctx.fillRect(0, 10, 512, 6)
    rctx.fillRect(0, 496, 512, 6)
    rctx.shadowBlur = 0
    rctx.fillStyle = 'rgba(235,235,240,0.85)'
    for (let x = 0; x < 512; x += 256) rctx.fillRect(x, 252, 128, 8)
    const roadTex = new THREE.CanvasTexture(roadCv)
    roadTex.colorSpace = THREE.SRGBColorSpace
    roadTex.wrapS = THREE.RepeatWrapping
    roadTex.wrapT = THREE.RepeatWrapping
    roadTex.repeat.set(24, 1)
    roadTex.anisotropy = 8
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 40),
      new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.85, metalness: 0, envMapIntensity: 0.25 }),
    )
    road.rotation.x = -Math.PI / 2
    road.receiveShadow = true
    scene.add(road)

    // Shadow catcher just above the road.
    const shadowPlane = new THREE.Mesh(new THREE.CircleGeometry(12, 64), new THREE.ShadowMaterial({ opacity: 0.6 }))
    shadowPlane.rotation.x = -Math.PI / 2
    shadowPlane.position.y = 0.002
    shadowPlane.receiveShadow = true
    scene.add(shadowPlane)

    // The car rig: the model and its pivoting wheels live here and follow the drift path.
    const rig = new THREE.Group()
    scene.add(rig)
    const wheelPivots: { pivot: THREE.Group; r: number }[] = []

    const resize = () => {
      const w = cv.clientWidth
      const h = cv.clientHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      // Narrow panels pull the camera back so the loop stays in frame.
      const back = camera.aspect < 1 ? 1.7 : camera.aspect < 1.3 ? 1.25 : 1
      camera.position.set(4.6 * back, 2.5 * back, 10.2 * back)
      camera.lookAt(0, 0.6, 0)
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(cv)

    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    let loaded = false
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
      rig.updateMatrixWorld(true)

      // Each wheel gets a pivot on its own hub, so the whole wheel turns about its axle.
      for (const w of WHEELS) {
        const tyre = boundsOf(model, TYRE_RE, w)
        if (!tyre) continue
        const hub = tyre.getCenter(new THREE.Vector3())
        const r = (tyre.max.y - tyre.min.y) / 2
        const pivot = new THREE.Group()
        pivot.position.copy(hub)
        rig.add(pivot)
        pivot.updateMatrixWorld(true)
        const parts: THREE.Object3D[] = []
        const wheelRe = new RegExp('(^|\\s)' + w + '_WHEEL')
        model.traverse((o) => { if ((o as THREE.Mesh).isMesh && wheelRe.test(chainName(o))) parts.push(o) })
        parts.forEach((o) => pivot.attach(o))
        wheelPivots.push({ pivot, r })
      }

      loaded = true
      setReady(true)
    })

    // Scroll drives the path; the scrub gives the drift its weight.
    const state = { p: 0 }
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6,
      onUpdate: (self) => { state.p = self.progress },
    })

    let visible = true
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting }, { threshold: 0 })
    io.observe(el)

    let last = performance.now()
    let raf = 0
    let roadOffset = 0
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (!visible || !loaded) return

      const p = state.p
      const pos = pathAt(p)
      const next = pathAt(Math.min(p + 0.002, 1))
      // Heading follows the path; the drift adds a steady slide so the nose sits out of line with travel.
      const dx = next.x - pos.x
      const dz = next.z - pos.z
      const travel = Math.atan2(-dz, dx)
      const inLoop = p > 0.4
      const slip = inLoop ? 0.22 + 0.08 * Math.sin(pos.th * 2) : 0.3
      rig.position.set(pos.x, 0, pos.z)
      rig.rotation.y = travel + slip

      // Wheels turn with the drive; the road scrolls under the car.
      const speed = 8
      wheelPivots.forEach(({ pivot, r }) => { pivot.rotation.z -= (dt * speed) / Math.max(r, 0.2) })
      roadOffset += dt * speed * 0.35
      roadTex.offset.x = roadOffset / 24

      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      trigger.kill()
      io.disconnect()
      ro.disconnect()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        m.geometry?.dispose()
        const mats = Array.isArray(m.material) ? m.material : [m.material]
        mats.forEach((mat) => mat?.dispose())
      })
      roadTex.dispose()
      pmrem.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <section ref={root} className="relative h-[380vh] w-full bg-[#0b0d12] text-white" aria-label="Civic RS">
      <div className="sticky top-0 flex h-screen w-full overflow-hidden">
        {/* Left: text over the blurred street from the print */}
        <div className="relative flex w-[46%] flex-col justify-center pl-[6vw] pr-[3vw]">
          <img src={streetLeft} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0d12]/40 via-[#0b0d12]/55 to-[#0b0d12]/80" />
          <div className="relative">
            <img src={rsLogo} alt="RS" draggable={false} className="w-[min(30vw,420px)] select-none" />
            <h2 className="mt-[3vh] text-[clamp(22px,2.6vw,44px)] font-bold tracking-[0.02em]">1.5 VTEC TURBO</h2>
            <p className="mt-[2vh] max-w-[30vw] text-[clamp(11px,0.95vw,16px)] leading-relaxed tracking-[0.02em] text-white/85">
              A 1.5-liter VTEC TURBO 176 HP engine with Programmed Fuel Injection technology and a Turbocharger that provides enhanced acceleration and excellent fuel economy.
            </p>
          </div>
        </div>

        {/* Right: the car rolls in from the right, drifts and loops */}
        <div className="relative flex-1 bg-[radial-gradient(ellipse_at_60%_20%,#4a4f5a_0%,#22252d_45%,#0b0c10_100%)]">
          <canvas
            ref={canvas}
            className="absolute inset-0 h-full w-full transition-opacity duration-700"
            style={{ opacity: ready ? 1 : 0 }}
          />
          <p className="absolute bottom-[6vh] right-[4vw] text-[clamp(18px,2.2vw,38px)] font-bold italic tracking-[0.02em] text-white">
            ABSOLUTE THRILL
          </p>
        </div>
      </div>
    </section>
  )
}
