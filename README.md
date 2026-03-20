# AI Chaatwala (ChaatwalaGPT) 🍢

A deeply personalized, interactive AI companion dedicated to Indian street food. Built with **Next.js 14**, **Groq (Llama 3 70B)**, and a heavy dose of Hinglish street-vendor personality.

## The Vision: More Than Just a Chatbot
The market is saturated with generic, boring chatbots that just give text walls. **AI Chaatwala** is built as an experiential product: 

- **A Strong Persona**: It doesn't sound like AI. It sounds like *Bhaiya* at the corner stall. It uses Hinglish, calls you "bhai", and acts incredibly passionate about food.
- **Visual Craving Interface**: Instead of staring at an empty chat window, you are greeted with a beautiful "What are you craving today?" landing screen with custom graphic chips (Pani Puri, Bhel Puri, Surprise Me).
- **Fast Quick Actions**: Users don't like typing on mobile. Action chips (`🔥 Make it spicy`, `💸 Under ₹50`) sit right above the keyboard wrapper.
- **Memory & Persistence**: Your chat history stays in LocalStorage. Chaatwala "remembers" your last order when you reopen the tab.
- **Rich Structured UI from LLM**: The generic text stream is elegantly intercepted over SSE and compiled into native HTML elements on-the-fly (`Recipe Cards`, `Combo Suggestions`, `Interactive Action Buttons`). 

---

## 🏗️ Technical Architecture & UX Decisions

### 1. The Prompt Engine & Structured Render Loop
To make the bot output *cards* instead of just *text*, the backend `system_prompt` forces the LLaMA model to use specific markdown prefixes:
- `- [INGREDIENT]` 
- `[BTN: text]` 
- `### RECIPE`

As the streaming response hits the frontend (`src/components/ChatInterface.tsx`), it gets piped through a custom lightweight regex compiler (`src/lib/markdown.ts`). 
This instantly replaces the strict generic structures with beautiful CSS classes, transforming backend prompts into frontend components dynamically:
```html
<button class="markdown-action-btn" data-prompt="Give me a spicier version">👉 Give me a spicier version</button>
<div class="recipe-card">...</div>
```

### 2. React Event Delegation for Streaming HTML
Because `dangerouslySetInnerHTML` strips React's synthetic events, clicking the AI's dynamically generated buttons usually fails. We solved this with a single delegated React `onClick` event bound to the wrapper component, making every AI-generated Action button instantly interactive without memory leaks or stale closures!

### 3. Server-Sent Events (SSE) Perf Optimization
Streaming millions of tokens per second through React State can cause massive UI jank. We built a chunk buffer combined with `requestAnimationFrame` grouping to ensure the chat window scrolls cleanly at 60fps without choking the main thread.

---

## 🚀 Getting Started

1. Clone and install dependencies:
   ```bash
   npm install
   ```
2. Grab an API key from [Groq Console](https://console.groq.com/).
3. Add the key to your `.env.local`:
   ```env
   GROQ_API_KEY=gsk_your_key_here
   ```
4. Run the Dev Server:
   ```bash
   npm run dev
   ```
**(P.S. Try asking the bot: "What's the difference between Mumbai Vada Pav and Delhi Aloo Tikki?")**

---

## Knowledge & System Personality Core
**STREET FOODS**: Pani Puri/Golgappa, Vada Pav, Pav Bhaji, Bhel Puri, Sev Puri, Dahi Puri, Chaat, Aloo Tikki, Samosa, Kachori, Jalebi, Kulfi, Lassi, Chai, Frankie/Kathi Roll, Dabeli, Misal Pav, Chole Bhature, Ragda Pattice, Momos, Egg Rolls, Biryani (street style), Kebabs (Seekh/Galouti/Reshmi), Dosa, Idli-Vada, Bonda, Bajji, Masala Corn, Sugarcane Juice, Aam Panna.

**REGIONAL EXPERTISE**: Mumbai (Juhu Beach, Dharavi), Delhi (Chandni Chowk, Paranthe Wali Gali), Kolkata (Park Street rolls, phuchka), Chennai (Marina Beach corn), Hyderabad (Ramzan specials), Lucknow (Tunday Kebabs), Amritsar (Kulcha), Ahmedabad (Rathyatra snacks).
