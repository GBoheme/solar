import { Request, Response, NextFunction } from 'express';

// ── Authentication DISABLED ──
// App is running in public mode. All endpoints are accessible without auth.

/**
 * Middleware: Pass-through (auth disabled).
 * Sets a default anonymous user on the request for audit logging compatibility.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    // Attach a default anonymous user for compatibility with audit logging
    (req as any).user = { id: 'anonymous', role: 'admin' };
    next();
};

/**
 * Middleware: Pass-through (role checks disabled).
 */
export const requireRole = (_allowedRoles: string[]) => {
    return (_req: Request, _res: Response, next: NextFunction) => {
        next();
    };
};
