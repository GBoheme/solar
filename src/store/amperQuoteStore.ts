import { apiFetch } from '@/src/utils/apiFetch';
import { create } from 'zustand';

interface AmperQuoteState {
    isQuickMode: boolean;
    requestedAmps: number;
    sunHours: number;
    dayHours: number;
    result: any | null;
    packages: any[];
    isLoading: boolean;
    error: string | null;

    toggleQuickMode: () => void;
    setRequestedAmps: (amps: number) => void;
    setSunHours: (hours: number) => void;
    setDayHours: (hours: number) => void;
    generateQuote: () => Promise<void>;
    fetchPackages: () => Promise<void>;
    reset: () => void;
}

export const useAmperQuoteStore = create<AmperQuoteState>()(
    (set, get) => ({
        isQuickMode: false,
        requestedAmps: 20,
        sunHours: 5.0,
        dayHours: 8,
        result: null,
        packages: [],
        isLoading: false,
        error: null,

        toggleQuickMode: () => set((state) => ({ isQuickMode: !state.isQuickMode })),
        setRequestedAmps: (amps) => set({ requestedAmps: amps }),
        setSunHours: (hours) => set({ sunHours: hours }),
        setDayHours: (hours) => set({ dayHours: hours }),

        generateQuote: async () => {
            const { requestedAmps, sunHours, dayHours } = get();
            set({ isLoading: true, error: null });
            try {
                const res = await apiFetch('/api/amper-quote', {
                    method: 'POST',
                    body: JSON.stringify({ amps: requestedAmps, sun_hours: sunHours, day_hours: dayHours })
                });
                if (!res.ok) {
                    let errBody;
                    try { errBody = await res.json(); } catch (e) { }
                    console.error("ABPE Quote Error:", errBody);
                    throw new Error(errBody?.error || "Failed to calculate ABPE quote (Check console)");
                }
                const data = await res.json();
                set({ result: data, isLoading: false });
            } catch (err: any) {
                set({ error: err.message, isLoading: false });
            }
        },

        fetchPackages: async () => {
            const { sunHours, dayHours } = get();
            try {
                const res = await apiFetch('/api/amper-packages', {
                    method: 'POST',
                    body: JSON.stringify({ sun_hours: sunHours, day_hours: dayHours })
                });
                if (res.ok) {
                    const data = await res.json();
                    set({ packages: data.packages || [] });
                }
            } catch (err: any) {
                console.error("Error fetching packages", err);
            }
        },

        reset: () => set({
            isQuickMode: false,
            requestedAmps: 20,
            dayHours: 8,
            result: null,
            packages: [],
            isLoading: false,
            error: null
        })
    })
);
