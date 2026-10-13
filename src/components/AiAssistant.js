import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Bot, Send, X, Trash2, Sparkles } from 'lucide-react';
import { AI_URL } from '../redux/Utils/constants';
import { apiConnector } from '../redux/Utils/apiConnector';
import { Link } from 'react-router-dom';

// Simple lightweight markdown parser for AI messages
const MarkdownMessage = ({ content }) => {
  if (!content) return null;

  // Split by code blocks or lines
  const lines = content.split('\n');
  const elements = [];
  let tableRows = [];
  let inTable = false;

  const flushTable = (key) => {
    if (tableRows.length === 0) return null;
    const headerRow = tableRows[0];
    const dataRows = tableRows.slice(2); // Skip separator row

    const parseCells = (row) =>
      row
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim());

    const headers = parseCells(headerRow);

    const tbl = (
      <div key={`table-${key}`} className="my-2.5 overflow-x-auto rounded-xl border border-white/10 bg-black/40">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/5 border-b border-white/10 text-zinc-300 font-semibold font-mono">
            <tr>
              {headers.map((h, idx) => (
                <th key={idx} className="py-2 px-3">
                  {formatInline(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono text-[11px] text-zinc-300">
            {dataRows.map((r, rIdx) => (
              <tr key={rIdx} className="hover:bg-white/[0.02]">
                {parseCells(r).map((cell, cIdx) => (
                  <td key={cIdx} className="py-2 px-3">
                    {formatInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
    return tbl;
  };

  const formatInline = (text) => {
    if (!text) return text;

    // Handle Markdown Links [label](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    let lastIndex = 0;

    const tokens = [];
    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({ type: 'text', val: text.substring(lastIndex, match.index) });
      }
      tokens.push({ type: 'link', text: match[1], url: match[2] });
      lastIndex = linkRegex.lastIndex;
    }
    if (lastIndex < text.length) {
      tokens.push({ type: 'text', val: text.substring(lastIndex) });
    }

    return tokens.map((tok, tIdx) => {
      if (tok.type === 'link') {
        const isInternal = tok.url.startsWith('/');
        if (isInternal) {
          return (
            <Link key={tIdx} to={tok.url} className="text-primary underline hover:text-amber-300 font-semibold">
              {tok.text}
            </Link>
          );
        }
        return (
          <a key={tIdx} href={tok.url} target="_blank" rel="noreferrer" className="text-primary underline hover:text-amber-300">
            {tok.text}
          </a>
        );
      }

      // Format bold and backticks inside text
      const subTokens = tok.val.split(/(\*\*.*?\*\*|`.*?`)/g);
      return subTokens.map((st, stIdx) => {
        if (st.startsWith('**') && st.endsWith('**')) {
          return <strong key={stIdx} className="text-white font-bold">{st.slice(2, -2)}</strong>;
        }
        if (st.startsWith('`') && st.endsWith('`')) {
          return (
            <code key={stIdx} className="px-1.5 py-0.5 rounded bg-white/10 text-primary text-[11px] font-mono">
              {st.slice(1, -1)}
            </code>
          );
        }
        return st;
      });
    });
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Check table row
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      tableRows.push(trimmed);
      return;
    }

    if (inTable) {
      elements.push(flushTable(idx));
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={idx} className="text-sm font-bold text-primary mt-2 mb-1 flex items-center gap-1.5">
          {formatInline(trimmed.replace('### ', ''))}
        </h3>
      );
    } else if (trimmed.startsWith('#### ')) {
      elements.push(
        <h4 key={idx} className="text-xs font-bold text-zinc-200 mt-2 mb-1">
          {formatInline(trimmed.replace('#### ', ''))}
        </h4>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <li key={idx} className="ml-4 list-disc text-xs text-zinc-300 my-0.5 leading-relaxed">
          {formatInline(trimmed.substring(2))}
        </li>
      );
    } else if (trimmed.length === 0) {
      elements.push(<div key={idx} className="h-1.5" />);
    } else {
      elements.push(
        <p key={idx} className="text-xs text-zinc-300 leading-relaxed">
          {formatInline(trimmed)}
        </p>
      );
    }
  });

  if (inTable) {
    elements.push(flushTable(lines.length));
  }

  return <div className="space-y-1">{elements}</div>;
};

export const AiAssistant = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        '👋 **Hello! I am your AGPL Factory Copilot.**\n\nI have live, real-time access to your databases across:\n- 📋 **Production Orders & Daily Plans**\n- 🍲 **Kitchen Cooking Yields & Filling Records**\n- 📦 **Pouch Stock Ledgers & Balances**\n- 🌾 **Raw Material Inventory & Shortages**\n- 🚢 **Export Container Manifests**\n\nI am dynamically learning from your instructions. Ask me anything or give me a correction!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [learnedCount, setLearnedCount] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch dynamic suggestions & memory count on open
  useEffect(() => {
    async function loadDynamicContext() {
      try {
        const res = await apiConnector(`${AI_URL}/suggestions`, 'GET');
        if (res.data?.success && res.data.suggestions?.length) {
          setSuggestions(res.data.suggestions);
        }
        const statsRes = await apiConnector(`${AI_URL}/quick-stats`, 'GET');
        if (statsRes.data?.success) {
          setLearnedCount(statsRes.data.stats?.activeLearnedRules || 0);
        }
      } catch (e) {
        console.error('Failed to load dynamic suggestions:', e);
      }
    }
    if (isOpen) {
      loadDynamicContext();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg = {
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await apiConnector(`${AI_URL}/chat`, 'POST', {
        query,
        history: messages.slice(-6)
      });

      if (res.data?.success) {
        const assistantMsg = {
          role: 'assistant',
          content: res.data.answer,
          intent: res.data.intent,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, assistantMsg]);
        if (res.data.suggestions && res.data.suggestions.length) {
          setSuggestions(res.data.suggestions);
        }
        if (typeof res.data.learnedRulesApplied === 'number') {
          setLearnedCount(res.data.learnedRulesApplied);
        }
      } else {
        throw new Error(res.data?.message || 'Error processing response');
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ **System Notice**: Unable to complete query right now. Please verify the backend service is running and try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: '🧹 Chat cleared. Ready for your questions on production, inventory, recipes, or containers!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="fixed top-16 sm:top-20 right-2 sm:right-6 z-50 w-[calc(100vw-1rem)] sm:w-[480px] max-w-[96vw] h-[min(600px,calc(100vh-6rem))] flex flex-col bg-[#0b0b0e] border border-white/15 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-2xl text-white"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#121216] border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">AGPL Copilot</h3>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Live DB
              </span>
              <button
                type="button"
                onClick={() => handleSend("What have you learned so far?")}
                title="View AI learned rules & memory"
                className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 transition-all flex items-center gap-1"
              >
                🧠 Memory ({learnedCount})
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">Factory Operations & Self-Learning AI</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={clearChat}
            title="Clear Chat History"
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-xs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            title="Close Assistant"
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dynamic Suggestions Bar */}
      <div className="px-4 py-2 bg-black/40 border-b border-white/5 overflow-x-auto whitespace-nowrap flex items-center gap-2 no-scrollbar shrink-0">
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
          <Sparkles className="w-3 h-3 text-primary" /> Suggestions:
        </span>
        {(suggestions.length > 0 ? suggestions : [
          "What's the production plan for tomorrow?",
          "Show low stock raw materials",
          "Status of export container manifests",
          "What did we produce today?"
        ]).map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-primary/20 border border-white/10 hover:border-primary/40 text-[11px] text-zinc-300 hover:text-primary transition-all shrink-0"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div key={idx} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <div className="w-7 h-7 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 sm:p-4 text-xs shadow-md ${
                  isUser
                    ? 'bg-primary text-black font-semibold rounded-tr-none'
                    : 'bg-[#15151a] border border-white/10 text-zinc-200 rounded-tl-none'
                }`}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  <MarkdownMessage content={msg.content} />
                )}
                <div
                  className={`mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] font-mono ${
                    isUser ? 'text-black/60' : 'text-zinc-500'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => {
                        setInput('Remember that: ');
                        inputRef.current?.focus();
                      }}
                      className="text-[10px] text-zinc-400 hover:text-primary transition-colors flex items-center gap-1"
                      title="Teach or correct this answer"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-primary" /> Teach / Correct
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-[#15151a] border border-white/10 rounded-2xl rounded-tl-none p-3.5 text-xs text-zinc-400 flex items-center gap-2">
              <span className="flex space-x-1">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </span>
              <span className="font-mono text-[11px] text-zinc-400">Querying live factory database...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3.5 bg-[#121216] border-t border-white/10 shrink-0">
        <div className="relative flex items-center">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about tomorrow's plan, yields, pouch stock..."
            className="w-full pl-4 pr-12 py-3 rounded-2xl bg-black border border-white/10 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-primary resize-none font-mono"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="absolute right-2.5 p-2 rounded-xl bg-primary disabled:bg-white/10 text-black disabled:text-zinc-500 hover:bg-amber-400 transition-all font-bold"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-zinc-500 font-mono">
          <span>Press Enter to send • Direct live DB intelligence</span>
          <span>AGPL Copilot v1.0</span>
        </div>
      </div>
    </motion.div>
  );
};
