import { useState, useRef, useCallback } from 'react'

/**
 * Video Recording Hook
 * Records webcam + screen during interview
 */
export function useVideoRecorder(videoRef, enabled = true) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [recordedUrl, setRecordedUrl] = useState(null)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState(null)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const streamRef = useRef(null)

  const startRecording = useCallback(async () => {
    if (!videoRef?.current) {
      setError('Video element not found')
      return false
    }

    try {
      const stream = videoRef.current.srcObject
      if (!stream) {
        setError('No video stream found')
        return false
      }

      streamRef.current = stream
      chunksRef.current = []

      // Try different codecs for better compatibility
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ]

      let selectedType = ''
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedType = type
          break
        }
      }

      if (!selectedType) {
        setError('No supported video format found')
        return false
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: selectedType,
        videoBitsPerSecond: 1000000, // 1 Mbps
      })

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: selectedType })
        const url = URL.createObjectURL(blob)
        setRecordedBlob(blob)
        setRecordedUrl(url)
        setIsRecording(false)
        clearInterval(timerRef.current)
      }

      recorder.onerror = (e) => {
        console.error('Recorder error:', e)
        setError('Recording failed')
        setIsRecording(false)
      }

      mediaRecorderRef.current = recorder
      recorder.start(1000) // Collect data every second
      setIsRecording(true)
      setDuration(0)
      setRecordedBlob(null)
      setRecordedUrl(null)

      // Duration timer
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1)
      }, 1000)

      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }, [videoRef])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
  }, [isRecording])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause()
    }
  }, [isRecording])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.resume()
    }
  }, [])

  const downloadRecording = useCallback((filename = 'interview.webm') => {
    if (recordedUrl) {
      const a = document.createElement('a')
      a.href = recordedUrl
      a.download = filename
      a.click()
    }
  }, [recordedUrl])

  const clearRecording = useCallback(() => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl)
    }
    setRecordedBlob(null)
    setRecordedUrl(null)
    setDuration(0)
  }, [recordedUrl])

  return {
    isRecording,
    recordedBlob,
    recordedUrl,
    duration,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    downloadRecording,
    clearRecording,
  }
}
