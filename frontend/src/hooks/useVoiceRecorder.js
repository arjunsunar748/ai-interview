import { useState, useRef, useCallback } from 'react'

export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState(null)

  const mediaRecorder = useRef(null)
  const chunks = useRef([])
  const timer = useRef(null)
  const startTime = useRef(null)

  const start = useCallback(async () => {
    setError(null)
    setAudioBlob(null)
    setAudioUrl(null)
    setDuration(0)
    chunks.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'audio/webm' })

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data)
      }

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setAudioBlob(blob)
        setAudioUrl(url)
        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop())
      }

      mediaRecorder.current.start(100) // collect data every 100ms
      setRecording(true)
      startTime.current = Date.now()

      // Update duration counter
      timer.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime.current) / 1000))
      }, 1000)
    } catch (err) {
      setError('Microphone access denied. Please allow microphone permissions.')
    }
  }, [])

  const stop = useCallback(() => {
    if (mediaRecorder.current && recording) {
      mediaRecorder.current.stop()
      setRecording(false)
      clearInterval(timer.current)
    }
  }, [recording])

  const reset = useCallback(() => {
    stop()
    setAudioBlob(null)
    setAudioUrl(null)
    setDuration(0)
    chunks.current = []
  }, [stop])

  return { recording, audioBlob, audioUrl, duration, error, start, stop, reset }
}
