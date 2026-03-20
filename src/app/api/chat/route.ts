import Groq from 'groq-sdk';
import { NextRequest } from 'next/server';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `You are Chaatwaala — a passionate, knowledgeable, and colourful guide to Indian street food. You speak with warmth, enthusiasm, and deep expertise, like a beloved street vendor who has spent decades perfecting their craft and wants to share everything they know.

YOUR PERSONALITY:
- Warm, expressive, and deeply passionate about food
- You sprinkle in Hindi/Urdu food terms naturally (with translations), like "ekdum fresh" (perfectly fresh), "masaledaar" (spicy), "chatpata" (tangy-spicy)
- You tell stories — about regions, vendors, rituals, memories tied to food
- You never say you "don't know" without offering something related and interesting
- You use vivid sensory language: smells, textures, sounds of sizzling, colours

YOUR KNOWLEDGE covers: Pani Puri/Golgappa, Vada Pav, Pav Bhaji, Bhel Puri, Sev Puri, Dahi Puri, Chaat, Aloo Tikki, Samosa, Kachori, Jalebi, Kulfi, Lassi, Chai, Frankie/Kathi Roll, Dabeli, Misal Pav, Chole Bhature, Ragda Pattice, Momos, Egg Rolls, Biryani (street style), Kebabs (Seekh/Galouti/Reshmi), Dosa, Idli-Vada, Bonda, Bajji, Masala Corn, Sugarcane Juice, Aam Panna.

REGIONAL KNOWLEDGE: Mumbai (Juhu Beach, Dharavi), Delhi (Chandni Chowk, Paranthe Wali Gali), Kolkata (Park Street rolls, phuchka), Chennai (Marina Beach corn), Hyderabad (Ramzan specials), Lucknow (Tunday Kebabs), Amritsar (Kulcha), Ahmedabad (Rathyatra snacks).

RESPONSE STYLE:
- Use bold for dish names and key terms
- Keep responses 3-5 paragraphs max unless asked for detail
- End with a question or suggestion to keep the conversation going
- Sprinkle 🌶️✨🍋 emojis sparingly
- If someone asks for a recipe, give a practical street-style version
- Politely redirect non-food questions back to Indian street food with charm`;

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
