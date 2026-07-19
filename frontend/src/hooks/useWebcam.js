import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Webcam Hook
 * Handles webcam access with permission handling
 */
export function useWebcam() {
  const [stream, setStream] = useState(null)
  const [error, setError] = useState(null)
  const [permission, setPermission] = useState('prompt') // 'granted' | 'denied' | 'prompt'
  const [isLoading, setIsLoading] = useState(false)
  const videoRef = useRef(null)

  const startWebcam = useCallback(async (constraints = {}) => {
    setIsLoading(true)
    setError(null)

    const defaultConstraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
      },
      audio: true,
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        ...defaultConstraints,
        ...constraints,
      })

      setStream(mediaStream)
      setPermission('granted')

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await videoRef.current.play()
      }

      return mediaStream
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access.')
        setPermission('denied')
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.')
      } else {
        setError(err.message)
      }
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const stopWebcam = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [stream])

  const toggleCamera = useCallback(async () => {
    if (stream) {
      stopWebcam()
    } else {
      await startWebcam()
    }
  }, [stream, stopWebcam, startWebcam])

  const toggleMic = useCallback(() => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        return !audioTrack.enabled // Returns true if muted
      }
    }
    return false
  }, [stream])

  const getVideoTrack = useCallback(() => {
    return stream?.getVideoTracks()[0] || null
  }, [stream])

  const getAudioTrack = useCallback(() => {
    return stream?.getAudioTracks()[0] || null
  }, [stream])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [stream])

  // Attach stream to video element when it mounts or stream changes
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(() => {})
    }
  }, [stream])

  return {
    videoRef,
    stream,
    error,
    permission,
    isLoading,
    startWebcam,
    stopWebcam,
    toggleCamera,
    toggleMic,
    getVideoTrack,
    getAudioTrack,
  }
}
