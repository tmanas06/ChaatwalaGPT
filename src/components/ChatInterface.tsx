'use client';

import { useState, useRef, useEffect, useCallback, useMemo, KeyboardEvent, FormEvent } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Message } from '@/lib/types';
import { renderMarkdown } from '@/lib/markdown';
import styles from './ChatInterface.module.css';

const FOOD_FACTS = [
  '🌶️ Chaat masala has 15+ spices',
  '🫙 Tamarind = \'imli\' in Hindi',
  '✨ Pani puri is 2000 years old',
  '🌿 Hing (asafoetida) is the secret',
  '🍋 Amchur = dried mango powder',
];

const CRAVING_CHIPS = [
  { icon: '🧆', label: 'Pani Puri' },
  { icon: '🥘', label: 'Bhel Puri' },
  { icon: '🍛', label: 'Dahi Papdi' },
  { icon: '✨', label: 'Surprise Me!' }
];

const QUICK_ACTIONS = [
  { icon: '🔥', label: 'Make it spicy', prompt: 'Give me a spicier version of that!' },
  { icon: '🧂', label: 'Less masala', prompt: 'Can you make it with less masala/spice?' },
  { icon: '🥗', label: 'Healthy version', prompt: 'How can I make a healthier version of this?' },
  { icon: '💸', label: 'Under ₹50', prompt: 'What are the best street foods under 50 rupees?' },
];

interface LanguageOption {
  code: string;
  label: string;
  nativeLabel: string;
  speechCode: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', speechCode: 'en-US' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', speechCode: 'hi-IN' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', speechCode: 'ta-IN' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', speechCode: 'te-IN' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', speechCode: 'bn-IN' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', speechCode: 'mr-IN' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', speechCode: 'gu-IN' },
  // { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', speechCode: 'kn-IN' },
  // { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം', speechCode: 'ml-IN' },
  // { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ', speechCode: 'pa-IN' },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو', speechCode: 'ur-IN' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', speechCode: 'es-ES' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', speechCode: 'fr-FR' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch', speechCode: 'de-DE' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語', speechCode: 'ja-JP' },
  // { code: 'ko', label: 'Korean', nativeLabel: '한국어', speechCode: 'ko-KR' },
  // { code: 'zh', label: 'Chinese', nativeLabel: '中文', speechCode: 'zh-CN' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', speechCode: 'ar-SA' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português', speechCode: 'pt-BR' },
  { code: 'ru', label: 'Russian', nativeLabel: 'Русский', speechCode: 'ru-RU' },
];

// Extend Window for SpeechRecognition
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export default function ChatInterface() {
  const { login, logout, authenticated, user } = usePrivy();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = useMemo(() => activeSession?.messages || [], [activeSession?.messages]);

  const updateActiveMessages = useCallback((updater: (prev: Message[]) => Message[]) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          const newMsgs = updater(s.messages);
          let title = s.title;
          if ((title === 'New Order' || title === 'Guest Chat') && newMsgs.length > 0) {
            const firstUser = newMsgs.find(m => m.role === 'user');
            if (firstUser) {
              title = firstUser.content.slice(0, 20) + (firstUser.content.length > 20 ? '...' : '');
            }
          }
          return { ...s, messages: newMsgs, title };
        }
        return s;
      })
    );
  }, [activeSessionId]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phase 5: Local Storage Memory (now authenticated)
  useEffect(() => {
    if (authenticated && user?.id) {
      const saved = localStorage.getItem(`chaatwala_sessions_${user.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.length > 0) {
            setSessions(parsed);
            setActiveSessionId(parsed[0].id);
            return;
          }
        } catch (e) {
          console.error('Failed to load chat history:', e);
        }
      }
      const initialId = generateId();
      setSessions([{ id: initialId, title: 'New Order', messages: [] }]);
      setActiveSessionId(initialId);
    } else {
      const tempId = 'temp-session';
      setSessions([{ id: tempId, title: 'Guest Chat', messages: [] }]);
      setActiveSessionId(tempId);
    }
  }, [authenticated, user?.id]);

  useEffect(() => {
    if (authenticated && user?.id && sessions.length > 0) {
      localStorage.setItem(`chaatwala_sessions_${user.id}`, JSON.stringify(sessions));
    }
  }, [sessions, authenticated, user?.id]);
  const [factIndex, setFactIndex] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>(LANGUAGES[0]);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Check speech recognition support
  useEffect(() => {
    const supported = typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    setSpeechSupported(supported);
  }, []);

  // Close language dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Rotate food facts
  useEffect(() => {
    const interval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % FOOD_FACTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-resize textarea
  const handleTextareaResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, []);

  // Voice-to-text
  const startListening = useCallback(() => {
    if (!speechSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = selectedLanguage.speechCode;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);

      // Auto-resize textarea for voice input
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
      }, 0);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone permission.');
      } else if (event.error !== 'aborted') {
        setError(`Voice recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [speechSupported, selectedLanguage]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Stop listening if active
    if (isListening) stopListening();

    setError(null);

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    updateActiveMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsStreaming(false);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const assistantId = generateId();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // Keep last 10 messages before the new user prompt to stay within LLaMA context window
      const trimmedMessages = messages.slice(-10);
      const allMessages = [...trimmedMessages, userMessage];
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          language: selectedLanguage.code,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let accumulatedContent = '';

      // Add empty assistant message placeholder
      updateActiveMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', timestamp: new Date() },
      ]);
      setIsStreaming(true);
      setIsLoading(false);

      let buffer = '';
      let rafPending = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // Keep incomplete part

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') continue; // don't break loop early, continue processing buffer if needed

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.text) {
              accumulatedContent += parsed.text;

              // Throttle React state updates using rAF
              if (!rafPending) {
                rafPending = true;
                requestAnimationFrame(() => {
                  updateActiveMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: accumulatedContent }
                        : m
                    )
                  );
                  rafPending = false;
                });
              }
            }
          } catch (e) {
            // Skip unparseable JSON chunks
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      setIsStreaming(false);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User stopped the stream — keep whatever was streamed
        setIsStreaming(false);
        setIsLoading(false);
        return;
      }

      console.error('Chat error:', err);
      setError(
        err instanceof Error && err.message !== 'Failed to fetch' 
          ? err.message 
          : 'Arre bhaiya, system garam ho gaya 😅 try again'
      );

      // Remove empty assistant message if error happened before any content
      updateActiveMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content.length > 0));
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
    setIsStreaming(false);
  };

  const dismissError = () => setError(null);

  const isEmpty = messages.length === 0;

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerLeft}>
            <span className={styles.headerEmoji}>🍢</span>
            <div className={styles.headerTitles}>
              <h1 className={styles.headerTitle}>
                <span className={styles.titleChaat}>Chaat</span>
                <span className={styles.titleGpt}>GPT</span>
              </h1>
              <span className={styles.headerSubtitle}>Indian Street Food Guide</span>
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.authWrapper}>
              {authenticated ? (
                <button className={styles.langButton} onClick={logout} title="Sign out of Chaatwaala">
                  Sign Out
                </button>
              ) : (
                <button className={styles.langButton} onClick={login} style={{ background: 'var(--saffron)', color: 'white', borderColor: 'var(--saffron)' }}>
                  Sign In to Save Chats
                </button>
              )}
            </div>
            
            {/* Language Selector */}
            <div className={styles.langSelector} ref={langDropdownRef}>
              <button
                className={styles.langButton}
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                aria-label="Select language"
                aria-expanded={isLangDropdownOpen}
              >
                <svg className={styles.langIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <span className={styles.langLabel}>{selectedLanguage.nativeLabel}</span>
                <svg className={`${styles.langChevron} ${isLangDropdownOpen ? styles.langChevronOpen : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isLangDropdownOpen && (
                <div className={styles.langDropdown}>
                  <div className={styles.langDropdownHeader}>🌐 Select Language</div>
                  <div className={styles.langDropdownScroll}>
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        className={`${styles.langOption} ${selectedLanguage.code === lang.code ? styles.langOptionActive : ''}`}
                        onClick={() => {
                          setSelectedLanguage(lang);
                          setIsLangDropdownOpen(false);
                        }}
                      >
                        <span className={styles.langOptionNative}>{lang.nativeLabel}</span>
                        <span className={styles.langOptionLabel}>{lang.label}</span>
                        {selectedLanguage.code === lang.code && (
                          <span className={styles.langCheck}>✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.tickerWrapper}>
              <span key={factIndex} className={styles.ticker}>
                {FOOD_FACTS[factIndex]}
              </span>
            </div>
            <div className={styles.statusWrapper}>
              <div className={styles.statusDot} />
              <span className={styles.statusText}>Chaatwaala is online</span>
            </div>
          </div>
        </div>
      </header>

      {/* TABS BAR */}
      {authenticated && sessions.length > 0 && (
        <div className={styles.tabBar}>
          <button 
            className={styles.newTabBtn}
            onClick={() => {
              const id = generateId();
              setSessions(prev => [{ id, title: 'New Order', messages: [] }, ...prev]);
              setActiveSessionId(id);
            }}
            title="Start new chat"
          >
            +
          </button>
          <div className={styles.tabsScroll}>
            {sessions.map(s => (
              <div 
                key={s.id} 
                className={`${styles.tab} ${s.id === activeSessionId ? styles.tabActive : ''}`}
                onClick={() => setActiveSessionId(s.id)}
              >
                <span className={styles.tabTitle}>{s.title}</span>
                {sessions.length > 1 && (
                  <button 
                    className={styles.tabClose}
                    onClick={(e) => {
                      e.stopPropagation();
                      const newSessions = sessions.filter(x => x.id !== s.id);
                      setSessions(newSessions);
                      if (activeSessionId === s.id) {
                        setActiveSessionId(newSessions[0].id);
                      }
                    }}
                    title="Close chat"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CHAT AREA */}
      <main className={styles.chatArea}>
        <div className={styles.chatInner}>
          {isEmpty ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyEmoji}>🍢</div>
              <h2 className={styles.emptyTitle}>What are you craving today?</h2>
              <p className={styles.emptySubtitle}>
                Ask Chaatwala anything about Indian street food — recipes,
                regions, history, or where to eat.
              </p>

              {/* Language badge in empty state */}
              <div className={styles.emptyLangBadge}>
                🌐 Responding in: <strong>{selectedLanguage.nativeLabel}</strong>
                {selectedLanguage.code !== 'en' && (
                  <span> ({selectedLanguage.label})</span>
                )}
              </div>

              <div className={styles.suggestionsGrid}>
                {CRAVING_CHIPS.map((chip, i) => (
                  <button
                    key={i}
                    className={styles.suggestionChip}
                    onClick={() => sendMessage(`I am craving ${chip.label}. Tell me more!`)}
                  >
                    <span className={styles.chipIcon}>{chip.icon}</span>
                    <span>{chip.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.messagesContainer}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`${styles.messageRow} ${message.role === 'user'
                    ? styles.messageRowUser
                    : styles.messageRowBot
                    }`}
                >
                  <div
                    className={`${styles.avatar} ${message.role === 'user'
                      ? styles.avatarUser
                      : styles.avatarBot
                      }`}
                  >
                    {message.role === 'user' ? '👤' : '🍢'}
                  </div>
                  <div
                    className={`${styles.messageBubble} ${message.role === 'user'
                      ? styles.bubbleUser
                      : styles.bubbleBot
                      }`}
                  >
                    {message.role === 'assistant' ? (
                      <div
                        className="markdown-content"
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.matches('.markdown-action-btn')) {
                            const prompt = target.getAttribute('data-prompt');
                            if (prompt) sendMessage(prompt);
                          }
                        }}
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdown(message.content),
                        }}
                      />
                    ) : (
                      <p>{message.content}</p>
                    )}
                    {isStreaming &&
                      message.id ===
                      messages[messages.length - 1]?.id &&
                      message.role === 'assistant' && (
                        <span className={styles.streamCursor}>|</span>
                      )}
                  </div>
                </div>
              ))}

              {isLoading && !isStreaming && (
                <div className={`${styles.messageRow} ${styles.messageRowBot}`}>
                  <div className={`${styles.avatar} ${styles.avatarBot}`}>
                    🍢
                  </div>
                  <div className={`${styles.messageBubble} ${styles.bubbleBot}`}>
                    <div className={styles.loadingDots}>
                      <span className={styles.dot} />
                      <span className={styles.dot} />
                      <span className={styles.dot} />
                    </div>
                    <span className={styles.thinkingText}>
                      Chaatwala is preparing your order… 🧑‍🍳
                    </span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* ERROR BANNER */}
      {error && (
        <div className={styles.errorBanner}>
          <span className={styles.errorIcon}>⚠️</span>
          <span className={styles.errorText}>{error}</span>
          <button className={styles.errorDismiss} onClick={dismissError}>
            ×
          </button>
        </div>
      )}

      {/* INPUT FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <form className={styles.inputForm} onSubmit={handleSubmit}>
            
            {/* Quick Actions */}
            <div className={styles.quickActions}>
              {QUICK_ACTIONS.map((action, i) => (
                <button
                  key={i}
                  type="button"
                  className={styles.quickActionBtn}
                  onClick={() => sendMessage(action.prompt)}
                  disabled={isLoading || isStreaming}
                >
                  <span>{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>

            <div className={styles.inputWrapper}>
              {/* Voice-to-text button */}
              {speechSupported && (
                <button
                  type="button"
                  className={`${styles.micButton} ${isListening ? styles.micButtonActive : ''}`}
                  onClick={toggleListening}
                  disabled={isLoading || isStreaming}
                  aria-label={isListening ? 'Stop listening' : 'Start voice input'}
                  title={`Voice input (${selectedLanguage.nativeLabel})`}
                >
                  {isListening ? (
                    // Animated listening indicator
                    <div className={styles.micListening}>
                      <div className={styles.micWave} />
                      <div className={styles.micWave} />
                      <div className={styles.micWave} />
                    </div>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  )}
                </button>
              )}

              <textarea
                ref={textareaRef}
                className={styles.textarea}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  handleTextareaResize();
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  isListening
                    ? `Listening in ${selectedLanguage.nativeLabel}...`
                    : 'Ask about pani puri, chaat masala, best food in Delhi...'
                }
                rows={1}
                disabled={isLoading || isStreaming}
              />
              {isLoading || isStreaming ? (
                <button
                  type="button"
                  className={styles.stopButton}
                  onClick={handleStop}
                  aria-label="Stop generating"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <rect x="3" y="3" width="10" height="10" rx="2" fill="currentColor" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  className={styles.sendButton}
                  disabled={!input.trim()}
                  aria-label="Send message"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              )}
            </div>
          </form>
          <p className={styles.hintText}>
            Press <kbd className={styles.kbd}>Enter</kbd> to send ·{' '}
            <kbd className={styles.kbd}>Shift+Enter</kbd> for new line
            {speechSupported && (
              <> · 🎤 Voice input available</>
            )}
          </p>
        </div>
      </footer>
    </div>
  );
}
