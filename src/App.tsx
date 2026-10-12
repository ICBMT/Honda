import { useEffect, useState } from 'react'
import Hero from './hero/Hero'
import PhoneHero from './hero/PhoneHero'
import Sensing from './sensing/Sensing'
import SensingMobile from './sensing/SensingMobile'
import { startSmoothScroll } from './lib/smooth'

const PHONE_QUERY = '(max-width: 767px)'

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
    </>
  )
}
