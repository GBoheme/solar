import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { apiJson } from '../utils/apiFetch';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}

interface AiChatState {
    sessionId: string;
    persona: 'engineer' | 'sales' | 'beginner';
    messages: ChatMessage[];
    isLoading: boolean;
    error: string | null;

    setPersona: (persona: 'engineer' | 'sales' | 'beginner') => void;
    sendMessage: (text: string) => Promise<void>;
    clearChat: () => void;
}

export const useAiChatStore = create<AiChatState>((set, get) => ({
    sessionId: uuidv4(),
    persona: 'engineer',
    messages: [],
    isLoading: false,
    error: null,

    setPersona: (persona) => {
        // Changing persona starts a new session to clear context context
        set({ persona, sessionId: uuidv4(), messages: [], error: null });
    },

    clearChat: () => {
        set({ sessionId: uuidv4(), messages: [], error: null });
    },

    sendMessage: async (text: string) => {
        const { sessionId, persona, messages } = get();
        if (!text.trim()) return;

        const userMsg: ChatMessage = {
            id: uuidv4(),
            role: 'user',
            content: text,
            timestamp: new Date()
        };

        set({
            messages: [...messages, userMsg],
            isLoading: true,
            error: null
        });

        try {
            const response = await apiJson<{ reply: string }>('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId,
                    message: text,
                    persona
                })
            });

            if (!response.reply) {
                throw new Error('لم يتم استلام رد من الذكاء الاصطناعي.');
            }

            const assistantMsg: ChatMessage = {
                id: uuidv4(),
                role: 'assistant',
                content: response.reply,
                timestamp: new Date()
            };

            set((state) => ({
                messages: [...state.messages, assistantMsg],
                isLoading: false
            }));

        } catch (err: any) {
            console.error('AI Chat Error:', err);
            set({
                error: err.message || 'حدث خطأ أثناء الاتصال بالمساعد الذكي.',
                isLoading: false
            });
        }
    }
}));
