import 'dotenv/config';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI, Type } from '@google/genai';
import { SolarCalculator } from '../solar_engine';

const solarCalc = new SolarCalculator();

// Helper to fetch dynamic AI config
export function getAIConfig() {
  const row = db.prepare("SELECT value_json FROM global_settings WHERE key_name = 'ai_config'").get() as any;
  return row ? JSON.parse(row.value_json) : { apiKey: process.env.GEMINI_API_KEY || '', model: 'gemini-2.5-flash' };
}

// Helper to instantiate client dynamically
export function getAIClient() {
  const config = getAIConfig();
  if (!config.apiKey) throw new Error("API Key is not configured. Please set it in the AI Settings.");
  return { client: new GoogleGenAI({ apiKey: config.apiKey }), model: config.model || 'gemini-2.5-flash' };
}

// ═══════════════════════════════════════════════════════════════
// 1. PERSONA CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════

export type PersonaConfig = {
  id: 'engineer' | 'sales' | 'beginner';
  systemPromptTemplate: string;
  temperature: number;
  maxOutputTokens: number;
  allowedTools: string[];
  responseStyle: 'structured' | 'narrative';
};

export const PERSONAS: Record<string, PersonaConfig> = {
  engineer: {
    id: 'engineer',
    systemPromptTemplate:
      'أنت مهندس طاقة شمسية محترف وسعرك في السوق العراقي. ' +
      'عندما يسأل العميل عن "كم أمبير تشغل المنظومة؟"، يجب أن تستخدم أداة calculate_amper_quote لحسابها مباشرة وتقديم التكلفة الجملة والمفرد بالدولار أو الدينار بناءً على الخيارات. ' +
      'تحدث لغة تقنية صحيحة لكن تعامل بمرونة مع مصطلح "الأمبيرات" الشائع في العراق.',
    temperature: 0.2, // low temp for precision
    maxOutputTokens: 2000,
    allowedTools: ['all'],
    responseStyle: 'structured'
  },
  sales: {
    id: 'sales',
    systemPromptTemplate:
      'أنت مستشار مبيعات طاقة شمسية في العراق ذو خبرة. ' +
      'تعامل ببساطة مع العميل. إذا طلب العميل منظومة لتشغيل عدد معين من الأمبيرات (مثلاً "أريد منظومة 10 أمبير")، استخدم أداة calculate_amper_quote فوراً للإجابة بالتكلفة الكلية (الجملة والمفرد). ' +
      'اعتمد دائماً في الأسعار على البيانات التي يتم تزويدك بها كمعلومات مسبقة.',
    temperature: 0.6,
    maxOutputTokens: 1500,
    allowedTools: ['calculate_amper_quote', 'calculate_roi', 'lookup_product_specs'],
    responseStyle: 'narrative'
  },
  beginner: {
    id: 'beginner',
    systemPromptTemplate:
      'أنت معلم صبور يشرح أساسيات الطاقة الشمسية في العراق. اشرح للعميل كيف نحول الأمبير إلى واط، وكيف تقاس المنظومات بالشمس العراقية (5 ساعات عادة). ' +
      'استخدم أداة calculate_amper_quote لإعطائه أمثلة عملية حول التكلفة.',
    temperature: 0.4,
    maxOutputTokens: 1000,
    allowedTools: ['calculate_amper_quote', 'calculate_full_system'],
    responseStyle: 'narrative'
  }
};


// ═══════════════════════════════════════════════════════════════
// 2. IN-MEMORY EMBEDDING CACHE
// ═══════════════════════════════════════════════════════════════

class EmbeddingCache {
  private cache: Map<string, { source_id: string, text: string, embedding: Float32Array }> = new Map();

  initialize() {
    console.log('🔄 Loading AI embeddings into memory...');
    const chunks = db.prepare('SELECT id, source_id, chunk_text, embedding FROM ai_knowledge_chunks').all() as any[];

    for (const chunk of chunks) {
      if (chunk.embedding) {
        try {
          const arr = new Float32Array(JSON.parse(chunk.embedding));
          this.cache.set(chunk.id, {
            source_id: chunk.source_id,
            text: chunk.chunk_text,
            embedding: arr
          });
        } catch (e) {
          console.error(`Failed to parse embedding for chunk ${chunk.id}`);
        }
      }
    }
    console.log(`✅ Loaded ${this.cache.size} chunks into memory cache.`);
  }

  // Cosine similarity
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async findSimilar(queryEmbedding: number[], topK: number = 5, threshold: number = 0.5) {
    const queryArr = new Float32Array(queryEmbedding);
    const results: Array<{ id: string, text: string, score: number }> = [];

    for (const [id, data] of this.cache.entries()) {
      const score = this.cosineSimilarity(queryArr, data.embedding);
      if (score > threshold) {
        results.push({ id, text: data.text, score });
      }
    }

    // Sort by descending score and take topK
    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  add(id: string, source_id: string, text: string, embeddingVector: number[]) {
    this.cache.set(id, {
      source_id,
      text,
      embedding: new Float32Array(embeddingVector)
    });
  }

  removeBySource(source_id: string) {
    for (const [id, data] of this.cache.entries()) {
      if (data.source_id === source_id) {
        this.cache.delete(id);
      }
    }
  }
}

export const embeddingCache = new EmbeddingCache();
// Initialize cache on service load
try {
  embeddingCache.initialize();
} catch (e) {
  console.error("Failed to init embedding cache", e);
}


// ═══════════════════════════════════════════════════════════════
// 3. GEMINI FUNCTION CALLING (TOOLS)
// ═══════════════════════════════════════════════════════════════

const tools = [{
  functionDeclarations: [
    {
      name: "calculate_amper_quote",
      description: "Calculates system requirements and wholesale/retail pricing using the Iraqi Amper standard (e.g. 10 Amps, 20 Amps).",
      parameters: {
        type: Type.OBJECT,
        properties: {
          amps: { type: Type.NUMBER, description: "Requested loads in Amperes (e.g., 10, 15, 20)" },
          sun_hours: { type: Type.NUMBER, description: "Region specific sun hours (default 5.0 for Iraq)" }
        },
        required: ["amps"]
      }
    },
    {
      name: "calculate_full_system",
      description: "Calculates required battery and solar panel capacities for an off-grid or hybrid system given specific load items.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          load_kw: { type: Type.NUMBER, description: "Total average load in kilowatts" },
          hours_per_day: { type: Type.NUMBER, description: "Average hours the load runs per day" },
          system_voltage: { type: Type.NUMBER, description: "System voltage (12, 24, or 48)" },
          sun_hours: { type: Type.NUMBER, description: "Peak sun hours per day" }
        },
        required: ["load_kw", "hours_per_day", "system_voltage"]
      }
    },
    {
      name: "calculate_cable_loss",
      description: "Calculates voltage drop and power loss in cables.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          current_amps: { type: Type.NUMBER, description: "Current in Amperes" },
          cable_length_m: { type: Type.NUMBER, description: "Length of cable in meters (one way)" },
          cable_gauge_mm2: { type: Type.NUMBER, description: "Cross sectional area of cable in mm²" },
          system_voltage: { type: Type.NUMBER, description: "System DC voltage" }
        },
        required: ["current_amps", "cable_length_m", "cable_gauge_mm2", "system_voltage"]
      }
    },
    {
      name: "calculate_roi",
      description: "Calculates return on investment (ROI) and payback period.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          total_system_cost_iqd: { type: Type.NUMBER, description: "Total initial cost of system in Iraqi Dinars" },
          monthly_grid_bill_iqd: { type: Type.NUMBER, description: "Current monthly electricity bill in Iraqi Dinars" }
        },
        required: ["total_system_cost_iqd", "monthly_grid_bill_iqd"]
      }
    },
    {
      name: "calculate_max_panels_for_area",
      description: "Calculates the maximum number of solar panels that can fit in a given rooftop area and estimates the total peak system power (kWp).",
      parameters: {
        type: Type.OBJECT,
        properties: {
          area_sqm: { type: Type.NUMBER, description: "Total available rooftop area in square meters" },
          panel_wattage: { type: Type.NUMBER, description: "Wattage of a single solar panel (e.g., 550, 600) (default 550)" }
        },
        required: ["area_sqm"]
      }
    }
  ]
}];


// ═══════════════════════════════════════════════════════════════
// 4. USAGE ANALYTICS & GUARDRAILS
// ═══════════════════════════════════════════════════════════════

class UsageTracker {
  static log(
    sessionId: string,
    ip: string,
    inputTokens: number,
    outputTokens: number,
    embedTokens: number,
    responseTimeMs: number,
    toolCalled?: string
  ) {
    // Current typical Gemini prices: 
    // Input: $0.15 / 1M tokens ($0.00015/1k)
    // Output: $0.60 / 1M tokens ($0.0006/1k)
    // Embed: $0.00 / 1M (essentially free currently but let's assign a micro-cost)
    const costUsd = ((inputTokens * 0.15) / 1000000) + ((outputTokens * 0.6) / 1000000);

    db.prepare(`
      INSERT INTO ai_usage_logs
                        (id, session_id, input_tokens, output_tokens, embedding_tokens, cost_estimate_usd, response_time_ms, tool_called, ip_address)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `).run(
      uuidv4(),
      sessionId,
      inputTokens,
      outputTokens,
      embedTokens,
      costUsd,
      responseTimeMs,
      toolCalled || null,
      ip
    );
  }
}

class InputGuardrails {
  static normalize(text: string): string {
    // Convert Arabic numerals to English numerals
    const arabicToEngRegex = /[٠-٩]/g;
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    let normalized = text.replace(arabicToEngRegex, (c) => arabicNumbers.indexOf(c).toString());

    // Normalize spelling of kW and W for Iraqi terms
    normalized = normalized.replace(/(كيلو\s*واط|كيلوواط)/g, ' kW ');
    normalized = normalized.replace(/(واط)/g, ' W ');
    normalized = normalized.replace(/(امبير|أمبير)/g, ' A ');
    normalized = normalized.replace(/(فولت)/g, ' V ');

    // Normalize case of kw -> kW
    normalized = normalized.replace(/\b([0-9\.]+)\s*kw\b/gi, '$1 kW');
    normalized = normalized.replace(/\b([0-9\.]+)\s*w\b/gi, '$1 W');

    return normalized;
  }
}


// ═══════════════════════════════════════════════════════════════
// 5. MAIN AI SERVICE
// ═══════════════════════════════════════════════════════════════

export class AIService {

  // --- Chunks & Embeddings ---
  static async chunkAndEmbedKnowledge(sourceId: string, text: string) {
    // 1. Chunking logic (simple overlap for now)
    const MAX_CHUNK_LENGTH = 1000;
    const OVERLAP = 200;
    const chunks: string[] = [];

    let i = 0;
    while (i < text.length) {
      chunks.push(text.slice(i, i + MAX_CHUNK_LENGTH));
      i += (MAX_CHUNK_LENGTH - OVERLAP);
    }

    // 2. Generate embeddings via Gemini API
    console.log(`Generating embeddings for ${chunks.length} chunks...`);
    const stmt = db.prepare('INSERT INTO ai_knowledge_chunks (id, source_id, chunk_text, chunk_index, embedding) VALUES (?, ?, ?, ?, ?)');

    let chunkIndex = 0;
    for (const chunk of chunks) {
      const { client } = getAIClient();
      // Using newer model for embeddings
      const response = await client.models.embedContent({
        model: 'text-embedding-004',
        contents: chunk,
      });

      const embeddingVector = response.embeddings?.[0]?.values;
      if (embeddingVector) {
        const id = uuidv4();
        // Save to DB
        stmt.run(id, sourceId, chunk, chunkIndex, JSON.stringify(embeddingVector));
        // Add to active memory cache
        embeddingCache.add(id, sourceId, chunk, embeddingVector);
        chunkIndex++;
      }
    }

    db.prepare('UPDATE ai_knowledge_sources SET chunks_count = ? WHERE id = ?').run(chunkIndex, sourceId);
    return chunkIndex;
  }


  // --- Chat Orchestration ---
  static async processChat(sessionId: string, userMessage: string, personaId: string, ipAddress: string) {
    const startTime = Date.now();
    const aiConfig = getAIClient();
    const aiClient = aiConfig.client;
    const aiModel = aiConfig.model;

    // 1. Normalize Input (Guardrails)
    const normalizedInput = InputGuardrails.normalize(userMessage);

    // 2. Persona Setup
    const persona = PERSONAS[personaId] || PERSONAS['engineer'];

    // 3. RAG: Retrieve context if needed (embed query and find similar)
    let contextStr = '';
    let embedTokens = 0;
    try {
      const queryEmbedRes = await aiClient.models.embedContent({
        model: 'text-embedding-004',
        contents: normalizedInput,
      });
      const queryVector = queryEmbedRes.embeddings?.[0]?.values;
      if (queryVector) {
        embedTokens = 10; // estimate for simple query
        const similarChunks = await embeddingCache.findSimilar(queryVector, 3, 0.5);
        if (similarChunks.length > 0) {
          contextStr = "\n\n--- مراجع من قاعدة المعرفة للشركة ---\n(يجب عليك الاعتماد على هذه المراجع للإجابة على سؤال المستخدم إذا كان السؤال يخصها المراجع، ولا تقدم أي أسعار أو سياسات تتعارض معها)\n\n" + similarChunks.map(c => c.text).join("\n\n");
        }
      }
    } catch (e) {
      console.error("RAG retrieval failed, proceeding without context", e);
    }

    // 4. Session History Management
    let session = db.prepare('SELECT * FROM ai_chat_sessions WHERE id = ?').get(sessionId) as any;
    let messages: any[] = [];

    if (!session) {
      // Fetch dynamic system prompt from settings if it exists, otherwise use persona base
      const globalPromptRow = db.prepare("SELECT value_json FROM global_settings WHERE key_name = 'ai_system_prompt'").get() as any;
      let sysPrompt = persona.systemPromptTemplate;
      if (globalPromptRow?.value_json) {
        sysPrompt += "\n" + JSON.parse(globalPromptRow.value_json);
      }

      // Inject market context into prompt directly so AI can quote offhand (without triggering tool unnecessarily)
      try {
        const panels = db.prepare("SELECT model, cost_price, retail_price FROM components WHERE category = 'panel' LIMIT 3").all() as any[];
        const batteries = db.prepare("SELECT model, cost_price, retail_price FROM components WHERE category = 'battery' LIMIT 3").all() as any[];
        const inverters = db.prepare("SELECT model, cost_price, retail_price FROM components WHERE category = 'inverter' LIMIT 3").all() as any[];

        let pricingContext = "\n\n=== Market Pricing Context ===\n";
        pricingContext += "أمثلة لأسعار الألواح:\n" + panels.map(p => `- ${p.model}: كلفة ${p.cost_price}$ / مبيع ${p.retail_price || Math.round(p.cost_price * 1.3)}$`).join("\n") + "\n";
        pricingContext += "أمثلة لأسعار البطاريات:\n" + batteries.map(p => `- ${p.model}: كلفة ${p.cost_price}$ / مبيع ${p.retail_price || Math.round(p.cost_price * 1.3)}$`).join("\n") + "\n";
        pricingContext += "أمثلة لأسعار الانفرترات:\n" + inverters.map(p => `- ${p.model}: كلفة ${p.cost_price}$ / مبيع ${p.retail_price || Math.round(p.cost_price * 1.3)}$`).join("\n") + "\n";

        sysPrompt += pricingContext;
      } catch (e) {
        console.error("Failed to inject pricing context into AI prompt", e);
      }

      session = { id: sessionId, messages: JSON.stringify([]), persona: personaId };
      db.prepare('INSERT INTO ai_chat_sessions (id, messages, persona) VALUES (?, ?, ?)')
        .run(sessionId, JSON.stringify([{ role: "system", content: sysPrompt }]), personaId);

      messages = [{ role: "system", content: sysPrompt }];
    } else {
      messages = JSON.parse(session.messages);
    }

    // Add new user message with context if found
    const promptWithContext = normalizedInput + contextStr;
    messages.push({ role: "user", content: promptWithContext });

    // Map internal history format to Gemini format (user vs model)
    const geminiHistory = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // Find system message to pass to systemInstruction
    const systemMsg = messages.find(m => m.role === 'system')?.content || persona.systemPromptTemplate;

    // 5. Call Gemini API (with tools)
    let toolCalledStr = '';
    let response;
    try {
      response = await aiClient.models.generateContent({
        model: aiModel,
        contents: geminiHistory,
        config: {
          systemInstruction: systemMsg,
          temperature: persona.temperature,
          maxOutputTokens: persona.maxOutputTokens,
          tools: persona.allowedTools.includes('all') || persona.allowedTools.length > 0
            ? tools
            : undefined
        }
      });

    } catch (apiError: any) {
      console.error("Gemini API Error details:", apiError);
      if (apiError.status === 429) {
        throw new Error(`نفد رصيد الاستخدام المجاني لنموذج ${aiModel}.\nيرجى فتح الإعدادات واختيار نموذج (Gemini 2.5 Flash) لتجاوز هذه المشكلة أو المحاولة لاحقاً.`);
      }
      if (apiError.status === 404) {
        throw new Error(`النموذج ${aiModel} غير متاح في منطقتك أو المفتاح غير صالح. يرجى التبديل إلى (Gemini 2.5 Flash).`);
      }
      throw new Error(apiError.message || "حدث خطأ غير معروف أثناء الاتصال بمحرك الذكاء الاصطناعي.");
    }

    // 6. Check for Tool Invocation
    if (response.functionCalls && response.functionCalls.length > 0) {
      const fnCall = response.functionCalls[0];
      toolCalledStr = fnCall.name;
      console.log(`🛠️ AI requested tool execution: ${fnCall.name}`, fnCall.args);

      let toolResultStr = '';
      try {
        if (fnCall.name === 'calculate_max_panels_for_area') {
          const args = fnCall.args as any;
          const area = args.area_sqm;
          // A typical 550W panel is roughly 2.3 sqm to 2.6 sqm dimensions. We'll use 2.5 sqm per panel to account for spacing.
          const sqmPerPanel = 2.5;
          const panelW = args.panel_wattage || 550;

          const maxPanels = Math.floor(area / sqmPerPanel);
          const totalSystemPowerKw = (maxPanels * panelW) / 1000;

          toolResultStr = `لقد قمت بحساب المساحة (${area} متر مربع). بافتراض أن كل لوح بياخذ تقريباً مساحة 2.5 متر مربع للتهوية والصيانة، فإن أقصى عدد للألواح التي يمكنك تركيبها هو ${maxPanels} لوح.\n\nبافتراض أن قدرة اللوح الواحد ${panelW} واط، فإن القدرة الإجمالية القصوى لمنظومتك (System Peak Power) تصل إلى ${totalSystemPowerKw.toFixed(1)} كيلو واط (kWp).`;
        } else if (fnCall.name === 'calculate_full_system') {
          // Map inputs to SolarEngine formats
          const args = fnCall.args as any;
          const config = {
            system_type: 'OFF_GRID' as any,
            system_voltage: args.system_voltage || 48,
            sun_hours: args.sun_hours || 5, // typical iraq averge
            autonomy_hours: 12,
            dod: 0.8,
            battery_efficiency: 0.95,
            temp_correction: 1,
            future_expansion: 1,
            losses: { cable_loss: 0.02, temp_derating: 0.05, dust_factor: 0.05, inverter_efficiency: 0.95 }
          };

          const profile = solarCalc.calculateLoadProfile([
            { name: "Generic Load", watts: (args.load_kw || 1) * 1000, hours_daily: args.hours_per_day || 24, qty: 1, surge_factor: 1, usage_period: 'both' }
          ], 1, config.losses, config.sun_hours);

          const battRes = solarCalc.calculateBattery({ ...config, system_type: 'OFF_GRID' }, profile);
          const solRes = solarCalc.calculateSolar({ ...config, system_type: 'OFF_GRID' }, profile);

          toolResultStr = JSON.stringify({
            load_profile: profile,
            battery: battRes,
            solar: solRes
          });
        }
        else if (fnCall.name === 'calculate_amper_quote') {
          // Send request directly to internal local API or call engine functions manually.
          // Because generating a full quote from Amper needs DB access and generateQuoteHelper is in server.ts
          // We will fetch URL internally:
          const args = fnCall.args as any;
          try {
            // To avoid circular imports between server.ts and aiService, we will call the local endpoint
            const http = require('http');
            const data = JSON.stringify({ amps: args.amps, sun_hours: args.sun_hours || 5.0 });
            toolResultStr = await new Promise((resolve, reject) => {
              const req = http.request({
                hostname: 'localhost',
                port: 3000,
                path: '/api/amper-quote',
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
              }, (res: any) => {
                let body = '';
                res.on('data', (d: any) => body += d);
                res.on('end', () => resolve(body));
              });
              req.on('error', reject);
              req.write(data);
              req.end();
            });
          } catch (e: any) {
            toolResultStr = JSON.stringify({ error: "Failed to generate amper quote via internal API: " + e.message });
          }
        }
        else if (fnCall.name === 'calculate_cable_loss') {
          const args = fnCall.args as any;
          const result = solarCalc.calculateCableLoss({
            current_amps: args.current_amps,
            cable_length_m: args.cable_length_m,
            cable_gauge_mm2: args.cable_gauge_mm2,
            system_voltage: args.system_voltage,
            material: 'copper'
          });
          toolResultStr = JSON.stringify(result);
        }
        else if (fnCall.name === 'calculate_roi') {
          const args = fnCall.args as any;
          // generic approx
          const result = solarCalc.calculateROI({
            total_system_cost_iqd: args.total_system_cost_iqd,
            monthly_grid_bill_iqd: args.monthly_grid_bill_iqd,
            grid_coverage_percent: 100,
            annual_degradation: 0.005,
            annual_maintenance_cost_iqd: 50000,
            system_lifetime_years: 15,
            electricity_inflation_rate: 0
          });
          toolResultStr = JSON.stringify(result);
        }
        else {
          toolResultStr = JSON.stringify({ error: "Tool not supported or not implemented yet." });
        }
      } catch (err: any) {
        toolResultStr = JSON.stringify({ error: err.message });
      }

      // Send the tool result back to Gemini to formulate final response
      try {
        const followUpResponse = await aiClient.models.generateContent({
          model: aiModel,
          contents: [
            ...geminiHistory,
            {
              role: 'model',
              parts: [{ functionCall: fnCall }]
            },
            {
              role: 'user',
              parts: [{
                functionResponse: {
                  name: fnCall.name,
                  response: { result: toolResultStr }
                }
              }]
            }
          ],
          config: { systemInstruction: systemMsg, temperature: persona.temperature }
        });

        const responseText = followUpResponse.text || "عفواً، لم أتمكن من الحصول على الإجابة.";
        this.finishTurn(sessionId, messages, userMessage, responseText, ipAddress, followUpResponse.usageMetadata, embedTokens, startTime, toolCalledStr);
        return responseText;
      } catch (postToolError: any) {
        throw new Error("حدث خطأ في قراءة رد المساعد بعد استدعاء الدوال.");
      }
    }

    // 7. Normal Response (No tool called)
    const responseText = response.text || "عفواً، واجهت خطأ في الإجابة.";
    this.finishTurn(sessionId, messages, userMessage, responseText, ipAddress, response.usageMetadata, embedTokens, startTime);
    return responseText;
  }

  private static finishTurn(sessionId: string, messages: any[], userMessage: string, aiText: string, ip: string, usage: any, embedTok: number, startTime: number, tool?: string) {
    // Append to internal DB history
    messages.push({ role: 'assistant', content: aiText });

    // Prune history (keep last 20 + system prompt)
    if (messages.length > 21) {
      messages = [messages[0], ...messages.slice(messages.length - 20)];
    }

    db.prepare('UPDATE ai_chat_sessions SET messages = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(messages), sessionId);

    // Track usage
    const inTok = usage?.promptTokenCount || 0;
    const outTok = usage?.candidatesTokenCount || 0;
    UsageTracker.log(sessionId, ip, inTok, outTok, embedTok, Date.now() - startTime, tool);
  }
}
