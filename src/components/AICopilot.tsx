import { useState } from 'react';
import { Sparkles, Send, Bot, AlertTriangle, User, RefreshCw } from 'lucide-react';
import { CoPilotMessage } from '../types';

interface AICopilotProps {
  onRefreshData?: () => void;
}

export default function AICopilot({ onRefreshData }: AICopilotProps) {
  const [messages, setMessages] = useState<CoPilotMessage[]>([
    {
      id: 'init',
      role: 'assistant',
      content: 'Hi! I am your AI Clinic Co-pilot. I have live access to your doctors, registered pets, and appointments schedule. Ask me to:\n\n* **Resolve booking conflicts**: e.g., "Doctor Sarah is busy at 10 AM, help find another time or general doctor."\n* **Symptomatic Guidelines**: e.g., "Bella is scratching her paws frequently, what should I do?"',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const quickPrompts = [
    'Help resolve Monday 10:00 booking issue',
    'Symptom advisor: Cat vomiting care guidelines',
    'Dr. Robert Chen scheduling availability slots'
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
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs text-teal-50">Active Context</span>
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
                  if (line.startsWith('* **') || line.startsWith('**') || line.startsWith('*')) {
                    // Render custom bold or bullet styling nicely
                    const cleaned = line.replace(/^\*\s+/, '').replace(/\*\*/g, '');
                    return (
                      <div key={idx} className="flex items-start space-x-1.5 my-1">
                        <span className="text-teal-500 mt-1">•</span>
                        <span>{cleaned}</span>
                      </div>
                    );
                  }
                  return <p key={idx} className="mb-1 last:mb-0">{line}</p>;
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

      {/* Safety Disclaimer */}
      <div className="bg-amber-50 px-3 py-1.5 border-t border-amber-100 flex items-center space-x-1.5 text-[10px] text-amber-700">
        <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />
        <span>Co-pilot symptom guidelines are advisory; always consult a licensed vet for diagnosis.</span>
      </div>
    </div>
  );
}
