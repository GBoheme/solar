import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validateSchema = (schema: any) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            schema.parse(req.body);
            next();
        } catch (error: any) {
            if (error instanceof ZodError) {
                const zodError = error as ZodError<any>;
                return res.status(400).json({
                    error: 'Validation failed',
                    details: zodError.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
                });
            }
            next(error);
        }
    };
};
