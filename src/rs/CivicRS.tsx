import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import rsLogo from './assets/rs-logo.png'
import streetBg from './assets/street-bg.jpg'

const MODEL_URL = '/models/honda_civic_rs.glb'
const CAR_LENGTH = 4.6
const TYRE_RE = /tire|tyre/i
const TARGET = new THREE.Vector3(0, 0.62, 0)
// Camera: low, front three-quarter, on the car's right side, as in the print.
const CAM_DIR = new THREE.Vector3(0.42, 0.13, 1).normalize()
const CAM_DIST = 12.6
// Nose points left and slightly toward the camera, as in the print.
const CAR_YAW = Math.PI + 0.64

// Name of a node plus all its ancestors, so a mesh can be matched by the node names above it.
function chainName(o: THREE.Object3D) {
  let s = ''
  let c: THREE.Object3D | null = o
  while (c) { s += ' ' + (c.name || ''); c = c.parent }
  return s
}

function boundsOf(root: THREE.Object3D, re: RegExp) {
  const box = new THREE.Box3()
  let any = false
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh || !re.test(chainName(m))) return
    box.expandByObject(m)
    any = true
  })
  return any ? box : null
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

    // The photo road shows through; this plane only catches the car's shadow.
    const shadowPlane = new THREE.Mesh(new THREE.CircleGeometry(12, 64), new THREE.ShadowMaterial({ opacity: 0.6 }))
    shadowPlane.rotation.x = -Math.PI / 2
    shadowPlane.position.y = 0.002
    shadowPlane.receiveShadow = true
    scene.add(shadowPlane)

    const rig = new THREE.Group()
    rig.rotation.y = CAR_YAW
    scene.add(rig)

    const resize = () => {
      const w = cv.clientWidth
      const h = cv.clientHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      // Narrow panels move the camera back so the whole car stays in frame.
      const dist = CAM_DIST * Math.max(1, 1.1 / camera.aspect)
      camera.position.copy(TARGET).addScaledVector(CAM_DIR, dist)
      camera.lookAt(TARGET)
      camera.updateProjectionMatrix()
      renderer.render(scene, camera)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(cv)

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

      setReady(true)
      resize()
    })

    return () => {
      ro.disconnect()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        m.geometry?.dispose()
        const mats = Array.isArray(m.material) ? m.material : [m.material]
        mats.forEach((mat) => mat?.dispose())
      })
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
