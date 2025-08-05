/**
 * WebSocket server for real-time communication
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { Config } from '../config/index.js';

export interface ComparisonProgress {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  stage: string;
  message: string;
  timestamp: string;
  details?: {
    figmaProgress?: number;
    webProgress?: number;
    comparisonProgress?: number;
    currentStep?: string;
    totalSteps?: number;
    estimatedTimeRemaining?: number;
  };
}

export class WebSocketManager {
  private io: SocketIOServer;
  private activeComparisons = new Map<string, Set<string>>(); // comparisonId -> socketIds

  constructor(httpServer: HttpServer, config: Config) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.cors.origins,
        credentials: config.cors.credentials,
      },
      transports: ['websocket'],
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`WebSocket client connected: ${socket.id}`);

      // Handle joining comparison room
      socket.on('join-comparison', (comparisonId: string) => {
        socket.join(comparisonId);
        
        if (!this.activeComparisons.has(comparisonId)) {
          this.activeComparisons.set(comparisonId, new Set());
        }
        this.activeComparisons.get(comparisonId)!.add(socket.id);
        
        console.log(`Socket ${socket.id} joined comparison ${comparisonId}`);
      });

      // Handle leaving comparison room
      socket.on('leave-comparison', (comparisonId: string) => {
        socket.leave(comparisonId);
        
        const sockets = this.activeComparisons.get(comparisonId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            this.activeComparisons.delete(comparisonId);
          }
        }
        
        console.log(`Socket ${socket.id} left comparison ${comparisonId}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`WebSocket client disconnected: ${socket.id}`);
        
        // Remove from all active comparisons
        for (const [comparisonId, sockets] of this.activeComparisons.entries()) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            this.activeComparisons.delete(comparisonId);
          }
        }
      });

      // Send initial connection status
      socket.emit('connection-status', {
        connected: true,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Emit progress update for a comparison
   */
  emitProgress(comparisonId: string, progress: ComparisonProgress) {
    this.io.to(comparisonId).emit('comparison-progress', progress);
  }

  /**
   * Emit completion event for a comparison
   */
  emitComplete(comparisonId: string, result: any) {
    this.io.to(comparisonId).emit('comparison-complete', {
      id: comparisonId,
      result,
      timestamp: new Date().toISOString(),
    });
    
    // Clean up the comparison
    this.activeComparisons.delete(comparisonId);
  }

  /**
   * Emit error event for a comparison
   */
  emitError(comparisonId: string, error: Error) {
    this.io.to(comparisonId).emit('comparison-error', {
      id: comparisonId,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    
    // Clean up the comparison
    this.activeComparisons.delete(comparisonId);
  }

  /**
   * Get the number of active connections
   */
  getActiveConnectionsCount(): number {
    return this.io.sockets.sockets.size;
  }

  /**
   * Get the number of active comparisons
   */
  getActiveComparisonsCount(): number {
    return this.activeComparisons.size;
  }

  /**
   * Create a progress tracker for a comparison
   */
  createProgressTracker(comparisonId: string) {
    return {
      update: (progress: Partial<ComparisonProgress>) => {
        const fullProgress: ComparisonProgress = {
          id: comparisonId,
          status: 'running',
          progress: 0,
          stage: 'starting',
          message: 'Processing...',
          timestamp: new Date().toISOString(),
          ...progress,
        };
        this.emitProgress(comparisonId, fullProgress);
      },
      
      complete: (result: any) => {
        this.emitComplete(comparisonId, result);
      },
      
      error: (error: Error) => {
        this.emitError(comparisonId, error);
      },
    };
  }
}

// Singleton instance
let webSocketManager: WebSocketManager | null = null;

export function initializeWebSocket(httpServer: HttpServer, config: Config): WebSocketManager {
  if (!webSocketManager) {
    webSocketManager = new WebSocketManager(httpServer, config);
  }
  return webSocketManager;
}

export function getWebSocketManager(): WebSocketManager {
  if (!webSocketManager) {
    throw new Error('WebSocket manager not initialized');
  }
  return webSocketManager;
} 