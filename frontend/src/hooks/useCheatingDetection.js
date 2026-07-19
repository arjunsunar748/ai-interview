import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Cheating Detection Hook
 * Detects: tab switching, window blur, face detection, looking away, lip movement (dubbing), mobile phones
 */
export function useCheatingDetection(videoRef, enabled = true, isRecordingAnswer = false) {
  const [warnings, setWarnings] = useState([])
  const [violationCount, setViolationCount] = useState(0)
  const [faceDetected, setFaceDetected] = useState(true)
  const [multipleFaces, setMultipleFaces] = useState(false)
  const [isLookingAway, setIsLookingAway] = useState(false)
  const [faceApiLoaded, setFaceApiLoaded] = useState(false)
  const [isMouthMoving, setIsMouthMoving] = useState(false)
  const [cocoLoaded, setCocoLoaded] = useState(false)

  const intervalRef = useRef(null)
  const faceApiRef = useRef(null)
  const cocoModelRef = useRef(null)
  const mouthHistoryRef = useRef([])

  // Helper to load a script dynamically
  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve()
        return
      }
      const script = document.createElement('script')
      script.src = src
      script.onload = () => resolve()
      script.onerror = (err) => reject(err)
      document.head.appendChild(script)
    })
  }

  // Load face-api.js for face detection & TensorFlow for Mobile Detection
  useEffect(() => {
    if (!enabled) return

    const loadFaceApi = async () => {
      try {
        const faceapi = await import('face-api.js').catch(() => null)
        if (!faceapi) {
          console.warn('face-api.js not installed.')
          setFaceApiLoaded(false)
          return
        }

        faceApiRef.current = faceapi
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        ])

        setFaceApiLoaded(true)
        console.log('Face detection models loaded')
      } catch (err) {
        console.warn('Face-api.js not available:', err.message)
        setFaceApiLoaded(false)
      }
    }

    const loadCocoSsd = async () => {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs')
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd')
        if (window.cocoSsd) {
          const model = await window.cocoSsd.load()
          cocoModelRef.current = model
          setCocoLoaded(true)
          console.log('COCO-SSD model loaded for mobile detection')
        }
      } catch (err) {
        console.warn('COCO-SSD could not be loaded:', err.message)
      }
    }

    loadFaceApi()
    loadCocoSsd()
  }, [enabled])

  // Add warning
  const addWarning = useCallback((type, message) => {
    const warning = {
      id: Date.now(),
      type,
      message,
      timestamp: new Date().toISOString(),
    }
    setWarnings(prev => [...prev, warning])
    setViolationCount(prev => prev + 1)
    return warning
  }, [])

  // Tab/WINDOW visibility detection
  useEffect(() => {
    if (!enabled) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        addWarning('TAB_SWITCH', 'You switched to another tab/window')
      }
    }

    const handleBlur = () => {
      addWarning('WINDOW_BLUR', 'Window lost focus')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
    }
  }, [enabled, addWarning])

  // Face + Mobile + Lip movement detection loop
  useEffect(() => {
    if (!enabled || !videoRef?.current) return

    const detectCheating = async () => {
      const video = videoRef.current
      if (!video || video.paused || video.ended) return

      // 1. Mobile Phone Detection using COCO-SSD
      if (cocoModelRef.current) {
        try {
          const predictions = await cocoModelRef.current.detect(video)
          const cellPhone = predictions.find(p => p.class === 'cell phone' && p.score > 0.5)
          if (cellPhone) {
            if (!intervalRef.current?.lastMobileWarn || Date.now() - intervalRef.current.lastMobileWarn > 8000) {
              addWarning('MOBILE_DETECTED', 'Cell phone detected in front of camera')
              intervalRef.current = { ...intervalRef.current, lastMobileWarn: Date.now() }
            }
          }
        } catch (err) {
          // Ignore tensor errors
        }
      }

      // 2. Face, Gaze, and Lip Detection using Face-API
      if (faceApiLoaded && faceApiRef.current) {
        const faceapi = faceApiRef.current
        try {
          const detections = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks(true)

          const faceCount = detections.length

          if (faceCount === 0) {
            setFaceDetected(false)
            if (!intervalRef.current?.lastNoFaceWarn || Date.now() - intervalRef.current.lastNoFaceWarn > 5000) {
              addWarning('NO_FACE', 'No face detected in camera')
              intervalRef.current = { ...intervalRef.current, lastNoFaceWarn: Date.now() }
            }
          } else {
            setFaceDetected(true)
          }

          if (faceCount > 1) {
            setMultipleFaces(true)
            addWarning('MULTIPLE_FACES', `${faceCount} faces detected - possible cheating`)
          } else {
            setMultipleFaces(false)
          }

          if (faceCount === 1) {
            const landmarks = detections[0].landmarks
            const leftEye = landmarks.getLeftEye()
            const rightEye = landmarks.getRightEye()
            const nose = landmarks.getNose()
            const mouth = landmarks.getMouth()

            // Gaze estimation
            const eyeCenterX = (leftEye[0].x + rightEye[3].x) / 2
            const noseX = nose[3].x
            const deviation = Math.abs(eyeCenterX - noseX) / video.videoWidth
            
            if (deviation > 0.15) {
              setIsLookingAway(true)
              if (!intervalRef.current?.lastGazeWarn || Date.now() - intervalRef.current.lastGazeWarn > 5000) {
                addWarning('LOOKING_AWAY', 'Looking away from screen detected')
                intervalRef.current = { ...intervalRef.current, lastGazeWarn: Date.now() }
              }
            } else {
              setIsLookingAway(false)
            }

            // Lip detection & Dubbing analysis
            if (mouth && mouth.length > 9) {
              const topLip = mouth[3] // index 3 corresponds to point 51 (top lip center)
              const bottomLip = mouth[9] // index 9 corresponds to point 57 (bottom lip center)
              const lipDistance = Math.abs(topLip.y - bottomLip.y)
              const box = detections[0].detection.box
              const faceHeight = box.height
              const normalizedDistance = lipDistance / faceHeight

              mouthHistoryRef.current.push(normalizedDistance)
              if (mouthHistoryRef.current.length > 5) {
                mouthHistoryRef.current.shift()
              }

              if (mouthHistoryRef.current.length >= 3) {
                const max = Math.max(...mouthHistoryRef.current)
                const min = Math.min(...mouthHistoryRef.current)
                const range = max - min
                const moving = range > 0.008 // threshold for movement
                setIsMouthMoving(moving)

                // If candidate is voice recording, check if mouth is stationary
                if (isRecordingAnswer) {
                  if (!moving) {
                    if (!intervalRef.current?.silentMouthStreak) {
                      intervalRef.current.silentMouthStreak = 0
                    }
                    intervalRef.current.silentMouthStreak += 1

                    if (intervalRef.current.silentMouthStreak >= 4) {
                      if (!intervalRef.current?.lastDubWarn || Date.now() - intervalRef.current.lastDubWarn > 10000) {
                        addWarning('DUBBING_DETECTED', 'Speech recording but no mouth movement (possible dubbing)')
                        intervalRef.current.lastDubWarn = Date.now()
                      }
                    }
                  } else {
                    if (intervalRef.current) {
                      intervalRef.current.silentMouthStreak = 0
                    }
                  }
                }
              }
            }
          }
        } catch (err) {
          // Ignore face-api errors
        }
      }
    }

    const detectionInterval = setInterval(detectCheating, 1000)
    return () => {
      clearInterval(detectionInterval)
    }
  }, [enabled, videoRef, faceApiLoaded, isRecordingAnswer, addWarning])

  // Reset warnings
  const reset = useCallback(() => {
    setWarnings([])
    setViolationCount(0)
    mouthHistoryRef.current = []
    if (intervalRef.current) {
      intervalRef.current.silentMouthStreak = 0
    }
  }, [])

  return {
    warnings,
    violationCount,
    faceDetected,
    multipleFaces,
    isLookingAway,
    faceApiLoaded,
    isMouthMoving,
    cocoLoaded,
    addWarning,
    reset,
  }
}
