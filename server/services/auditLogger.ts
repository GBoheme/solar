import { db } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

export const auditLogger = {
    log: (
        userId: string | null,
        action: string,
        entityType: string,
        oldValue: any | null,
        newValue: any | null,
        ipAddress: string | null = null,
        userAgent: string | null = null
    ) => {
        try {
            const stmt = db.prepare(`
        INSERT INTO audit_logs (id, user_id, action, entity_type, old_value, new_value, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(
                uuidv4(),
                userId,
                action,
                entityType,
                oldValue ? JSON.stringify(oldValue) : null,
                newValue ? JSON.stringify(newValue) : null,
                ipAddress,
                userAgent
            );
        } catch (err) {
            console.error('Failed to write audit log:', err);
        }
    }
};
