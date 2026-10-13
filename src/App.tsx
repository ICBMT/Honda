import { useEffect, useState } from 'react'
import Hero from './hero/Hero'
import PhoneHero from './hero/PhoneHero'
import Sensing from './sensing/Sensing'
import SensingMobile from './sensing/SensingMobile'
import TypeR from './typer/TypeR'
import LazyMount from './lib/LazyMount'
import Keyless from './keyless/Keyless'
import CivicRS from './rs/CivicRS'
import { startSmoothScroll } from './lib/smooth'

const PHONE_QUERY = '(max-width: 767px), (orientation: portrait) and (max-width: 1100px)'

// Phones get the portrait hero and the swipe carousel; larger screens keep the desktop layouts.
function useIsPhone() {
  const [phone, setPhone] = useState(() => window.matchMedia(PHONE_QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY)
    const onChange = () => setPhone(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return phone
}

export default function App() {
  const phone = useIsPhone()
  useEffect(() => {
    if (phone) return
    return startSmoothScroll()
  }, [phone])
  return (
    <>
      {phone ? <PhoneHero /> : <Hero />}
      {phone ? <SensingMobile /> : <Sensing />}
      <LazyMount placeholderClass="h-[560vh] w-full bg-[#05070d]">
        <TypeR />
      </LazyMount>
      <Keyless />
      <LazyMount placeholderClass="h-screen w-full bg-[#0b0d12]">
        <CivicRS />
      </LazyMount>
    </>
  )
}
