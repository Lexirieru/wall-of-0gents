'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import styles from './Cube.module.scss'

export default function Cube() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const canvas = canvasRef.current
    if (!canvas) return

    gsap.registerPlugin(ScrollTrigger)

    const isMobile = window.innerWidth < 1024
    const size = isMobile ? window.innerWidth : Math.round(window.innerWidth / 2.5)
    canvas.width = size
    canvas.height = size

    let THREE: typeof import('three')
    let TrackballControls: typeof import('three/examples/jsm/controls/TrackballControls.js')['TrackballControls']
    let animationId: number
    let controls: InstanceType<typeof TrackballControls>
    let renderer: import('three').WebGLRenderer
    let isDragging = false
    let isRunning = true

    const playAnimation = () => { isRunning = true }
    const stopAnimation = () => { isRunning = false }

    const onMouseDown = () => {
      isDragging = true
      canvas.classList.add('_drag')
    }
    const onMouseUp = () => {
      isDragging = false
      canvas.classList.remove('_drag')
    }

    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)

    Promise.all([
      import('three'),
      import('three/examples/jsm/controls/TrackballControls.js'),
    ]).then(([threeModule, controlsModule]) => {
      THREE = threeModule
      TrackballControls = controlsModule.TrackballControls

      // Scene
      const scene = new THREE.Scene()

      // Camera
      const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
      camera.position.z = 3

      // Renderer
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
      renderer.setSize(size, size)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

      // Materials & geometry
      const materials = [
        new THREE.MeshBasicMaterial({ color: 0xff001b }),
        new THREE.MeshBasicMaterial({ color: 0x010101 }),
        new THREE.MeshBasicMaterial({ color: 0xffffff }),
        new THREE.MeshBasicMaterial({ color: 0xefe81b }),
        new THREE.MeshBasicMaterial({ color: 0x1f6c6e }),
        new THREE.MeshBasicMaterial({ color: 0xff001b }),
      ]
      const geometry = new THREE.BoxGeometry(2, 2, 2)
      const cube = new THREE.Mesh(geometry, materials)
      scene.add(cube)

      // Controls
      controls = new TrackballControls(camera, canvas)
      controls.rotateSpeed = 1.0
      controls.noZoom = true
      controls.noPan = true
      controls.staticMoving = false
      controls.dynamicDampingFactor = 0.1

      const autoRotateSpeed = 0.003

      const animate = () => {
        animationId = requestAnimationFrame(animate)
        if (!isRunning) return
        if (!isDragging) {
          cube.rotation.y += autoRotateSpeed
          cube.rotation.x += autoRotateSpeed
        }
        controls.update()
        renderer.render(scene, camera)
      }
      animate()

      ScrollTrigger.create({
        trigger: canvas,
        start: 'top bottom',
        end: 'bottom top',
        onEnter: playAnimation,
        onLeave: stopAnimation,
        onEnterBack: playAnimation,
        onLeaveBack: stopAnimation,
      })
    })

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      if (animationId) cancelAnimationFrame(animationId)
      if (controls) controls.dispose()
      if (renderer) renderer.dispose()
      ScrollTrigger.getAll().forEach(st => st.kill())
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      data-area-for-tip="hold & turn"
    />
  )
}
