import { useEffect } from 'react'
import Hero from './hero/Hero'
import Sensing from './sensing/Sensing'
import { startSmoothScroll } from './lib/smooth'

export default function App() {
  useEffect(() => startSmoothScroll(), [])
  return (
    <>
      <Hero />
      <Sensing />
    </>
  )
}
