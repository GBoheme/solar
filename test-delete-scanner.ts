import { db } from './server/db.js';

const components = db.prepare('SELECT id, brand, model FROM components').all() as any[];
console.log(`Checking ${components.length} components for deletion constraints...`);

let failedCount = 0;

for (const comp of components) {
    try {
        // Run inside an isolated transaction that we will roll back immediately
        db.transaction(() => {
            // simulate the exact API endpoint behavior
            db.prepare('DELETE FROM price_history WHERE component_id = ?').run(comp.id);
            db.prepare('DELETE FROM components WHERE id = ?').run(comp.id);

            // Deliberately throw an error to trigger rollback if it succeeded
            throw new Error('ROLLBACK_MARKER');
        })();
    } catch (err: any) {
        if (err.message === 'ROLLBACK_MARKER') {
            // success!
        } else {
            console.log(`FAILED TO DELETE: ${comp.brand} ${comp.model} (ID: ${comp.id})`);
            console.log(`ERROR:`, err.message);
            failedCount++;
        }
    }
}

console.log(`Scan complete. ${failedCount} components cannot be deleted.`);
