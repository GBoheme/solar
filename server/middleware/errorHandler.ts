import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled Server Error:', err);

    // Do not expose stack trace in production
    const isProduction = process.env.NODE_ENV === 'production';

    res.status(err.status || 500).json({
        error: isProduction ? 'Internal Server Error' : err.message,
        code: err.status || 500
    });
};
