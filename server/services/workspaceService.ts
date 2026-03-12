import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { z } from 'zod';

const PresetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  workspace_state_json: z.string(),
  created_by: z.string().optional(),
  created_at: z.string()
});

export type WorkspacePreset = z.infer<typeof PresetSchema>;

export const WorkspaceService = {
  
  savePreset(name: string, stateJson: string, description?: string, createdBy?: string): WorkspacePreset {
    const id = uuidv4();
    const created_at = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO workspace_presets (id, name, description, workspace_state_json, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, name, description || null, stateJson, createdBy || null, created_at);
    
    return this.getPreset(id)!;
  },

  getPreset(id: string): WorkspacePreset | null {
    const stmt = db.prepare('SELECT * FROM workspace_presets WHERE id = ?');
    const row = stmt.get(id);
    return row ? PresetSchema.parse(row) : null;
  },

  getAllPresets(): WorkspacePreset[] {
    const stmt = db.prepare('SELECT * FROM workspace_presets ORDER BY created_at DESC');
    return stmt.all().map(row => PresetSchema.parse(row));
  },

  deletePreset(id: string): boolean {
    const stmt = db.prepare('SELECT id FROM workspace_presets WHERE id = ?');
    const exists = stmt.get(id);
    if (!exists) return false;
    
    const result = db.prepare('DELETE FROM workspace_presets WHERE id = ?').run(id);
    return result.changes > 0;
  }
};
