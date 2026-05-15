'use client'
import { useRef, useState, useEffect } from 'react'
import styles from './VideoPlayer.module.scss'

type Props = { src: string }

function formatDuration(time: number) {
  const s = Math.floor(time % 60)
  const m = Math.floor(time / 60) % 60
  const h = Math.floor(time / 3600)
  if (h === 0) return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function VideoPlayer({ src }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const volumeSliderRef = useRef<HTMLInputElement>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [volumeLevel, setVolumeLevel] = useState('high')
  const [totalTime, setTotalTime] = useState('00:00')
  const [currentTime, setCurrentTime] = useState('00:00')
  const wasPaused = useRef<boolean | null>(null)

  const setProgressVar = (percent: number) => {
    timelineRef.current?.style.setProperty('--progress-position', String(percent))
  }
  const setPreviewVar = (percent: number) => {
    timelineRef.current?.style.setProperty('--preview-position', String(percent))
  }

  useEffect(() => {
    setIsPlaying(true)
    const handleMouseUp = (e: MouseEvent) => { if (isScrubbing) toggleScrubbing(e) }
    const handleMouseMove = (e: MouseEvent) => { if (isScrubbing) handleTimelineUpdate(e) }
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mousemove', handleMouseMove)
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mousemove', handleMouseMove)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScrubbing])

  const togglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) { setIsPlaying(true); videoRef.current.play() }
    else { setIsPlaying(false); videoRef.current.pause() }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !videoRef.current.muted
  }

  const onVolumeChange = () => {
    const v = videoRef.current
    const s = volumeSliderRef.current
    if (!v || !s) return
    s.value = String(v.volume)
    if (v.muted || v.volume === 0) { s.value = '0'; setVolumeLevel('muted') }
    else if (v.volume >= 0.5) setVolumeLevel('high')
    else setVolumeLevel('low')
  }

  const onVolumeSlide = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return
    videoRef.current.volume = parseFloat(e.target.value)
    videoRef.current.muted = e.target.value === '0'
  }

  const onLoadedData = () => {
    if (videoRef.current?.duration) setTotalTime(formatDuration(videoRef.current.duration))
  }

  const onTimeUpdate = () => {
    if (!videoRef.current) return
    setCurrentTime(formatDuration(videoRef.current.currentTime))
    setProgressVar(videoRef.current.currentTime / videoRef.current.duration)
  }

  const handleTimelineUpdate = (e: MouseEvent | React.MouseEvent) => {
    if (!timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const percent = Math.min(Math.max(0, (e as MouseEvent).clientX - rect.x), rect.width) / rect.width
    setPreviewVar(percent)
    if (isScrubbing) {
      e.preventDefault()
      setProgressVar(percent)
    }
  }

  const toggleScrubbing = (e: MouseEvent | React.MouseEvent) => {
    if (!timelineRef.current || !videoRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const percent = Math.min(Math.max(0, (e as MouseEvent).clientX - rect.x), rect.width) / rect.width
    const scrubbing = ((e as MouseEvent).buttons & 1) === 1
    setIsScrubbing(scrubbing)
    if (scrubbing) {
      wasPaused.current = videoRef.current.paused
      setIsPlaying(false)
      videoRef.current.pause()
    } else {
      videoRef.current.currentTime = percent * videoRef.current.duration
      if (!wasPaused.current) { setIsPlaying(true); videoRef.current.play() }
    }
    handleTimelineUpdate(e)
  }

  return (
    <div className={styles.videoMedia}>
      <div
        ref={containerRef}
        className={[
          styles.videoContainer,
          isPlaying ? styles.paused : '',
          isScrubbing ? styles.scrubbing : '',
        ].filter(Boolean).join(' ')}
        data-volume-level={volumeLevel}
      >
        <div className={styles.videoPlayArea} onClick={togglePlay}>
          <div className={styles.playPause}>
            <svg className={styles.playIcon} viewBox="0 0 46 53" fill="none">
              <path d="M0 48.9259V4.96462C0 1.87735 3.34906-0.0461172 6.01569 1.50962L43.161 23.1807C45.7879 24.7132 45.8113 28.5006 43.2035 30.0655L6.05819 52.3557C3.39209 53.9556 0 52.0351 0 48.9259Z" fill="white" />
            </svg>
            <svg className={styles.pauseIcon} viewBox="0 0 24 24" fill="none">
              <path d="M8 5V19M16 5V19" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <div className={styles.videoControls}>
          <div className={`${styles.duration} p1`}>
            <span>{currentTime}</span>/<span>{totalTime}</span>
          </div>
          <div className={styles.volume}>
            <div className={styles.muteBtn} onClick={toggleMute}>
              <svg className={styles.volHigh} viewBox="0 0 24 24" fill="none">
                <path d="M19.7479 4.99999C21.1652 6.97023 22 9.38762 22 12C22 14.6124 21.1652 17.0298 19.7479 19M9.63432 4.36567L6.46863 7.53136C6.29568 7.70431 6.2092 7.79079 6.10828 7.85263C6.01881 7.90746 5.92127 7.94786 5.81923 7.97236C5.70414 7.99999 5.58185 7.99999 5.33726 7.99999H3.6C3.03995 7.99999 2.75992 7.99999 2.54601 8.10898C2.35785 8.20485 2.20487 8.35784 2.10899 8.546C2 8.75991 2 9.03994 2 9.59999V14.4C2 14.96 2 15.2401 2.10899 15.454C2.20487 15.6421 2.35785 15.7951 2.54601 15.891C2.75992 16 3.03995 16 3.6 16H5.33726C5.58185 16 5.70414 16 5.81923 16.0276C5.92127 16.0521 6.01881 16.0925 6.10828 16.1473C6.2092 16.2092 6.29568 16.2957 6.46863 16.4686L9.63431 19.6343C10.0627 20.0627 10.2769 20.2769 10.4608 20.2913C10.6203 20.3039 10.7763 20.2393 10.8802 20.1176C11 19.9773 11 19.6744 11 19.0686V4.93136C11 4.32554 11 4.02264 10.8802 3.88237C10.7763 3.76067 10.6203 3.69608 10.4608 3.70864C10.2769 3.72311 10.0627 3.9373 9.63432 4.36567Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <svg className={styles.volLow} viewBox="0 0 24 24" fill="none">
                <path d="M15.5355 8.46447C16.4732 9.40214 17 10.6739 17 12C17 13.3261 16.4732 14.5979 15.5355 15.5355M9.63432 4.36567L6.46863 7.53136C6.29568 7.70431 6.2092 7.79079 6.10828 7.85263C6.01881 7.90746 5.92127 7.94786 5.81923 7.97236C5.70414 7.99999 5.58185 7.99999 5.33726 7.99999H3.6C3.03995 7.99999 2.75992 7.99999 2.54601 8.10898C2.35785 8.20485 2.20487 8.35784 2.10899 8.546C2 8.75991 2 9.03994 2 9.59999V14.4C2 14.96 2 15.2401 2.10899 15.454C2.20487 15.6421 2.35785 15.7951 2.54601 15.891C2.75992 16 3.03995 16 3.6 16H5.33726C5.58185 16 5.70414 16 5.81923 16.0276C5.92127 16.0521 6.01881 16.0925 6.10828 16.1473C6.2092 16.2092 6.29568 16.2957 6.46863 16.4686L9.63431 19.6343C10.0627 20.0627 10.2769 20.2769 10.4608 20.2913C10.6203 20.3039 10.7763 20.2393 10.8802 20.1176C11 19.9773 11 19.6744 11 19.0686V4.93136C11 4.32554 11 4.02264 10.8802 3.88237C10.7763 3.76067 10.6203 3.69608 10.4608 3.70864C10.2769 3.72311 10.0627 3.9373 9.63432 4.36567Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <svg className={styles.volMuted} viewBox="0 0 24 24" fill="none">
                <path d="M22 9L16 15M16 9L22 15M9.63432 4.36567L6.46863 7.53136C6.29568 7.70431 6.2092 7.79079 6.10828 7.85263C6.01881 7.90746 5.92127 7.94786 5.81923 7.97236C5.70414 7.99999 5.58185 7.99999 5.33726 7.99999H3.6C3.03995 7.99999 2.75992 7.99999 2.54601 8.10898C2.35785 8.20485 2.20487 8.35784 2.10899 8.546C2 8.75991 2 9.03994 2 9.59999V14.4C2 14.96 2 15.2401 2.10899 15.454C2.20487 15.6421 2.35785 15.7951 2.54601 15.891C2.75992 16 3.03995 16 3.6 16H5.33726C5.58185 16 5.70414 16 5.81923 16.0276C5.92127 16.0521 6.01881 16.0925 6.10828 16.1473C6.2092 16.2092 6.29568 16.2957 6.46863 16.4686L9.63431 19.6343C10.0627 20.0627 10.2769 20.2769 10.4608 20.2913C10.6203 20.3039 10.7763 20.2393 10.8802 20.1176C11 19.9773 11 19.6744 11 19.0686V4.93136C11 4.32554 11 4.02264 10.8802 3.88237C10.7763 3.76067 10.6203 3.69608 10.4608 3.70864C10.2769 3.72311 10.0627 3.9373 9.63432 4.36567Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className={styles.volSliderWrap}>
              <input
                ref={volumeSliderRef}
                className={styles.volSlider}
                type="range"
                min="0"
                max="1"
                step="any"
                defaultValue="1"
                onChange={onVolumeSlide}
              />
            </div>
          </div>
          <div
            ref={timelineRef}
            className={styles.timeline}
            onMouseMove={e => handleTimelineUpdate(e as unknown as MouseEvent)}
            onMouseDown={e => toggleScrubbing(e as unknown as MouseEvent)}
          >
            <div className={styles.timelineEl}>
              <div className={styles.thumb} />
            </div>
          </div>
        </div>
        <video
          ref={videoRef}
          className={styles.video}
          src={src}
          preload="auto"
          playsInline
          autoPlay
          loop
          onVolumeChange={onVolumeChange}
          onLoadedMetadata={onLoadedData}
          onTimeUpdate={onTimeUpdate}
        />
      </div>
    </div>
  )
}
