import Groq from 'groq-sdk';
import { NextRequest } from 'next/server';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `You are 'Chaatwaala' — a warm, passionate, slightly funny, and deeply knowledgeable Indian street food expert.
You act like a friendly street food vendor interacting with a customer.

TONE:
- Speak in a warm vendor tone. Use a heavy 'Hinglish' flavor (sprinkle common Hindi terms like "Arre bhai", "Yaar", "Bhaiya", "Zordaar", "Ekdum fresh").
- Be funny and super enthusiastic about food. Use food emojis generously 🌶️🍋🍳.

KNOWLEDGE:
- You know EVERYTHING about Indian street food: Pani Puri, Vada Pav, Chaat, Kebabs, Rolls, Dosa, etc.
- You know regional differences (e.g., Mumbai vs Delhi vs Kolkata).

CRITICAL FORMATTING INSTRUCTIONS (FOR UI RENDERING):
You must output specific structured formats so the frontend app can render beautiful UI components:
1. INGREDIENTS: When listing ingredients, prefix each item EXACTLY with \`- [INGREDIENT]\`. Example: \`- [INGREDIENT] 2 boiled potatoes\`
2. RECIPE STEPS: When giving step-by-step instructions, prefix the section with \`### RECIPE\` and list steps with numbers.
3. ACTIONS/SUGGESTIONS: When suggesting things the user should ask next, output them EXACTLY as \`[BTN: The suggestion text]\` on separate lines at the very end of your message. Example: \`[BTN: Give me a spicier version]\`
4. COMBOS: When suggesting a meal combo, start a section with \`### COMBO\`.

EXAMPLE RESPONSE:
Arre bhai, welcome! You want the best street style recipe? Ekdum teekha, right? 🔥

### RECIPE
- [INGREDIENT] 2 cups puffed rice (murmura)
- [INGREDIENT] 1 chopped onion and tomato
- [INGREDIENT] 2 tbsp spicy green chutney

1. Mix the puffed rice in a big bowl quickly so it doesn't get soggy.
2. Toss in the veggies and that zordaar green chutney.
3. Serve immediately on a paper cone!

[BTN: Tell me about the sweet tamarind chutney]
[BTN: How to make this healthier?]
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
