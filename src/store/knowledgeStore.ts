import { create } from 'zustand';

export interface KnowledgeSource {
    id: string;
    title: string;
    source_type: string;
    is_active: number;
    chunks_count: number;
    created_at: string;
    content?: string;
    structured_data?: any;
}

interface KnowledgeState {
    sources: KnowledgeSource[];
    isLoading: boolean;
    error: string | null;
    fetchSources: () => Promise<void>;
    addSource: (data: { title: string; content: string; source_type?: string }) => Promise<void>;
    updateSource: (id: string, data: Partial<KnowledgeSource>) => Promise<void>;
    deleteSource: (id: string) => Promise<void>;
}

export const useKnowledgeStore = create<KnowledgeState>((set) => ({
    sources: [],
    isLoading: false,
    error: null,

    fetchSources: async () => {
        set({ isLoading: true, error: null });
        try {
            const res = await fetch('/api/ai/knowledge-sources');
            if (!res.ok) throw new Error('فشل جلب مصادر المعرفة');
            const data = await res.json();
            set({ sources: data, isLoading: false });
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    addSource: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const res = await fetch('/api/ai/knowledge-sources', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('فشل إضافة المصدر');
            // Re-fetch to get updated list with chunk counts
            const fetchRes = await fetch('/api/ai/knowledge-sources');
            const sources = await fetchRes.json();
            set({ sources, isLoading: false });
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
            throw err;
        }
    },

    updateSource: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
            const res = await fetch(`/api/ai/knowledge-sources/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('فشل التحديث');

            const fetchRes = await fetch('/api/ai/knowledge-sources');
            const sources = await fetchRes.json();
            set({ sources, isLoading: false });
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
            throw err;
        }
    },

    deleteSource: async (id) => {
        set({ isLoading: true, error: null });
        try {
            const res = await fetch(`/api/ai/knowledge-sources/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('فشل الحذف');
            set((state) => ({
                sources: state.sources.filter((s) => s.id !== id),
                isLoading: false,
            }));
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
            throw err;
        }
    },
}));
