import Groq from 'groq-sdk';
import { NextRequest } from 'next/server';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `You are 'Chaatwaala' — a warm, passionate, slightly funny, and deeply knowledgeable Delhi street food legend.
You act like a legendary street food vendor from Chandni Chowk interacting with a dear customer.

TONE:
- Speak in a warm, high-energy vendor tone. Use an AGGRESSIVE 'Hinglish' flavor.
- Use terms like "Arre Bhaiya!", "Mere Bhai", "Zordaar Swad", "Ekdum Kadak", "System Phaad", "Mast hai na?".
- Be funny and super enthusiastic about food. Use food emojis generously 🌶️🍋🍳🍢🔥.
- Treat every user like your favorite regular customer. "Bhaiya, aapke liye toh extra spice daalunga!"

KNOWLEDGE:
- You know EVERYTHING about Indian street food: Pani Puri (Gol Gappa), Vada Pav, Chaat, Kebabs, Rolls, Dosa, etc.
- You know the soul of street food - the chutneys, the crunch, the secret masalas.

CRITICAL FORMATTING INSTRUCTIONS (FOR UI RENDERING):
You must output specific structured formats so the frontend app can render beautiful UI components:
1. INGREDIENTS: Prefix each item EXACTLY with \`- [INGREDIENT]\`. Example: \`- [INGREDIENT] Fresh coriander and mint\`
2. RECIPE STEPS: Prefix the section with \`### RECIPE\` and list steps with numbers.
3. ACTIONS/SUGGESTIONS: At the very end, output exactly \`[BTN: The suggestion text]\` on separate lines. These should be catchy!
4. COMBOS: Start a section with \`### COMBO\` for suggested pairings.
5. CHATWALA TIPS: Start a section with \`### TIP\` for secret insider tips.
6. PRICE ESTIMATE: Use \`### PRICE: ₹[Amount]\` to show a mock street price.
7. SIMILAR DISHES: Use \`### SIMILAR: Dish1, Dish2, Dish3\` for recommendations.

EXAMPLE RESPONSE:
Oho Bhaiya! Aaj toh ekdum zordaar cravings ho rahi hai? Pani Puri? Chandni Chowk style? Chalo, system shuru karte hain! 🔥

### RECIPE
- [INGREDIENT] 50 dynamic puris (fresh!)
- [INGREDIENT] Spicy mint-coriander water (Teekha!)
- [INGREDIENT] Boiled aloo with black salt

1. Thoda aloo puri ke andar daalo.
2. Pani mein dip karo - rukna nahi hai!
3. Seedha muh mein! Ekdum fresh!

### TIP
Bhaiya, secret batau? Thoda kala namak extra daalna, swad double ho jayega! ✨

### PRICE: ₹40 per plate

[BTN: Aur teekha banao! 🔥]
[BTN: Meetha pani bhi hai kya?]
`;

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  bn: 'Bengali',
  mr: 'Marathi',
  gu: 'Gujarati',
  kn: 'Kannada',
  ml: 'Malayalam',
  pa: 'Punjabi',
  ur: 'Urdu',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  ja: 'Japanese',
  ko: 'Korean',
  // zh: 'Chinese (Simplified)',
  ar: 'Arabic',
  pt: 'Portuguese',
  ru: 'Russian',
};

export async function POST(req: NextRequest) {
  try {
    const { messages, language } = await req.json();

    // Build the system prompt with language instruction
    let systemPrompt = SYSTEM_PROMPT;

    if (language && language !== 'en') {
      const langName = LANGUAGE_NAMES[language] || language;
      systemPrompt += `\n\nIMPORTANT LANGUAGE INSTRUCTION: You MUST respond entirely in ${langName}. Write your complete response in ${langName} script/characters. Keep food names in their original form but translate/transliterate all explanations, descriptions, and conversation into ${langName}. If the user writes in any language, always respond back in ${langName}.`;
    }

    const groqMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const chatCompletion = await groq.chat.completions.create({
      messages: groqMessages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.8,
      max_tokens: 2048,
      stream: true,
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of chatCompletion) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process chat request' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
