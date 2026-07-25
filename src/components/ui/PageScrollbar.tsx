import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'

const TRACK_PADDING = 3
const MIN_THUMB_HEIGHT = 52

type ScrollMetrics = {
  maxScroll: number
  scrollTop: number
  thumbHeight: number
  thumbTop: number
  visible: boolean
}

const initialMetrics: ScrollMetrics = {
  maxScroll: 0,
  scrollTop: 0,
  thumbHeight: MIN_THUMB_HEIGHT,
  thumbTop: TRACK_PADDING,
  visible: false,
}

export function PageScrollbar() {
  const trackRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number | null>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragRef = useRef<{
    pointerId: number
    startClientY: number
    startScrollTop: number
  } | null>(null)
  const [metrics, setMetrics] = useState(initialMetrics)
  const [active, setActive] = useState(false)
  const [dragging, setDragging] = useState(false)

  const measure = useCallback(() => {
    const scrollElement = document.scrollingElement ?? document.documentElement
    const trackHeight = trackRef.current?.clientHeight ?? 0
    const scrollHeight = scrollElement.scrollHeight
    const maxScroll = Math.max(0, scrollHeight - window.innerHeight)
    const availableTrack = Math.max(0, trackHeight - TRACK_PADDING * 2)
    const thumbHeight = Math.min(
      availableTrack,
      Math.max(
        MIN_THUMB_HEIGHT,
        scrollHeight > 0
          ? availableTrack * (window.innerHeight / scrollHeight)
          : availableTrack,
      ),
    )
    const maxThumbTop = Math.max(0, availableTrack - thumbHeight)
    const scrollTop = Math.min(
      maxScroll,
      Math.max(0, window.scrollY || scrollElement.scrollTop),
    )

    setMetrics({
      maxScroll,
      scrollTop,
      thumbHeight,
      thumbTop:
        TRACK_PADDING +
        (maxScroll > 0 ? (scrollTop / maxScroll) * maxThumbTop : 0),
      visible: maxScroll > 2 && trackHeight > MIN_THUMB_HEIGHT,
    })
  }, [])

  const scheduleMeasure = useCallback(() => {
    if (frameRef.current !== null) return

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null
      measure()
    })
  }, [measure])

  const showActivity = useCallback(() => {
    setActive(true)
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => setActive(false), 700)
  }, [])

  useEffect(() => {
    document.documentElement.classList.add('custom-scrollbar-enabled')
    measure()

    const handleScroll = () => {
      showActivity()
      scheduleMeasure()
    }
    const resizeObserver = new ResizeObserver(scheduleMeasure)

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', scheduleMeasure)
    resizeObserver.observe(document.documentElement)
    if (document.body) resizeObserver.observe(document.body)

    return () => {
      document.documentElement.classList.remove('custom-scrollbar-enabled')
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', scheduleMeasure)
      resizeObserver.disconnect()
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [measure, scheduleMeasure, showActivity])

  const scrollTo = useCallback((top: number, smooth = false) => {
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    window.scrollTo({
      top: Math.max(0, top),
      behavior: smooth && !reduceMotion ? 'smooth' : 'auto',
    })
  }, [])

  const handleTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return

    const rect = event.currentTarget.getBoundingClientRect()
    const maxThumbTop = Math.max(
      0,
      rect.height - TRACK_PADDING * 2 - metrics.thumbHeight,
    )
    const targetThumbTop =
      event.clientY - rect.top - TRACK_PADDING - metrics.thumbHeight / 2
    const ratio =
      maxThumbTop > 0
        ? Math.min(1, Math.max(0, targetThumbTop / maxThumbTop))
        : 0

    showActivity()
    scrollTo(ratio * metrics.maxScroll, true)
  }

  const handleThumbPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startClientY: event.clientY,
      startScrollTop: metrics.scrollTop,
    }
    setDragging(true)
    setActive(true)
  }

  const handleThumbPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const trackHeight = trackRef.current?.clientHeight ?? 0
    const maxThumbTop = Math.max(
      0,
      trackHeight - TRACK_PADDING * 2 - metrics.thumbHeight,
    )
    if (maxThumbTop === 0) return

    const delta = event.clientY - drag.startClientY
    scrollTo(
      drag.startScrollTop + (delta / maxThumbTop) * metrics.maxScroll,
    )
  }

  const stopDragging = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    setDragging(false)
    showActivity()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let nextScroll: number | undefined

    switch (event.key) {
      case 'ArrowUp':
        nextScroll = metrics.scrollTop - 80
        break
      case 'ArrowDown':
        nextScroll = metrics.scrollTop + 80
        break
      case 'PageUp':
        nextScroll = metrics.scrollTop - window.innerHeight * 0.85
        break
      case 'PageDown':
        nextScroll = metrics.scrollTop + window.innerHeight * 0.85
        break
      case 'Home':
        nextScroll = 0
        break
      case 'End':
        nextScroll = metrics.maxScroll
        break
      default:
        return
    }

    event.preventDefault()
    showActivity()
    scrollTo(Math.min(metrics.maxScroll, Math.max(0, nextScroll)))
  }

  return (
    <div
      className={`pointer-events-none fixed bottom-20 top-20 z-[65] w-4 transition-opacity duration-200 lg:bottom-5 ${
        metrics.visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        insetInlineEnd: 'max(4px, env(safe-area-inset-right))',
      }}
      data-page-scrollbar
    >
      <div
        ref={trackRef}
        className={`pointer-events-auto relative h-full w-full cursor-pointer rounded-full transition-colors ${
          active || dragging
            ? 'bg-ink/[0.055]'
            : 'bg-ink/[0.025] hover:bg-ink/[0.055]'
        }`}
        onPointerDown={handleTrackPointerDown}
      >
        <div
          role="scrollbar"
          aria-label="Page scroll"
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={Math.round(metrics.maxScroll)}
          aria-valuenow={Math.round(metrics.scrollTop)}
          tabIndex={metrics.visible ? 0 : -1}
          className={`absolute left-1/2 w-1.5 -translate-x-1/2 touch-none select-none rounded-full bg-gradient-to-b from-rose-400 via-rose-500 to-rose-600 shadow-[0_2px_8px_rgba(237,0,64,0.28)] outline-none transition-[width,opacity,box-shadow] duration-200 hover:w-2 focus-visible:w-2 focus-visible:ring-2 focus-visible:ring-rose-200 focus-visible:ring-offset-2 focus-visible:ring-offset-cream ${
            active || dragging
              ? 'w-2 opacity-100 shadow-[0_3px_12px_rgba(237,0,64,0.4)]'
              : 'opacity-60'
          }`}
          style={{
            height: `${metrics.thumbHeight}px`,
            transform: `translate(-50%, ${metrics.thumbTop}px)`,
          }}
          onKeyDown={handleKeyDown}
          onPointerDown={handleThumbPointerDown}
          onPointerMove={handleThumbPointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
        />
      </div>
    </div>
  )
}
