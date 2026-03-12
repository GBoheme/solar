import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import express from 'express';

export const configureSecurity = (app: express.Application) => {
    // Helmet with CSP for production
    app.use(helmet({
        contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "blob:"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                frameSrc: ["'none'"],
            }
        } : false, // Disable CSP in dev (Vite HMR needs inline scripts)
    }));

    // CORS — strict origin allowlist even in development
    const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',');
    app.use(cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    }));

    // Body size limit — applied ONCE here (don't add express.json() again in server.ts)
    app.use(express.json({ limit: '50kb' }));

    // Global rate limiter — 300 requests per 10 minutes (enough for SPA dashboard)
    const globalLimiter = rateLimit({
        windowMs: 10 * 60 * 1000,
        max: 300,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many requests, please try again later.' }
    });
    app.use(globalLimiter);
};

export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' }
});

export const amperQuoteLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 30,
    message: { error: 'Too many quote generation requests, please slow down.' }
});
