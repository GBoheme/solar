import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Currency = 'USD' | 'IQD';

interface CurrencyState {
  currency: Currency;
  exchangeRate: number;
  
  // Actions
  setCurrency: (c: Currency) => void;
  setExchangeRate: (rate: number) => void;
  
  // Helpers
  formatPrice: (usdPrice: number, forceCurrency?: Currency) => string;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currency: 'USD',
      exchangeRate: 1500, // Safe default in case API fetch fails

      setCurrency: (currency) => set({ currency }),
      setExchangeRate: (rate) => set({ exchangeRate: rate }),

      formatPrice: (usdPrice: number, forceCurrency?: Currency) => {
        const { currency, exchangeRate } = get();
        const finalCurrency = forceCurrency || currency;

        if (finalCurrency === 'USD') {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
          }).format(usdPrice);
        } else {
          const iqdPrice = usdPrice * exchangeRate;
          return new Intl.NumberFormat('ar-IQ', {
            style: 'currency',
            currency: 'IQD',
            maximumFractionDigits: 0
          }).format(iqdPrice);
        }
      }
    }),
    {
      name: 'smart-solar-currency-store', // key in localStorage
    }
  )
);
