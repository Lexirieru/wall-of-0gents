import styles from './Thanks.module.scss'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { contactData } from '@/data/strings'

const soc = ['/images/soc-ig.svg', '/images/soc-yt.svg', '/images/soc-li.svg']

export default function ContactThanks() {
  return (
    <div className={styles.thanks}>
      <p className="b2">Sent successfully!</p>
      <h3 className="h3">Thank you for reaching out.</h3>
      <p className={`${styles.description} b2`}>We&apos;ll be in touch soon.</p>
      <div className={styles.socials}>
        {soc.map((s, i) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <a key={i} href="#" target="_blank" rel="noreferrer">
            <img src={s} alt="social icon" />
          </a>
        ))}
      </div>
      <div className={styles.siteName}>
        <svg viewBox="0 0 1421 156" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g filter="url(#filter0_iif_174_9577)">
            <path d="M4.33887 47.4283C4.33887 16.272 62.998 1.32812 184.239 1.32812C307.036 1.32812 377.039 18.1679 377.039 53.7433H260.89C260.89 42.1624 234.298 35.6384 184.625 35.6384C145.517 35.6384 119.318 39.4266 119.318 45.9506C119.318 53.7433 140.042 56.6881 204.176 59.6365C322.281 64.9025 381.731 79.6337 381.731 109.525C381.731 140.681 321.898 155.834 199.094 155.834C73.172 155.834 2 138.998 2 103.423H117.755C117.755 115.213 145.517 121.524 196.362 121.524C239.379 121.524 266.751 117.314 266.751 110.372C266.751 102.37 246.421 99.6343 182.669 96.686C62.6153 91.4235 4.33887 77.3196 4.33887 47.4283Z" fill="#F9F9F9" fillOpacity="0.01" />
            <path d="M599.851 94.5866C543.662 94.5866 510.043 99.5691 510.043 108.705C510.043 115.899 530.614 118.943 572.26 118.943C635.476 118.943 667.589 112.025 667.589 99.5691V90.717C650.03 93.2047 627.953 94.5866 599.851 94.5866ZM667.589 56.1231C667.589 47.2674 644.006 43.1178 596.346 43.1178C541.653 43.1178 512.552 48.653 512.552 59.7201H391.151C391.151 20.4238 453.35 1.33029 592.835 1.33029C733.825 1.33029 793.508 20.9801 793.508 56.1231V152.257H667.589V137.207C637.489 148.554 589.319 154.642 522.084 154.642C421.237 154.642 381.622 140.527 381.622 112.578C381.622 81.3084 431.773 66.641 557.709 66.641C625.951 66.641 667.589 63.3204 667.589 58.6144V56.1231Z" fill="#F9F9F9" fillOpacity="0.01" />
            <path d="M1182.82 53.5349L1092.87 137.521H1008.79L919.23 53.5349V152.259H809.733V4.9045H965.766L1051.03 85.5275L1135.89 4.9045H1291.93V152.259H1182.82V53.5349Z" fill="#F9F9F9" fillOpacity="0.01" />
            <path d="M1419.49 4.90515H1307.25V152.26H1419.49V4.90515Z" fill="#F9F9F9" fillOpacity="0.01" />
          </g>
          <defs>
            <filter id="filter0_iif_174_9577" x="-0.174916" y="-3.02171" width="1427.27" height="167.884" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
              <feOffset dx="-2.17492" dy="-4.34983" />
              <feGaussianBlur stdDeviation="2.99051" />
              <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.09 0" />
              <feBlend mode="normal" in2="shape" result="effect1_innerShadow_174_9577" />
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
              <feOffset dx="7.6122" dy="13.0495" />
              <feGaussianBlur stdDeviation="4.51295" />
              <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
              <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0" />
              <feBlend mode="normal" in2="effect1_innerShadow_174_9577" result="effect2_innerShadow_174_9577" />
              <feGaussianBlur stdDeviation="0.543729" result="effect3_foregroundBlur_174_9577" />
            </filter>
          </defs>
        </svg>
      </div>
    </div>
  )
}
