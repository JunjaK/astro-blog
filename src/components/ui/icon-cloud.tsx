import React, { useCallback, useEffect, useRef, useState } from "react"
import { renderToString } from "react-dom/server"

import { cn } from "@/lib/utils"

interface Icon {
  x: number
  y: number
  z: number
  scale: number
  opacity: number
  id: number
}

interface IconCloudProps {
  icons?: React.ReactNode[]
  images?: string[]
  maxSize?: number
  className?: string
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function IconCloud({ icons, images, maxSize = 600, className }: IconCloudProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState(0)
  const [iconPositions, setIconPositions] = useState<Icon[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 })
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [targetRotation, setTargetRotation] = useState<{
    x: number
    y: number
    startX: number
    startY: number
    distance: number
    startTime: number
    duration: number
  } | null>(null)
  const animationFrameRef = useRef<number>(0)
  const rotationRef = useRef({ x: 0, y: 0 })
  const iconCanvasesRef = useRef<HTMLCanvasElement[]>([])
  const imagesLoadedRef = useRef<boolean[]>([])
  const dprRef = useRef(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1)

  const ICON_SIZE = 40

  // Responsive sizing via ResizeObserver
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateSize = () => {
      const w = container.clientWidth
      setCanvasSize(Math.min(w, maxSize))
    }
    updateSize()

    const ro = new ResizeObserver(updateSize)
    ro.observe(container)
    return () => ro.disconnect()
  }, [maxSize])

  // Set up DPR-scaled canvas whenever canvasSize changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || canvasSize === 0) return
    const dpr = dprRef.current
    canvas.width = canvasSize * dpr
    canvas.height = canvasSize * dpr
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.scale(dpr, dpr)
    }
  }, [canvasSize])

  // Create icon canvases at DPR-scaled resolution
  useEffect(() => {
    if (!icons && !images) return

    const dpr = dprRef.current
    const items = icons || images || []
    imagesLoadedRef.current = new Array(items.length).fill(false)
    const scaledSize = Math.round(ICON_SIZE * dpr)

    const newIconCanvases = items.map((item, index) => {
      const offscreen = document.createElement("canvas")
      offscreen.width = scaledSize
      offscreen.height = scaledSize
      const offCtx = offscreen.getContext("2d")

      if (offCtx) {
        if (images) {
          const img = new Image()
          img.crossOrigin = "anonymous"
          img.src = items[index] as string
          img.onload = () => {
            offCtx.clearRect(0, 0, scaledSize, scaledSize)
            const half = scaledSize / 2
            offCtx.beginPath()
            offCtx.arc(half, half, half, 0, Math.PI * 2)
            offCtx.closePath()
            offCtx.clip()
            offCtx.drawImage(img, 0, 0, scaledSize, scaledSize)
            imagesLoadedRef.current[index] = true
          }
        } else {
          const svgString = renderToString(item as React.ReactElement)
          const img = new Image()
          img.src = "data:image/svg+xml;base64," + btoa(svgString)
          img.onload = () => {
            offCtx.clearRect(0, 0, scaledSize, scaledSize)
            offCtx.drawImage(img, 0, 0, scaledSize, scaledSize)
            imagesLoadedRef.current[index] = true
          }
        }
      }
      return offscreen
    })

    iconCanvasesRef.current = newIconCanvases
  }, [icons, images])

  // Fibonacci sphere positions — sphere radius scales with canvas size
  useEffect(() => {
    const items = icons || images || []
    const numIcons = items.length || 20
    const offset = 2 / numIcons
    const increment = Math.PI * (3 - Math.sqrt(5))
    const newIcons: Icon[] = []

    for (let i = 0; i < numIcons; i++) {
      const y = i * offset - 1 + offset / 2
      const r = Math.sqrt(1 - y * y)
      const phi = i * increment
      newIcons.push({
        x: Math.cos(phi) * r * 100,
        y: y * 100,
        z: Math.sin(phi) * r * 100,
        scale: 1,
        opacity: 1,
        id: i,
      })
    }
    setIconPositions(newIcons)
  }, [icons, images])

  // Shared pointer logic (mouse + touch)
  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return null
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  const handlePointerDown = useCallback((x: number, y: number, clientX: number, clientY: number) => {
    const size = canvasSize
    const sphereScale = size / 400

    iconPositions.forEach((icon) => {
      const cosX = Math.cos(rotationRef.current.x)
      const sinX = Math.sin(rotationRef.current.x)
      const cosY = Math.cos(rotationRef.current.y)
      const sinY = Math.sin(rotationRef.current.y)

      const rotatedX = icon.x * cosY - icon.z * sinY
      const rotatedZ = icon.x * sinY + icon.z * cosY
      const rotatedY = icon.y * cosX + rotatedZ * sinX

      const screenX = size / 2 + rotatedX * sphereScale
      const screenY = size / 2 + rotatedY * sphereScale
      const scale = (rotatedZ + 200) / 300
      const radius = (ICON_SIZE / 2) * scale
      const dx = x - screenX
      const dy = y - screenY

      if (dx * dx + dy * dy < radius * radius) {
        const tX = -Math.atan2(icon.y, Math.sqrt(icon.x * icon.x + icon.z * icon.z))
        const tY = Math.atan2(icon.x, icon.z)
        const cX = rotationRef.current.x
        const cY = rotationRef.current.y
        const dist = Math.sqrt(Math.pow(tX - cX, 2) + Math.pow(tY - cY, 2))

        setTargetRotation({
          x: tX, y: tY,
          startX: cX, startY: cY,
          distance: dist,
          startTime: performance.now(),
          duration: Math.min(2000, Math.max(800, dist * 1000)),
        })
        return
      }
    })

    setIsDragging(true)
    setLastPos({ x: clientX, y: clientY })
  }, [canvasSize, iconPositions])

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    const pos = getCanvasPos(clientX, clientY)
    if (pos) setMousePos(pos)

    if (isDragging) {
      rotationRef.current = {
        x: rotationRef.current.x + (clientY - lastPos.y) * 0.002,
        y: rotationRef.current.y + (clientX - lastPos.x) * 0.002,
      }
      setLastPos({ x: clientX, y: clientY })
    }
  }, [isDragging, lastPos, getCanvasPos])

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Mouse events
  const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e.clientX, e.clientY)
    if (pos) handlePointerDown(pos.x, pos.y, e.clientX, e.clientY)
  }, [getCanvasPos, handlePointerDown])

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    handlePointerMove(e.clientX, e.clientY)
  }, [handlePointerMove])

  // Touch events
  const onTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0]
    const pos = getCanvasPos(touch.clientX, touch.clientY)
    if (pos) handlePointerDown(pos.x, pos.y, touch.clientX, touch.clientY)
  }, [getCanvasPos, handlePointerDown])

  const onTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0]
    handlePointerMove(touch.clientX, touch.clientY)
  }, [handlePointerMove])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx || canvasSize === 0) return

    const dpr = dprRef.current
    const halfIcon = ICON_SIZE / 2
    const size = canvasSize
    const sphereScale = size / 400

    const animate = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const centerX = size / 2
      const centerY = size / 2
      const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY)
      const dx = mousePos.x - centerX
      const dy = mousePos.y - centerY
      const distance = Math.sqrt(dx * dx + dy * dy)
      const speed = 0.003 + (distance / maxDistance) * 0.01

      if (targetRotation) {
        const elapsed = performance.now() - targetRotation.startTime
        const progress = Math.min(1, elapsed / targetRotation.duration)
        const easedProgress = easeOutCubic(progress)
        rotationRef.current = {
          x: targetRotation.startX + (targetRotation.x - targetRotation.startX) * easedProgress,
          y: targetRotation.startY + (targetRotation.y - targetRotation.startY) * easedProgress,
        }
        if (progress >= 1) setTargetRotation(null)
      } else if (!isDragging) {
        rotationRef.current = {
          x: rotationRef.current.x + (dy / size) * speed,
          y: rotationRef.current.y + (dx / size) * speed,
        }
      }

      iconPositions.forEach((icon, index) => {
        const cosX = Math.cos(rotationRef.current.x)
        const sinX = Math.sin(rotationRef.current.x)
        const cosY = Math.cos(rotationRef.current.y)
        const sinY = Math.sin(rotationRef.current.y)

        const rotatedX = icon.x * cosY - icon.z * sinY
        const rotatedZ = icon.x * sinY + icon.z * cosY
        const rotatedY = icon.y * cosX + rotatedZ * sinX

        const scale = (rotatedZ + 200) / 300
        const opacity = Math.max(0.2, Math.min(1, (rotatedZ + 150) / 200))

        ctx.save()
        ctx.translate(centerX + rotatedX * sphereScale, centerY + rotatedY * sphereScale)
        ctx.scale(scale, scale)
        ctx.globalAlpha = opacity

        if (icons || images) {
          if (iconCanvasesRef.current[index] && imagesLoadedRef.current[index]) {
            ctx.drawImage(iconCanvasesRef.current[index], -halfIcon, -halfIcon, ICON_SIZE, ICON_SIZE)
          }
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, halfIcon, 0, Math.PI * 2)
          ctx.fillStyle = "#4444ff"
          ctx.fill()
          ctx.fillStyle = "white"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.font = "16px Arial"
          ctx.fillText(`${icon.id + 1}`, 0, 0)
        }

        ctx.restore()
      })
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [icons, images, iconPositions, isDragging, mousePos, targetRotation, canvasSize])

  return (
    <div ref={containerRef} className={cn("w-full", className)}>
      <canvas
        ref={canvasRef}
        style={{ width: canvasSize || "100%", height: canvasSize || "auto", aspectRatio: "1" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={handlePointerUp}
        onTouchCancel={handlePointerUp}
        className="rounded-lg touch-none"
        aria-label="Interactive 3D Icon Cloud"
        role="img"
      />
    </div>
  )
}
