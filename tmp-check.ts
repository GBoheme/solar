import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: 'mock' });
console.log(Object.keys(ai.models));
