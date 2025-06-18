import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { getWebSocketUrl } from '../utils/environment'
import { isProduction } from '../utils/environment'

interface UseWebSocketOptions {
  url?: string
  autoConnect?: boolean
}

interface ComparisonProgress {
  id: string
  status: 'pending' | 'running' | 'completed' | 'error'
  progress: number
  stage: string
  message: string
  timestamp: string
  details?: {
    figmaProgress?: number
    webProgress?: number
    comparisonProgress?: number
    currentStep?: string
    totalSteps?: number
    estimatedTimeRemaining?: number
  }
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { url = options.url || getWebSocketUrl(), autoConnect = true } = options
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  useEffect(() => {
    // Don't attempt to connect if we're in production (Netlify) or URL is empty
    if (!autoConnect || isProduction || !url) {
      if (isProduction) {
        console.log('🔌 WebSocket disabled in production environment')
      }
      return;
    }

    // Initialize socket connection
    socketRef.current = io(url, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      transports: ['websocket']
    })

    const socket = socketRef.current

    socket.on('connect', () => {
      console.log('🔌 WebSocket connected')
      setIsConnected(true)
      setConnectionError(null)
    })

    socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason)
      setIsConnected(false)
    })

    socket.on('connect_error', (error) => {
      console.warn('🔌 WebSocket connection error:', error.message)
      // Don't set connected to false here as the socket will automatically try to reconnect
    })

    return () => {
      console.log('🔌 Cleaning up WebSocket connection')
      socket.disconnect()
    }
  }, [url, autoConnect])

  const joinComparison = (comparisonId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join-comparison', comparisonId)
    }
  }

  const leaveComparison = (comparisonId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave-comparison', comparisonId)
    }
  }

  const onComparisonProgress = (callback: (progress: ComparisonProgress) => void) => {
    if (socketRef.current) {
      socketRef.current.on('comparison-progress', callback)
      return () => {
        socketRef.current?.off('comparison-progress', callback)
      }
    }
    return () => {}
  }

  const onComparisonComplete = (callback: (result: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('comparison-complete', callback)
      return () => {
        socketRef.current?.off('comparison-complete', callback)
      }
    }
    return () => {}
  }

  const onComparisonError = (callback: (error: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('comparison-error', callback)
      return () => {
        socketRef.current?.off('comparison-error', callback)
      }
    }
    return () => {}
  }

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      setIsConnected(false)
    }
  }

  const reconnect = () => {
    if (socketRef.current) {
      socketRef.current.connect()
    }
  }

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    joinComparison,
    leaveComparison,
    onComparisonProgress,
    onComparisonComplete,
    onComparisonError,
    disconnect,
    reconnect
  }
}

export type { ComparisonProgress } 