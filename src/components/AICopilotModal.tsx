import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User, 
  RefreshCw, 
  Flame, 
  TrendingUp, 
  Boxes, 
  DollarSign,
  MessageSquare
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { playBeep, playCashRegister } from '../utils/audio';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const AICopilotModal: React.FC = () => {
  const { isAICopilotOpen, setIsAICopilotOpen, currentBranch, tenant, products, ingredients } = useApp();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Olá! Sou o Neon Copilot AI, seu consultor estratégico de restaurantes. Analisei os dados da unidade "${currentBranch.name}" (Faturamento: R$ ${currentBranch.revenueToday.toFixed(2)}, CMV: ${currentBranch.cmvToday}%, Tempo KDS: ${currentBranch.kdsAvgTimeMin} min). Em que posso te ajudar a lucrar mais hoje?`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAICopilotOpen) return null;

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputValue;
    if (!promptToSend.trim()) return;

    playBeep(880, 0.04);
    const userMsg: Message = {
      role: 'user',
      content: promptToSend,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInputValue('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          restaurantContext: {
            restaurantName: tenant.name,
            branchName: currentBranch.name,
            revenueToday: currentBranch.revenueToday,
            ordersToday: currentBranch.ordersToday,
            cmvToday: currentBranch.cmvToday,
            kdsAvgTimeMin: currentBranch.kdsAvgTimeMin,
            productsCount: products.length,
            criticalStockIngredients: ingredients.filter(i => i.status === 'critical').map(i => i.name),
          },
        }),
      });

      const data = await response.json();
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.advice || 'Análise gerada com sucesso para a operação do restaurante.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, assistantMsg]);
      playBeep(1040, 0.06);
    } catch (err) {
      // Fallback response if offline or key not provided
      const fallbackMsg: Message = {
        role: 'assistant',
        content: `Com base nos seus números de hoje (Faturamento de R$ ${currentBranch.revenueToday.toFixed(2)} e CMV de ${currentBranch.cmvToday}%):\n\n1. **Aumento de Margem**: O item Smash Neon Duplo está com margem excelente (73%). Recomendo criar um combo com Batata Rústica e Refrigerante por R$ 49,90 no WhatsApp para elevar o ticket médio de R$ 68 para R$ 74.\n2. **Estoque Crítico**: Atenção ao estoque de Pão Brioche e Queijo Cheddar para o rush noturno das 19h-21h.\n3. **Reativação**: 342 clientes inativos no CRM podem ser reativados com um cupom de 10% OFF via bot WhatsApp.`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#121218] border border-[#8B5CF6]/40 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl relative flex flex-col h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#20202E] pb-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#E31837] flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#FFE600] uppercase tracking-wider">Consultor Estratégico de Restaurantes</div>
              <h3 className="text-base font-black text-white">Neon Copilot AI • Gestão de Alta Performance</h3>
            </div>
          </div>

          <button
            onClick={() => setIsAICopilotOpen(false)}
            className="text-[#71717A] hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
          {[
            'Como reduzir o CMV abaixo de 26%?',
            'Qual campanha de WhatsApp disparar hoje?',
            'Otimizar preços do cardápio com Matriz BCG',
            'Previsão de vendas para sábado à noite',
          ].map((promptText, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(promptText)}
              className="px-3 py-1.5 bg-[#181824] hover:bg-[#222234] text-[#D4D4D8] text-[11px] font-semibold rounded-xl border border-[#2B2B3C] whitespace-nowrap transition-all cursor-pointer"
            >
              💡 {promptText}
            </button>
          ))}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-[#242436] p-2 bg-[#0A0A0E] rounded-2xl border border-[#1E1E2C]">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#E31837] flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}

              <div
                className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#E31837] text-white rounded-tr-none'
                    : 'bg-[#161622] text-[#E4E4E7] border border-[#262638] rounded-tl-none whitespace-pre-line'
                }`}
              >
                {msg.content}
                <div className="text-[9px] text-[#A1A1AA] mt-1 text-right">{msg.timestamp}</div>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-[#282838] flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#FFE600] p-2 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>O Neon Copilot AI está analisando os dados da sua cozinha e financeiro...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="mt-3 flex gap-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Pergunte sobre CMV, compras, cardápio, campanhas ou estratégias..."
            className="flex-1 bg-[#181822] border border-[#282838] rounded-2xl px-4 py-3 text-xs text-white placeholder-[#52525B] focus:border-[#8B5CF6] focus:outline-none"
          />

          <button
            type="submit"
            disabled={loading || !inputValue.trim()}
            className="px-5 bg-gradient-to-r from-[#8B5CF6] to-[#E31837] hover:opacity-95 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
