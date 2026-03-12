import { AIService } from './server/services/aiService';
import { db } from './server/db';

async function test() {
    try {
        console.log("Testing chunkAndEmbedKnowledge...");
        const chunks = await AIService.chunkAndEmbedKnowledge('test_id', 'This is a test document about solar batteries returning policies');
        console.log("Chunks created:", chunks);

        // Check RAG
        const chat = await AIService.processChat('test_session', 'What is the policy?', 'engineer', '127.0.0.1');
        console.log("Chat response:", chat);
    } catch (e: any) {
        console.error("ERROR:", e.message, e);
    }
}

test();
