import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  ArrowRight,
  Sparkles,
  DollarSign,
  Layers,
  CookingPot,
  Boxes,
  PieChart,
  Settings,
  Gift,
  Trophy,
  ShieldAlert,
  Smartphone,
  Truck,
  UtensilsCrossed,
  X,
  Command,
  PlusCircle,
  TrendingUp,
  Receipt,
  Flame,
  CreditCard
} from 'lucide-react';
import { useApp, ActiveView } from '../context/AppContext';
import { formatBRL } from '../utils/formatters';
import { playBeep } from '../utils/audio';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const {
    setCurrentView,
    products,
    orders,
    tables,
    setIsAICopilotOpen,
    setIsWebhookModalOpen,
  } = useApp();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Handle ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Search Results
  const navigationItems: { id: ActiveView; title: string; subtitle: string; icon: React.ElementType; category: string; iconColor: string }[] = [
    { id: 'overview_bi', title: 'Painel Geral de Vendas', subtitle: 'Faturamento, ticket médio e resumo do dia', icon: TrendingUp, category: 'Navegação', iconColor: 'text-[#FFC72C]' },
    { id: 'pdv', title: 'Frente de Caixa (Balcão)', subtitle: 'Abertura de pedidos no balcão e combos (Atalho F2)', icon: DollarSign, category: 'Operação', iconColor: 'text-[#DA291C]' },
    { id: 'mesas_comandas', title: 'Mapa de Mesas & Comandas', subtitle: 'Gestão visual do salão, comandas individuais e transferência', icon: UtensilsCrossed, category: 'Operação', iconColor: 'text-[#00B8FF]' },
    { id: 'atendente_mobile', title: 'Atendentes: Pedidos Celular & Tablet', subtitle: 'Lançamento rápido de pedidos de mesa e balcão pelo atendente', icon: Smartphone, category: 'Operação', iconColor: 'text-[#FF7A00]' },
    { id: 'central_pedidos', title: 'Central de Pedidos', subtitle: 'Painel de pedidos WhatsApp, Balcão e Entregas', icon: Layers, category: 'Operação', iconColor: 'text-[#FF6B00]' },
    { id: 'kds', title: 'Pedidos na Cozinha', subtitle: 'Tela de produção com cronômetro de preparo', icon: CookingPot, category: 'Operação', iconColor: 'text-[#FFC72C]' },
    { id: 'cardapio_bcg', title: 'Lucro dos Pratos & Cardápio', subtitle: 'Pratos mais vendidos, margem de lucro e custo de pratos', icon: UtensilsCrossed, category: 'Gestão', iconColor: 'text-[#FF6B00]' },
    { id: 'estoque_cmv', title: 'Estoque & Ingredientes', subtitle: 'Controle de ingredientes em falta e listas de compras', icon: Boxes, category: 'Gestão', iconColor: 'text-[#FFC72C]' },
    { id: 'financeiro_dre', title: 'Financeiro & Lucro Real', subtitle: 'Fluxo de caixa diário, entradas, saídas e fechamento', icon: PieChart, category: 'Finanças', iconColor: 'text-[#00E676]' },
    { id: 'gateway_pagamentos', title: 'Gateways de Pagamento (Pix & Cartão)', subtitle: 'Credenciais de API, Webhooks, QR Code Dinâmico e Conciliação no Caixa', icon: CreditCard, category: 'Finanças', iconColor: 'text-[#00D26A]' },
    { id: 'fidelidade', title: 'Clientes & Fidelidade', subtitle: 'Histórico de clientes, pontos acumulados e WhatsApp', icon: Gift, category: 'Marketing', iconColor: 'text-[#DA291C]' },
    { id: 'cardapio_digital', title: 'Cardápio Online do Cliente & PDF', subtitle: 'Menu completo, QR Code para mesas e link para WhatsApp', icon: Sparkles, category: 'Operação', iconColor: 'text-[#FFC72C]' },
    { id: 'delivery_gestao', title: 'Gestão de Entregas & GPS Motoboys', subtitle: 'Rastreamento em tempo real, despacho e cálculo de frete por geolocalização', icon: Truck, category: 'Operação', iconColor: 'text-[#00E676]' },
    { id: 'mobile_exp', title: 'App dos Atendentes & Entregadores', subtitle: 'Lançamento de pedidos em mesas por celular/tablet e GPS motoboy', icon: Smartphone, category: 'Operação', iconColor: 'text-[#00D2FF]' },
    { id: 'configuracoes', title: 'Configurações do Restaurante', subtitle: 'Impressoras térmicas, taxas, cupom fiscal e delivery', icon: Settings, category: 'Sistema', iconColor: 'text-[#00D2FF]' },
  ];

  const filteredNav = useMemo(() => {
    if (!query.trim()) return navigationItems.slice(0, 6);
    const q = query.toLowerCase();
    return navigationItems.filter(
      item => item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q)
    );
  }, [query]);

  const filteredProducts = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)).slice(0, 4);
  }, [products, query]);

  const filteredOrders = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return orders.filter(o => o.displayCode.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q)).slice(0, 3);
  }, [orders, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-[#12121A] border border-[#2A2A3E] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Search Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#20202E]">
          <Search className="w-5 h-5 text-[#FFC72C]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar pratos, combos, pedidos, mesas ou telas..."
            className="flex-1 bg-transparent text-white text-sm placeholder-[#71717A] border-none focus:ring-0"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-[#FFC72C] bg-[#1A1A26] px-2 py-0.5 rounded-lg border border-[#2E2E42]">
            ESC
          </kbd>
          <button
            onClick={onClose}
            className="text-[#71717A] hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-3">
          {/* Quick AI Action */}
          {query.toLowerCase().includes('ia') || query.toLowerCase().includes('ajuda') || query.toLowerCase().includes('copilot') ? (
            <div className="px-1 py-1">
              <button
                onClick={() => {
                  onClose();
                  setIsAICopilotOpen(true);
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-[#DA291C]/20 to-[#FFC72C]/20 hover:from-[#DA291C]/30 hover:to-[#FFC72C]/30 border border-[#FFC72C]/40 text-left transition-colors cursor-pointer shadow-[0_0_15px_rgba(255,199,44,0.15)]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#DA291C] to-[#B31B10] text-[#FFC72C] flex items-center justify-center shadow-md">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">Abrir Copiloto IA Gastronômica</div>
                    <div className="text-[11px] text-[#A1A1AA]">Consultoria para CMV, faturamento e sugestão de combos</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#FFC72C]" />
              </button>
            </div>
          ) : null}

          {/* Navigation Matches */}
          {filteredNav.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#FFC72C]">
                Módulos & Operações
              </div>
              {filteredNav.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id);
                      onClose();
                      playBeep(880, 0.04);
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-[#181826] text-left transition-colors group cursor-pointer border border-transparent hover:border-[#FFC72C]/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#181826] text-[#A1A1AA] group-hover:text-white flex items-center justify-center">
                        <Icon className={`w-4 h-4 ${item.iconColor}`} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-[#FFC72C] transition-colors">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-[#71717A]">{item.subtitle}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#3F3F50] group-hover:text-[#FFC72C] transition-colors" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Product Matches */}
          {filteredProducts.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-[#20202E]">
              <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#DA291C]">
                Lanches & Cardápio
              </div>
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setCurrentView('pdv');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl hover:bg-[#181826] text-left transition-colors cursor-pointer border border-transparent hover:border-[#DA291C]/30"
                >
                  <div className="flex items-center gap-3">
                    <img src={p.imageUrl} alt={p.name} className="w-8 h-8 rounded-lg object-cover" />
                    <div>
                      <div className="text-xs font-bold text-white">{p.name}</div>
                      <div className="text-[11px] text-[#71717A]">{p.category}</div>
                    </div>
                  </div>
                  <div className="text-xs font-mono font-black text-[#00E676]">{formatBRL(p.price)}</div>
                </button>
              ))}
            </div>
          )}

          {/* Orders Matches */}
          {filteredOrders.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-[#20202E]">
              <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#FF6B00]">
                Pedidos Recentes
              </div>
              {filteredOrders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    setCurrentView('central_pedidos');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl hover:bg-[#181826] text-left transition-colors cursor-pointer border border-transparent hover:border-[#FF6B00]/30"
                >
                  <div className="flex items-center gap-3">
                    <Receipt className="w-4 h-4 text-[#FFC72C]" />
                    <div>
                      <div className="text-xs font-bold text-white">{o.displayCode} • {o.customerName}</div>
                      <div className="text-[11px] text-[#71717A] capitalize">{o.status} • {o.channel}</div>
                    </div>
                  </div>
                  <div className="text-xs font-mono font-black text-[#00E676]">{formatBRL(o.total)}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-[#0D0D12] border-t border-[#20202E] flex items-center justify-between text-[11px] text-[#71717A]">
          <div className="flex items-center gap-2">
            <span>Navegação Rápida:</span>
            <kbd className="bg-[#181826] px-1.5 py-0.5 rounded text-[10px] text-[#FFC72C] border border-[#2E2E42]">↑</kbd>
            <kbd className="bg-[#181826] px-1.5 py-0.5 rounded text-[10px] text-[#FFC72C] border border-[#2E2E42]">↓</kbd>
          </div>
          <span className="text-[#FFC72C] font-mono font-bold">NEON FOOD OS • 2026</span>
        </div>
      </div>
    </div>
  );
};
