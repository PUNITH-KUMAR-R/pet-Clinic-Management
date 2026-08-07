import { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, Bot, AlertTriangle, User, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import { CoPilotMessage } from '../types';

interface AICopilotProps {
  onRefreshData?: () => void;
}

const DEFAULT_INITIAL_MESSAGE: CoPilotMessage = {
  id: 'init',
  role: 'assistant',
  content: '👋 Hi! I am your AI Practice Assistant. I have live access to our clinic database and can assist you with:\n\n* **Register Doctor**: e.g., "Register doctor Dr. Alan Grant, specialty Cardiology"\n* **Register Pet**: e.g., "Register pet Max, Dog, Golden Retriever owned by Sarah"\n* **Recommend Doctor**: e.g., "Which doctor is best for my pet\'s skin itching?"\n* **Book Appointment**: e.g., "Schedule appointment for Bella with Dr. Sarah Jenkins on 2026-08-15 at 10:00"',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

export default function AICopilot({ onRefreshData }: AICopilotProps) {
  const [messages, setMessages] = useState<CoPilotMessage[]>(() => {
    try {
      const saved = localStorage.getItem('vetcore_copilot_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load chat history from localStorage', e);
    }
    return [DEFAULT_INITIAL_MESSAGE];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('vetcore_copilot_messages', JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save chat history to localStorage', e);
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleClearChat = () => {
    const reset = [DEFAULT_INITIAL_MESSAGE];
    setMessages(reset);
    localStorage.removeItem('vetcore_copilot_messages');
  };

  const quickPrompts = [
    'Register doctor Dr. Maya Patel, specialty Neurology',
    'Register pet Milo, Cat, Persian owned by David',
    'Which doctor is best for skin rashes and itching?',
    'Schedule appointment for Bella with Dr. Sarah Jenkins on 2026-08-15 at 10:00'
  ];

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: CoPilotMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/gemini/co-pilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] })
      });

      const data = await response.json();
      if (response.ok && data.content) {
        setMessages(prev => [...prev, {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: data.content,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        if (onRefreshData) onRefreshData(); // refresh parent state if scheduling has been resolved
      } else {
        throw new Error(data.error || 'Unknown server error');
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `❌ **Error communicating with AI Co-pilot:** ${err.message}. Please check your server connection or Gemini API Key configuration.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden h-[600px] flex flex-col" id="ai-copilot-container">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-white/10 rounded-lg">
            <Sparkles className="w-5 h-5 text-teal-100" />
          </div>
          <div>
            <h3 className="font-semibold text-sm tracking-wide">Gemini Practice Co-Pilot</h3>
            <p className="text-xs text-teal-100/90">Scheduling Advisor & Symptomatic Care</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleClearChat}
            title="Reset Chat History"
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-teal-100 transition-colors text-xs flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Clear</span>
          </button>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-2 max-w-[85%] ${
              msg.role === 'user' ? 'ml-auto flex-row-reverse space-x-reverse' : ''
            }`}
          >
            <div className={`p-2 rounded-xl flex-shrink-0 ${
              msg.role === 'user' ? 'bg-teal-100 text-teal-800' : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-teal-600" />}
            </div>
            <div className="space-y-1">
              <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-teal-600 text-white rounded-tr-none'
                  : 'bg-white border border-slate-200/80 text-slate-700 rounded-tl-none shadow-sm'
              }`}>
                {/* Parse simple markdown lines */}
                {msg.content.split('\n').map((line, idx) => {
                  const trimmed = line.trim();
                  if (!trimmed) return <div key={idx} className="h-2" />;

                  if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                    const cleaned = trimmed.replace(/^[\*\-]\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1');
                    return (
                      <div key={idx} className="flex items-start space-x-1.5 my-1">
                        <span className="text-teal-500 font-bold">•</span>
                        <span>{cleaned}</span>
                      </div>
                    );
                  }

                  if (trimmed.startsWith('> ')) {
                    return (
                      <div key={idx} className="border-l-2 border-amber-400 pl-2.5 my-1 text-slate-600 italic bg-amber-50/50 py-1 rounded-r-md">
                        {trimmed.replace(/^>\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1')}
                      </div>
                    );
                  }

                  // Strip bold syntax or render as plain formatted line
                  const renderText = trimmed.replace(/\*\*(.*?)\*\*/g, '$1');
                  return <p key={idx} className="mb-1 last:mb-0">{renderText}</p>;
                })}
              </div>
              <span className="text-[10px] text-slate-400 px-1 block text-right">{msg.timestamp}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-slate-500 text-xs pl-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
            <span>Co-pilot is analyzing schedules & guidelines...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Prompt suggestions */}
      <div className="p-2 bg-slate-100 border-t border-slate-200 flex flex-wrap gap-1.5 overflow-x-auto">
        {quickPrompts.map((p, index) => (
          <button
            key={index}
            onClick={() => handleSend(p)}
            disabled={loading}
            className="text-[11px] bg-white text-slate-600 hover:text-teal-700 hover:border-teal-500 border border-slate-200 rounded-full py-1 px-2.5 transition-colors duration-150 whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="p-3 border-t border-slate-200 bg-white flex items-center space-x-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about schedules, conflicts, or symptom treatments..."
          disabled={loading}
          className="flex-1 bg-slate-50 focus:bg-white text-sm border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 rounded-xl px-3.5 py-2.5 outline-none transition-all duration-150 text-slate-700 placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-teal-600 hover:bg-teal-700 text-white p-2.5 rounded-xl transition-all duration-150 disabled:opacity-40 cursor-pointer flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
