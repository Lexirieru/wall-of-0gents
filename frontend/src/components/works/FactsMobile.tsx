'use client'
import { useEffect } from 'react'
import Swiper from 'swiper'
import { Navigation, Pagination } from 'swiper/modules'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import Logo from '@/components/icon/Logo'
import Polygon from '@/components/icon/Polygon'
import styles from './FactsMobile.module.scss'

const factsData = [
  { number: '150+', text: 'Projects delivered with love and precision.' },
  { number: '5', text: 'Years building brands that people remember.' },
  { number: '30+', text: 'Countries where our work lives.' },
  { number: '98%', text: 'Client satisfaction rate.' },
]

export default function WorksFactsMobile() {
  useEffect(() => {
    new Swiper('.facts-swiper', {
      modules: [Navigation, Pagination],
      loop: true,
      pagination: {
        el: '.facts-swiper .default-pagination',
        type: 'fraction',
      },
      navigation: {
        nextEl: '.facts-swiper .default-button-next',
        prevEl: '.facts-swiper .default-button-prev',
      },
    })
  }, [])

  return (
    <section className={styles.factsMob}>
      <div className={styles.logo}>
        <Logo />
      </div>
      <div className={`facts-swiper swiper ${styles.factsSwiper}`}>
        <div className="swiper-wrapper">
          {factsData.map((item, i) => (
            <div key={i} className="swiper-slide">
              <p className={`${styles.number} h1`}>{item.number}</p>
              <p className={`${styles.info} p1`}>{item.text}</p>
            </div>
          ))}
        </div>
        <div className="default-nav-wrap _grey">
          <div className="default-button-prev">
            <Polygon />
          </div>
          <div className="default-pagination b3" />
          <div className="default-button-next">
            <Polygon />
          </div>
        </div>
      </div>
    </section>
  )
}
