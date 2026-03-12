import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';

// ── JWT Secret Enforcement ──
// Must match the secret used in auth.ts middleware.
// Both use the same JWT_SECRET env var — if missing, auth.ts will have already killed the process.
const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '';

// Constants for expirations
export const ACCESS_TOKEN_EXPIRES = '15m';
export const REFRESH_TOKEN_EXPIRES = '7d';

export const authService = {
    async comparePassword(plain: string, hash: string): Promise<boolean> {
        return bcrypt.compare(plain, hash);
    },

    async hashPassword(plain: string): Promise<string> {
        const salt = await bcrypt.genSalt(12);
        return bcrypt.hash(plain, salt);
    },

    generateAccessToken(user: { id: string, role: string }): string {
        return jwt.sign(
            { id: user.id, role: user.role },
            JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRES }
        );
    },

    generateRefreshToken(user: { id: string }): string {
        return jwt.sign(
            { id: user.id },
            JWT_REFRESH_SECRET,
            { expiresIn: REFRESH_TOKEN_EXPIRES }
        );
    },

    async rotateRefreshToken(userId: string): Promise<string> {
        const newToken = this.generateRefreshToken({ id: userId });
        const newHash = await this.hashPassword(newToken);

        const stmt = db.prepare('UPDATE users SET refresh_token_hash = ? WHERE id = ?');
        stmt.run(newHash, userId);

        return newToken;
    },

    async invalidateRefreshToken(userId: string): Promise<void> {
        const stmt = db.prepare('UPDATE users SET refresh_token_hash = NULL WHERE id = ?');
        stmt.run(userId);
    },

    async verifyRefreshToken(userId: string, token: string): Promise<boolean> {
        const stmt = db.prepare('SELECT refresh_token_hash FROM users WHERE id = ?');
        const user = stmt.get(userId) as { refresh_token_hash: string | null } | undefined;

        if (!user || !user.refresh_token_hash) return false;

        try {
            jwt.verify(token, JWT_REFRESH_SECRET);
            return await this.comparePassword(token, user.refresh_token_hash);
        } catch (e) {
            return false; // Token expired or invalid signature
        }
    }
};
