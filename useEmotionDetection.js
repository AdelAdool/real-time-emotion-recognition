/**
 * useEmotionDetection
 * Manages webcam access, face-api.js model loading,
 * real-time detection loop, and session analytics.
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import * as faceapi from 'face-api.js'

const EMOTIONS = ['happy', 'sad', 'angry', 'neutral', 'surprised', 'fearful', 'disgusted']
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'
const TIMELINE_WINDOW_MS = 60_000
const BACKEND_API = import.meta.env.VITE_API_URL || '/api'
const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true'

function makeEmptyEmotions() {
  return Object.fromEntries(EMOTIONS.map(e => [e, 0]))
}

export function useEmotionDetection() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const loopRef = useRef(null)
  const sessionIdRef = useRef(`session_${Date.now()}`)

  const [status, setStatus] = useState('idle') // idle | loading | active | error
  const [loadingMsg, setLoadingMsg] = useState('')
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [currentEmotions, setCurrentEmotions] = useState(makeEmptyEmotions())
  const [dominantEmotion, setDominantEmotion] = useState(null)
  const [confidence, setConfidence] = useState(0)
  const [fps, setFps] = useState(0)
  const [faceDetected, setFaceDetected] = useState(false)
  const [timelineData, setTimelineData] = useState([])
  const [sessionCounts, setSessionCounts] = useState(makeEmptyEmotions())
  const [frameCount, setFrameCount] = useState(0)
  const [stabilityChanges, setStabilityChanges] = useState(0)
  const [engagementPoints, setEngagementPoints] = useState(0)
  const [sessionLog, setSessionLog] = useState([])

  const prevEmotionRef = useRef(null)
  const frameCountRef = useRef(0)
  const stabilityRef = useRef(0)
  const engagementRef = useRef(0)
  const fpsFrames = useRef(0)
  const fpsTimestamp = useRef(Date.now())
  const sessionCountsRef = useRef(makeEmptyEmotions())

  const loadModels = useCallback(async () => {
    if (modelsLoaded) return true
    try {
      setLoadingMsg('Loading face detector...')
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
      setLoadingMsg('Loading expression classifier...')
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      setModelsLoaded(true)
      return true
    } catch (e) {
      console.warn('face-api.js model load failed:', e)
      return false
    }
  }, [modelsLoaded])

  const processEmotionResult = useCallback((emotions) => {
    const top = Object.entries(emotions).sort((a, b) => b[1] - a[1])[0]
    const topKey = top[0]
    const topConf = top[1]

    setCurrentEmotions({ ...emotions })
    setDominantEmotion(topKey)
    setConfidence(topConf)

    // Session counts
    EMOTIONS.forEach(e => { sessionCountsRef.current[e] += emotions[e] || 0 })
    setSessionCounts({ ...sessionCountsRef.current })

    // Stability
    if (prevEmotionRef.current && prevEmotionRef.current !== topKey) {
      stabilityRef.current++
      setStabilityChanges(stabilityRef.current)
    }
    prevEmotionRef.current = topKey

    // Engagement
    if (topKey !== 'neutral') {
      engagementRef.current++
      setEngagementPoints(engagementRef.current)
    }

    // Frame count
    frameCountRef.current++
    setFrameCount(frameCountRef.current)

    // FPS
    fpsFrames.current++
    const now = Date.now()
    if (now - fpsTimestamp.current >= 1000) {
      setFps(fpsFrames.current)
      fpsFrames.current = 0
      fpsTimestamp.current = now
    }

    // Timeline
    setTimelineData(prev => {
      const cutoff = Date.now() - TIMELINE_WINDOW_MS
      const next = [...prev.filter(d => d.time >= cutoff), { time: Date.now(), emotions: { ...emotions } }]
      return next
    })

    // Session log
    setSessionLog(prev => [...prev, {
      timestamp: new Date().toISOString(),
      dominant: topKey,
      confidence: topConf,
      emotions: { ...emotions },
    }])
  }, [])

  const drawOverlay = useCallback((detections) => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return
    const ctx = canvas.getContext('2d')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    detections.forEach(det => {
      const { box } = det.detection
      const exps = det.expressions
      const top = Object.entries(exps).sort((a, b) => b[1] - a[1])[0]
      const COLORS = {
        happy: '#10b981', sad: '#6366f1', angry: '#ef4444',
        neutral: '#6b7280', surprised: '#f59e0b', fearful: '#a855f7', disgusted: '#06b6d4',
        fear: '#a855f7', disgust: '#06b6d4', surprise: '#f59e0b',
      }
      const color = COLORS[top[0]] || '#6366f1'

      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.strokeRect(box.x, box.y, box.width, box.height)

      const label = top[0].replace('fear', 'fearful').replace('disgust', 'disgusted').replace('surprise', 'surprised')
      ctx.fillStyle = color + 'cc'
      ctx.fillRect(box.x, box.y - 26, box.width, 26)
      ctx.fillStyle = '#fff'
      ctx.font = '500 13px Syne, sans-serif'
      ctx.fillText(`${label.toUpperCase()} ${Math.round(top[1] * 100)}%`, box.x + 6, box.y - 8)
    })
  }, [])

  const runDetection = useCallback(async () => {
    const video = videoRef.current
    if (!video || !streamRef.current) return

    if (video.readyState >= 2) {
      try {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
          .withFaceExpressions()

        setFaceDetected(detections.length > 0)

        if (detections.length > 0) {
          drawOverlay(detections)
          const exps = detections[0].expressions
          const mapped = {
            happy: exps.happy || 0,
            sad: exps.sad || 0,
            angry: exps.angry || 0,
            neutral: exps.neutral || 0,
            surprised: exps.surprised || exps.surprise || 0,
            fearful: exps.fearful || exps.fear || 0,
            disgusted: exps.disgusted || exps.disgust || 0,
          }
          processEmotionResult(mapped)
        }
      } catch (e) {
        // silently continue
      }
    }

    loopRef.current = requestAnimationFrame(runDetection)
  }, [drawOverlay, processEmotionResult])

  const startCamera = useCallback(async () => {
    setStatus('loading')
    setLoadingMsg('Requesting camera access...')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      const loaded = await loadModels()
      if (!loaded) throw new Error('Models failed to load')

      setStatus('active')
      loopRef.current = requestAnimationFrame(runDetection)
    } catch (e) {
      setStatus('error')
      setLoadingMsg(e.message || 'Failed to start')
    }
  }, [loadModels, runDetection])

  const stopCamera = useCallback(() => {
    if (loopRef.current) {
      cancelAnimationFrame(loopRef.current)
      loopRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setStatus('idle')
    setFaceDetected(false)
  }, [])

  const captureScreenshot = useCallback(() => {
    const video = videoRef.current
    const overlay = canvasRef.current
    if (!video) return
    const temp = document.createElement('canvas')
    temp.width = overlay?.width || 640
    temp.height = overlay?.height || 480
    const ctx = temp.getContext('2d')
    ctx.scale(-1, 1)
    ctx.drawImage(video, -temp.width, 0, temp.width, temp.height)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    if (overlay) ctx.drawImage(overlay, 0, 0)
    const link = document.createElement('a')
    link.download = `emotion-capture-${Date.now()}.png`
    link.href = temp.toDataURL()
    link.click()
  }, [])

  const exportCSV = useCallback(() => {
    const rows = ['timestamp,dominant,confidence,happy,sad,angry,neutral,surprised,fearful,disgusted']
    sessionLog.forEach(entry => {
      const { timestamp, dominant, confidence: conf, emotions } = entry
      rows.push([
        timestamp, dominant, Math.round(conf * 100),
        ...EMOTIONS.map(e => Math.round((emotions[e] || 0) * 100)),
      ].join(','))
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const link = document.createElement('a')
    link.download = `emotion-session-${Date.now()}.csv`
    link.href = URL.createObjectURL(blob)
    link.click()
  }, [sessionLog])

  const resetSession = useCallback(() => {
    frameCountRef.current = 0
    stabilityRef.current = 0
    engagementRef.current = 0
    sessionCountsRef.current = makeEmptyEmotions()
    prevEmotionRef.current = null
    setFrameCount(0)
    setStabilityChanges(0)
    setEngagementPoints(0)
    setSessionCounts(makeEmptyEmotions())
    setTimelineData([])
    setSessionLog([])
    setCurrentEmotions(makeEmptyEmotions())
    setDominantEmotion(null)
    setConfidence(0)
  }, [])

  // Computed analytics
  const dominantOverall = Object.entries(sessionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null
  const stabilityScore = frameCount > 0 ? Math.max(0, Math.round(100 - (stabilityChanges / frameCount) * 100)) : 0
  const engagementScore = frameCount > 0 ? Math.min(100, Math.round((engagementPoints / frameCount) * 100)) : 0

  useEffect(() => () => stopCamera(), [stopCamera])

  return {
    videoRef,
    canvasRef,
    status,
    loadingMsg,
    currentEmotions,
    dominantEmotion,
    confidence,
    fps,
    faceDetected,
    timelineData,
    sessionCounts,
    frameCount,
    stabilityScore,
    engagementScore,
    dominantOverall,
    sessionLog,
    startCamera,
    stopCamera,
    captureScreenshot,
    exportCSV,
    resetSession,
  }
}
