import { mapWorkspaceStateToCalculateRequest } from '../utils/workspaceAdapter';
import { WorkspaceState } from '../types/abpe';
import { apiFetch } from '../utils/apiFetch';

export const workspaceApi = {
    async calculateWorkspace(state: WorkspaceState) {
        const payload = mapWorkspaceStateToCalculateRequest(state);

        try {
            const response = await apiFetch('/api/workspace/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to calculate workspace');
            }

            return await response.json();
        } catch (error) {
            console.error('Workspace calculation error:', error);
            throw error;
        }
    }
};
