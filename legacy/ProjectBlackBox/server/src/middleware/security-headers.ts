/**
 * Helmet.js Security Headers Configuration
 * 
 * Adds security headers to protect against common vulnerabilities
 */

import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import { isProduction } from '../config/environment.js';

/**
 * Get Helmet configuration based on environment
 */
export function getHelmetConfig() {
    if (isProduction()) {
        // Production: Strict security headers
        return helmet({
            // Content Security Policy
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", 'data:', 'https:'],
                    connectSrc: ["'self'", 'wss:', 'https:'], // Allow WebSocket connections
                    fontSrc: ["'self'", 'data:'],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"]
                }
            },

            // Strict Transport Security (HTTPS only)
            hsts: {
                maxAge: 31536000, // 1 year
                includeSubDomains: true,
                preload: true
            },

            // Prevent clickjacking
            frameguard: {
                action: 'deny'
            },

            // Prevent MIME type sniffing
            noSniff: true,

            // XSS Protection
            xssFilter: true,

            // Hide X-Powered-By header
            hidePoweredBy: true,

            // Referrer Policy
            referrerPolicy: {
                policy: 'strict-origin-when-cross-origin'
            }
        });
    } else {
        // Development: Relaxed headers for easier debugging
        return helmet({
            contentSecurityPolicy: false, // Disable CSP in development
            hsts: false, // No HTTPS enforcement in development
            hidePoweredBy: true
        });
    }
}

/**
 * Security headers middleware
 */
export const securityHeaders = getHelmetConfig();

/**
 * Additional custom security headers
 */
export function customSecurityHeaders(req: Request, res: Response, next: NextFunction) {
    // Prevent caching of sensitive data
    if (req.path.includes('/api/')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }

    // Add custom security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Permissions Policy (formerly Feature Policy)
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    next();
}

/**
 * Log security configuration on startup
 */
export function logSecurityConfiguration(): void {
    if (isProduction()) {
        console.log('Security Headers (Production):');
        console.log('  ✓ Content Security Policy enabled');
        console.log('  ✓ HSTS enabled (1 year)');
        console.log('  ✓ XSS Protection enabled');
        console.log('  ✓ Clickjacking protection enabled');
        console.log('  ✓ MIME sniffing prevention enabled');
    } else {
        console.log('Security Headers (Development):');
        console.log('  ⚠ Relaxed CSP for debugging');
        console.log('  ⚠ HSTS disabled (no HTTPS requirement)');
        console.log('  ✓ Basic security headers enabled');
    }
}
