import { db } from './server/db.js';

try {
    // Find a component that is used in quote_items
    const row = db.prepare('SELECT DISTINCT component_id FROM quote_items LIMIT 1').get() as any;
    if (!row) {
        console.log("No components used in quotes found");
        process.exit(0);
    }
    const id = row.component_id;
    console.log("Attempting to delete component used in quotes:", id);

    db.transaction(() => {
        db.prepare('DELETE FROM price_history WHERE component_id = ?').run(id);
        db.prepare('DELETE FROM components WHERE id = ?').run(id);
    })();

    console.log("Deleted successfully in test DB transaction");
} catch (e) {
    console.error("Error during deletion:", e);
}
