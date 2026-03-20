# 🍢 ChaatwalaGPT — Indian Street Food Guide

> **Meet Chaatwaala** — your passionate, deeply knowledgeable guide to Indian street food. Ask about recipes, regional specialties, spice blends, history, and the best places to eat across India.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Groq](https://img.shields.io/badge/Groq-LLaMA%203-green?style=flat-square)

---

## What is ChaatwalaGPT?

ChaatwalaGPT is a conversational AI chatbot that acts as your personal Indian street food expert. The bot's persona — **"Chaatwaala"** — is a warm, enthusiastic vendor who knows every gali (lane), masala (spice), and recipe from Mumbai's Juhu Beach to Delhi's Chandni Chowk.

### Why Indian Street Food?

Indian street food is the perfect domain for a conversational AI:

- **Rich regional depth**: Every city, every street corner has its own variation and story
- **Conversational format**: Food exploration is naturally suited to dialogue — "What else should I try?" "How do they make it?"
- **Emotional connection**: Food memories are powerful — the sizzle, the aroma, the first bite
- **Endless discovery**: From Kolkata's phuchka to Lucknow's Tunday Kebabs, there's always something new

---

## Tech Stack & Choices

| Technology | Why? |
| --- | --- |
| **Next.js 14 (App Router)** | Server-side API routes, modern React 18, excellent DX |
| **TypeScript** | Type safety across the full stack |
| **Groq SDK + LLaMA 3 70B** | Blazing fast inference (~300 tokens/sec), free tier, excellent quality |
| **SSE Streaming** | Real-time feel — responses appear word-by-word, feels alive |
| **CSS Modules** | Full aesthetic control with zero utility-class overhead |
| **Google Fonts** | Playfair Display (titles) + Kalam (handwritten feel) + DM Sans (body) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Groq API key](https://console.groq.com/) (free tier available)

### Setup

```bash
# Clone the repo
git clone https://github.com/yourusername/chaatwaala-gpt.git
cd chaatwaala-gpt

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your GROQ_API_KEY

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start chatting with Chaatwaala!

### Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Set `GROQ_API_KEY` in your Vercel project's environment variables.

---

## Features

- 🍢 **Chaatwaala Persona**: Warm, knowledgeable AI that speaks with Hindi food terms and vivid sensory language
- ⚡ **Real-time Streaming**: Responses stream in word-by-word via SSE
- 🎨 **Beautiful UI**: Saffron/turmeric color palette, animated header, suggestion chips
- 📱 **Fully Responsive**: Works beautifully on desktop and mobile
- 🌶️ **Food Facts Ticker**: Rotating fun facts in the header
- 💬 **Smart Suggestions**: Quick-start conversation topics
- 🛑 **Stop Generation**: Abort streaming and keep partial responses
- 📝 **Markdown Support**: Bot responses render bold, italic, lists, and code

---

## Project Structure

```
src/
├── app/
│   ├── api/chat/route.ts       ← Groq streaming endpoint
│   ├── globals.css             ← CSS variables, fonts, animations
│   ├── layout.tsx              ← Root layout with SEO metadata
│   └── page.tsx                ← Renders ChatInterface
├── components/
│   ├── ChatInterface.tsx       ← Full chat UI component
│   └── ChatInterface.module.css
└── lib/
    ├── types.ts                ← Message type definition
    └── markdown.ts             ← Lightweight markdown renderer
```

