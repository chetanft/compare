/**
 * Express middleware configuration
 * Enhanced security, rate limiting, and request handling
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

/**
 * Configure security middleware
 */
export function configureSecurityMiddleware(app, config) {
  // Helmet for security headers - Permissive CSP for cross-platform compatibility
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["*", "'unsafe-inline'", "'unsafe-eval'", "data:", "blob:"],
        styleSrc: ["*", "'unsafe-inline'"],
        scriptSrc: ["*", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["*", "data:", "blob:", "'unsafe-inline'"],
        connectSrc: ["*", "'unsafe-inline'"], // Allow all connections - fixes the CSP error
        fontSrc: ["*", "data:", "'unsafe-inline'"],
        frameSrc: ["*"],
        mediaSrc: ["*"],
        objectSrc: ["*"],
      },
    },
    crossOriginEmbedderPolicy: false, // Required for some Puppeteer operations
  }));

  // CORS configuration - Permissive for cross-platform compatibility
  app.use(cors({
    origin: true, // Allow all origins for development and local apps
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['*'], // Allow all headers
    exposedHeaders: ['*'], // Expose all headers
  }));

  // Body parsing
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
}

/**
 * Configure rate limiting
 */
export function configureRateLimit(config) {
  // General rate limit
  const generalLimiter = rateLimit({
    windowMs: config.security.rateLimit.windowMs,
    max: config.security.rateLimit.max,
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Lenient rate limit for health/status endpoints
  const healthLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 200, // Allow 200 health checks per minute
    message: {
      success: false,
      error: 'Too many health check requests, please slow down.',
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Strict rate limit for extraction endpoints
  const extractionLimiter = rateLimit({
    windowMs: config.security.rateLimit.windowMs,
    max: config.security.rateLimit.extractionMax,
    message: {
      success: false,
      error: 'Too many extraction requests from this IP, please try again later.',
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  return { generalLimiter, healthLimiter, extractionLimiter };
}

/**
 * Centralized error handling middleware
 */
export function errorHandler(error, req, res, next) {
  console.error('Express error:', error);

  // Don't send error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const response = {
    success: false,
    error: isDevelopment ? error.message : 'Internal server error',
    timestamp: new Date().toISOString(),
  };

  // Log full error in development
  if (isDevelopment) {
    response.data = {
      stack: error.stack,
      details: error,
    };
  }

  res.status(500).json(response);
}

/**
 * 404 handler for API routes
 */
export function notFoundHandler(req, res) {
  const response = {
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  };

  res.status(404).json(response);
}

/**
 * Response formatter middleware
 */
export function responseFormatter(req, res, next) {
  // Store original json method
  const originalJson = res.json;

  // Override json method to ensure consistent response format
  res.json = function(body) {
    if (body && typeof body === 'object' && !body.hasOwnProperty('success')) {
      // Wrap data in standard response format
      const response = {
        success: true,
        data: body,
        timestamp: new Date().toISOString(),
      };
      return originalJson.call(this, response);
    }
    
    // Add timestamp if it's already in our format but missing timestamp
    if (body && typeof body === 'object' && body.hasOwnProperty('success') && !body.timestamp) {
      body.timestamp = new Date().toISOString();
    }

    return originalJson.call(this, body);
  };

  next();
}

/**
 * Request logging middleware
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const method = req.method;
    const url = req.url;
    const userAgent = req.get('User-Agent') || 'unknown';
    
    // Simple console logging for now - can be replaced with proper logger
    console.log(`${method} ${url} ${status} ${duration}ms - ${userAgent}`);
  });

  next();
}

/**
 * URL validation middleware for extraction endpoints
 */
export function validateExtractionUrl(allowedHosts = []) {
  return (req, res, next) => {
    const { url, figmaUrl } = req.body;
    const targetUrl = url || figmaUrl;

    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const parsedUrl = new URL(targetUrl);
      
      // Block dangerous protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).json({
          success: false,
          error: 'Only HTTP and HTTPS URLs are allowed',
          timestamp: new Date().toISOString(),
        });
      }

      // Block localhost/private IPs unless specifically allowed
      const hostname = parsedUrl.hostname;
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
      const isPrivateIP = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/.test(hostname);
      const isLinkLocal = hostname.startsWith('169.254.');

      if ((isLocalhost || isPrivateIP || isLinkLocal) && allowedHosts.length > 0) {
        const isAllowed = allowedHosts.some(allowed => hostname.includes(allowed));
        if (!isAllowed) {
          return res.status(400).json({
            success: false,
            error: 'URL not in allowed hosts list',
            timestamp: new Date().toISOString(),
          });
        }
      }

      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format',
        timestamp: new Date().toISOString(),
      });
    }
  };
} 