import React, { useState } from 'react';
import { 
  Flame, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  Layers, 
  CookingPot, 
  Smartphone, 
  ShieldCheck, 
  TrendingUp, 
  MessageSquare, 
  Percent, 
  DollarSign, 
  Star, 
  HelpCircle, 
  Calculator,
  QrCode,
  Truck,
  Boxes,
  Lock,
  ChevronDown,
  ChevronUp,
  X,
  Crown,
  LogIn,
  UserPlus,
  UtensilsCrossed,
  Clock,
  BarChart3,
  Users,
  Receipt,
  ShoppingBag,
  Eye,
  FileText,
  Share2,
  Check,
  Award,
  Heart
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatBRL } from '../utils/formatters';
import { playBeep, playCashRegister, playLevelUp } from '../utils/audio';

export const LandingPage: React.FC = () => {
  const { setCurrentView, switchRole, saasPlans } = useApp();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [monthlyOrdersCalc, setMonthlyOrdersCalc] = useState(850);
  const [avgTicketCalc, setAvgTicketCalc] = useState(48);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [activeInteractiveTab, setActiveInteractiveTab] = useState<'cardapio' | 'pdv' | 'cozinha' | 'gestao'>('cardapio');

  // ROI / Savings calculation compared to iFood / marketplaces 12% commission
  const marketplaceCommission = (monthlyOrdersCalc * avgTicketCalc) * 0.12;
  const neonCost = 39.90; // Plano Pro
  const monthlySavings = Math.max(0, marketplaceCommission - neonCost);
  const annualSavings = monthlySavings * 12;

  const handleStartTrial = () => {
    playLevelUp();
    setCurrentView('onboarding');
  };

  const toggleFaq = (index: number) => {
    playBeep(700, 0.03);
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqItems = [
    {
      q: 'O que é o NEON FOOD OS?',
      a: 'O NEON FOOD OS é o sistema operacional tudo-em-um para alimentação que une Cardápio Digital com QR Code, Frente de Caixa (PDV), Gestão de Mesas e Comandas, Tela de Cozinha (KDS), Central de Delivery e Controle de Estoque com Ficha Técnica em uma única plataforma rápida e sem complicações.'
    },
    {
      q: 'Para quem serve?',
      a: 'Para hamburguerias, pizzarias, lanchonetes, restaurantes à la carte, cafeterias, dark kitchens, açaíterias e redes de fast-food que buscam velocidade no atendimento, zero atrasos de cozinha e maior lucro sem comissões abusivas.'
    },
    {
      q: 'Posso usar no celular?',
      a: 'Sim! O sistema é 100% responsivo e funciona perfeitamente em qualquer smartphone (Android ou iPhone) através do navegador ou como aplicativo PWA sem necessidade de downloads pesados.'
    },
    {
      q: 'Posso usar no tablet?',
      a: 'Com certeza. O Atendente Móvel e o Cardápio Digital foram projetados com botões grandes ideais para tablets na mesa, balcão ou nas mãos dos atendentes no salão.'
    },
    {
      q: 'Posso criar meu próprio Cardápio?',
      a: 'Sim, você tem autonomia total para cadastrar produtos com fotos, descrições, preços, categorias, tags especiais (Ex: Mais Vendido, Vegano) e grupos de adicionais personalizáveis.'
    },
    {
      q: 'Posso compartilhar pelo WhatsApp?',
      a: 'Sim! O sistema gera um link curto e mensagens formatadas com emojis para você enviar aos clientes no WhatsApp ou colocar na bio do Instagram.'
    },
    {
      q: 'Posso gerar QR Code?',
      a: 'Sim! Você pode gerar QR Codes personalizados para cada mesa do salão ou para o balcão, permitindo que o cliente abra o cardápio e faça o pedido direto no celular.'
    },
    {
      q: 'Posso gerar PDF?',
      a: 'Sim, você pode exportar tanto relatórios financeiros completos quanto uma versão visual do seu cardápio em PDF para impressão física com apenas um clique.'
    },
    {
      q: 'Como funcionam as mesas?',
      a: 'Você tem um mapa visual de mesas colorido em tempo real: mesas livres em cinza/verde, ocupadas em amarelo e em fechamento em vermelho, com tempo de ocupação e comanda integrada.'
    },
    {
      q: 'Como funciona a cozinha?',
      a: 'A tela KDS divide os pedidos por praças (Chapa, Fritura, Montagem, Bar), exibindo cronômetro com código de cores (Verde, Amarelo, Vermelho), alertas sonoros e botão de avanço rápido de etapa.'
    },
    {
      q: 'Posso trabalhar com delivery?',
      a: 'Sim! O sistema conta com Central de Delivery completa, cálculo de taxa por bairro ou KM, radar de entregadores em tempo real e envio de link de rastreio para o cliente.'
    },
    {
      q: 'Posso controlar estoque?',
      a: 'Sim. Cada item vendido dá baixa automática nos ingredientes configurados na Ficha Técnica (pão, carne, molho, queijo, embalagem), avisando quando o estoque mínimo for atingido.'
    },
    {
      q: 'Posso controlar financeiro?',
      a: 'Sim, controle completo de abertura, suprimento, sangria e fechamento de caixa, além de DRE com cálculo automático de CMV e margem de contribuição de cada prato.'
    },
    {
      q: 'Existe período grátis?',
      a: 'Sim! Oferecemos 15 dias de teste grátis com todas as funcionalidades liberadas e sem necessidade de cadastrar cartão de crédito. Você testa antes de decidir.'
    },
    {
      q: 'Posso mudar de plano?',
      a: 'Sim, a qualquer momento você pode fazer upgrade ou downgrade de plano direto no painel com cobrança proporcional simples e transparente.'
    }
  ];

  const operationalSteps = [
    {
      step: '01',
      title: 'Entrada do Pedido',
      desc: 'Cliente pede pelo Cardápio QR Code ou atendente lança na mesa pelo celular.',
      badge: 'QR Code & Atendente',
      color: '#DA291C'
    },
    {
      step: '02',
      title: 'Cozinha Conectada (KDS)',
      desc: 'Aparece instantaneamente na tela da cozinha com toque sonoro e cronômetro.',
      badge: 'Sem Papel',
      color: '#FF7A00'
    },
    {
      step: '03',
      title: 'Impressão Térmica ESC/POS',
      desc: 'Comanda impressa na impressora da cozinha automaticamente (se preferir papel).',
      badge: '80mm & 58mm',
      color: '#FFC72C'
    },
    {
      step: '04',
      title: 'Baixa Automática no Estoque',
      desc: 'A Ficha Técnica calcula os gramas de queijo, carne e insumos consumidos.',
      badge: 'Estoque Real',
      color: '#00D26A'
    },
    {
      step: '05',
      title: 'Caixa & Lucro em Tempo Real',
      desc: 'Receita lançada no caixa com cálculo de margem e DRE sem planilhas.',
      badge: 'Lucro Líquido',
      color: '#00B8FF'
    }
  ];

  return (
    <div className="min-h-screen bg-[#070709] text-white selection:bg-[#DA291C] selection:text-white font-sans">
      {/* 1. TOP ANNOUNCEMENT BAR: 15 DIAS GRÁTIS */}
      <div className="bg-gradient-to-r from-[#DA291C] via-[#FF7A00] to-[#FFC72C] text-black font-black text-xs py-2 px-4 text-center flex flex-wrap items-center justify-center gap-2 shadow-md">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
          <span>🔥 15 DIAS GRÁTIS: Experimente o NEON FOOD OS antes de decidir. Sem cartão de crédito!</span>
        </div>
        <button
          onClick={() => {
            playBeep(800, 0.04);
            setShowTrialModal(true);
          }}
          className="bg-black text-white px-3 py-0.5 rounded-full text-[11px] font-extrabold hover:bg-neutral-900 transition-transform active:scale-95 cursor-pointer ml-1"
        >
          QUERO MEUS 15 DIAS GRÁTIS
        </button>
      </div>

      {/* 2. NAVIGATION BAR */}
      <nav className="sticky top-0 z-40 bg-[#09090D]/95 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            onClick={() => {
              playBeep(700, 0.04);
              setCurrentView('landing');
            }}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#DA291C] to-[#FFC72C] p-[2px] shadow-[0_0_20px_rgba(218,41,28,0.5)]">
              <div className="w-full h-full bg-[#0E0D14] rounded-[14px] flex items-center justify-center">
                <Flame className="w-6 h-6 text-[#FFC72C]" />
              </div>
            </div>
            <div>
              <div className="font-black text-lg sm:text-xl tracking-tight text-white flex items-center gap-1">
                NEON<span className="text-[#DA291C]">FOOD</span> <span className="text-[#FFC72C]">OS</span>
              </div>
              <div className="text-[10px] text-zinc-400 font-semibold tracking-wide uppercase">Sistema de Alta Performance</div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-6 text-xs font-bold text-zinc-300">
            <a href="#beneficios" className="hover:text-[#FFC72C] transition-colors">Benefícios</a>
            <a href="#cardapio" className="hover:text-[#FFC72C] transition-colors">Cardápio</a>
            <a href="#operacao" className="hover:text-[#FFC72C] transition-colors">Operação</a>
            <a href="#resultados" className="hover:text-[#FFC72C] transition-colors">Resultados</a>
            <a href="#comparativo" className="hover:text-[#FFC72C] transition-colors">Comparativo</a>
            <a href="#planos" className="hover:text-[#FFC72C] transition-colors">Planos</a>
            <a href="#faq" className="hover:text-[#FFC72C] transition-colors">Dúvidas</a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Super Admin */}
            <button
              onClick={() => {
                playBeep(800, 0.05);
                switchRole('super_admin');
                setCurrentView('super_admin');
              }}
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-[#FFC72C] bg-[#DA291C]/15 hover:bg-[#DA291C]/25 border border-[#DA291C]/40 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
              title="Acessar painel do Super Admin"
            >
              <Crown className="w-3.5 h-3.5 text-[#FFC72C]" />
              <span>Super Admin</span>
            </button>

            {/* Fazer Login */}
            <button
              onClick={() => {
                playBeep(750, 0.05);
                setCurrentView('login_auth');
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-zinc-200 hover:text-white px-3 py-1.5 rounded-xl hover:bg-zinc-800/80 border border-zinc-800 transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-400" />
              <span>Login</span>
            </button>

            {/* Teste Grátis */}
            <button
              onClick={() => {
                playBeep(800, 0.05);
                setShowTrialModal(true);
              }}
              className="bg-gradient-to-r from-[#DA291C] to-[#FF7A00] hover:brightness-110 text-white px-3.5 sm:px-4 py-1.5 rounded-xl text-xs font-black shadow-[0_0_20px_rgba(218,41,28,0.4)] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Testar Grátis</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#FFC72C]" />
            </button>
          </div>
        </div>
      </nav>

      {/* 3. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 px-4 sm:px-6 lg:px-8 border-b border-zinc-800/80">
        {/* Glow ambient background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-[#DA291C]/25 via-[#FF7A00]/15 to-[#FFC72C]/20 blur-[140px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1A1115] border border-[#DA291C]/40 text-xs font-bold text-[#FFC72C] mb-6 shadow-[0_0_15px_rgba(255,199,44,0.15)]">
            <Flame className="w-4 h-4 text-[#DA291C]" />
            <span>A Alternativa Brasileira de Alto Desempenho ao Consumer e Anota Aí</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.05] uppercase">
            SEU RESTAURANTE.<br />
            <span className="bg-gradient-to-r from-[#FFC72C] via-[#FF7A00] to-[#DA291C] bg-clip-text text-transparent">
              UM SISTEMA.
            </span><br />
            CONTROLE TOTAL.
          </h1>

          <p className="mt-6 text-base sm:text-lg md:text-xl text-zinc-300 max-w-3xl mx-auto leading-relaxed font-medium">
            Gerencie cardápio, pedidos, mesas, comandas, cozinha, delivery, estoque, caixa, clientes e financeiro em um único sistema rápido e intuitivo.
          </p>

          {/* Action CTAs */}
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-xl mx-auto">
            <button
              onClick={() => {
                playCashRegister();
                setShowTrialModal(true);
              }}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#DA291C] via-[#E83324] to-[#FF7A00] hover:brightness-110 active:scale-95 text-white font-black text-sm sm:text-base rounded-2xl shadow-[0_0_30px_rgba(218,41,28,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#FFC72C]/40"
            >
              <span>COMEÇAR AGORA (15 DIAS GRÁTIS)</span>
              <ArrowRight className="w-5 h-5 text-[#FFC72C]" />
            </button>

            <a
              href="#planos"
              className="w-full sm:w-auto px-7 py-4 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700/80 font-bold text-sm sm:text-base rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Eye className="w-4 h-4 text-[#FFC72C]" />
              <span>VER PLANOS</span>
            </a>

            <button
              onClick={() => {
                playBeep(750, 0.05);
                setCurrentView('overview_bi');
              }}
              className="w-full sm:w-auto px-5 py-4 bg-[#16121D] hover:bg-[#201B2B] text-[#FFC72C] border border-[#FFC72C]/30 font-bold text-xs sm:text-sm rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>🍔 Ver Demo ao Vivo</span>
            </button>
          </div>

          {/* Micro trust indicators */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400 font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 15 Dias Grátis sem compromisso
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Sem cartão de crédito
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Ativação em 30 segundos
            </span>
          </div>

          {/* Interactive Live Ecosystem Preview Mockup */}
          <div className="mt-12 rounded-3xl bg-zinc-900/90 border border-zinc-800 p-2 sm:p-4 shadow-2xl">
            {/* Interactive Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3 mb-4 px-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#DA291C]" />
                <span className="w-3 h-3 rounded-full bg-[#FFC72C]" />
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-mono text-zinc-400 ml-2">neon-food-os.app/sistema-conectado</span>
              </div>

              <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveInteractiveTab('cardapio')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeInteractiveTab === 'cardapio' ? 'bg-[#DA291C] text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  📱 Cardápio Digital
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInteractiveTab('pdv')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeInteractiveTab === 'pdv' ? 'bg-[#DA291C] text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  ⚡ PDV Caixa (F2)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInteractiveTab('cozinha')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeInteractiveTab === 'cozinha' ? 'bg-[#DA291C] text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  👨‍🍳 Cozinha KDS
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInteractiveTab('gestao')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeInteractiveTab === 'gestao' ? 'bg-[#DA291C] text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  📊 DRE & Lucro
                </button>
              </div>
            </div>

            {/* Dynamic View based on Tab */}
            {activeInteractiveTab === 'cardapio' && (
              <div className="p-4 bg-[#111016] rounded-2xl border border-zinc-800 text-left">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-zinc-800">
                  <div className="flex items-center gap-3">
                    <img 
                      src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&auto=format&fit=crop&q=80" 
                      alt="Burger" 
                      className="w-16 h-16 rounded-xl object-cover border border-[#DA291C]/40"
                    />
                    <div>
                      <div className="text-xs font-bold text-[#FFC72C] uppercase">Destaque do Cardápio</div>
                      <h4 className="text-base font-black text-white">Smash Angus Duplo Cheddar</h4>
                      <p className="text-xs text-zinc-400">Dois burgers 100g, cheddar cremoso derretido e bacon crocante no brioche.</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black font-mono text-[#FFC72C]">R$ 36,90</span>
                    <button 
                      onClick={() => setCurrentView('cardapio_digital')}
                      className="block mt-1 text-xs font-bold text-white bg-[#DA291C] hover:bg-[#B31B10] px-3 py-1.5 rounded-lg cursor-pointer"
                    >
                      Abrir Cardápio Demo
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 text-xs">
                  <div className="bg-black/50 p-2.5 rounded-xl border border-zinc-800/80">
                    <span className="text-zinc-400 block text-[10px]">Taxa de Conversão</span>
                    <strong className="text-white text-sm">4.8x Maior</strong>
                  </div>
                  <div className="bg-black/50 p-2.5 rounded-xl border border-zinc-800/80">
                    <span className="text-zinc-400 block text-[10px]">Tempo no Cardápio</span>
                    <strong className="text-[#00D26A] text-sm">1.8 min</strong>
                  </div>
                  <div className="bg-black/50 p-2.5 rounded-xl border border-zinc-800/80">
                    <span className="text-zinc-400 block text-[10px]">Upsell Adicionais</span>
                    <strong className="text-[#FFC72C] text-sm">+29% no Ticket</strong>
                  </div>
                  <div className="bg-black/50 p-2.5 rounded-xl border border-zinc-800/80">
                    <span className="text-zinc-400 block text-[10px]">Taxas Pagas</span>
                    <strong className="text-emerald-400 text-sm">R$ 0,00 (Sem iFood)</strong>
                  </div>
                </div>
              </div>
            )}

            {activeInteractiveTab === 'pdv' && (
              <div className="p-4 bg-[#111016] rounded-2xl border border-zinc-800 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-black/60 p-3 rounded-xl border border-zinc-800">
                    <div className="text-[11px] text-zinc-400 font-bold uppercase">Venda Rápida F2</div>
                    <div className="text-base font-black text-white mt-1">Lançamento em 3 toques</div>
                    <div className="text-[10px] text-emerald-400 mt-0.5">Calcula troco e emite Pix</div>
                  </div>
                  <div className="bg-black/60 p-3 rounded-xl border border-zinc-800">
                    <div className="text-[11px] text-zinc-400 font-bold uppercase">Divisão de Conta</div>
                    <div className="text-base font-black text-[#FFC72C] mt-1">Por pessoa ou item</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Sem calculadora manual</div>
                  </div>
                  <div className="bg-black/60 p-3 rounded-xl border border-zinc-800">
                    <div className="text-[11px] text-zinc-400 font-bold uppercase">Fechamento Cego</div>
                    <div className="text-base font-black text-[#00D26A] mt-1">Conferência sem fraude</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Sangrias e suprimentos</div>
                  </div>
                </div>
                <div className="mt-3 text-right">
                  <button 
                    onClick={() => setCurrentView('pdv')}
                    className="text-xs font-bold text-white bg-[#DA291C] px-3.5 py-1.5 rounded-xl cursor-pointer"
                  >
                    Testar Frente de Caixa Agora
                  </button>
                </div>
              </div>
            )}

            {activeInteractiveTab === 'cozinha' && (
              <div className="p-4 bg-[#111016] rounded-2xl border border-zinc-800 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-amber-950/30 border border-amber-800/60 p-3 rounded-xl">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                      <span>#1042 • Mesa 04</span>
                      <span className="font-mono bg-amber-500/20 px-1.5 rounded">03:45</span>
                    </div>
                    <div className="text-xs text-white mt-2 font-bold">2x Angus Smash Duplo</div>
                    <div className="text-[10px] text-amber-200">Obs: 1 sem cebola, + bacon</div>
                  </div>
                  <div className="bg-emerald-950/30 border border-emerald-800/60 p-3 rounded-xl">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                      <span>#1043 • Delivery WhatsApp</span>
                      <span className="font-mono bg-emerald-500/20 px-1.5 rounded">06:12</span>
                    </div>
                    <div className="text-xs text-white mt-2 font-bold">1x Pizza Margherita Grande</div>
                    <div className="text-[10px] text-emerald-200">Massa fina bem crocante</div>
                  </div>
                  <div className="bg-blue-950/30 border border-blue-800/60 p-3 rounded-xl">
                    <div className="flex items-center justify-between text-xs font-bold text-blue-300">
                      <span>#1044 • Balcão Viagem</span>
                      <span className="font-mono bg-blue-500/20 px-1.5 rounded">01:10</span>
                    </div>
                    <div className="text-xs text-white mt-2 font-bold">1x Porção Batata Rústica</div>
                    <div className="text-[10px] text-blue-200">Com maionese da casa</div>
                  </div>
                </div>
                <div className="mt-3 text-right">
                  <button 
                    onClick={() => setCurrentView('kds')}
                    className="text-xs font-bold text-white bg-[#DA291C] px-3.5 py-1.5 rounded-xl cursor-pointer"
                  >
                    Ver Cozinha em Tempo Real
                  </button>
                </div>
              </div>
            )}

            {activeInteractiveTab === 'gestao' && (
              <div className="p-4 bg-[#111016] rounded-2xl border border-zinc-800 text-left">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-black/60 p-3 rounded-xl border border-zinc-800">
                    <div className="text-[11px] text-zinc-400 font-bold uppercase">Faturamento Hoje</div>
                    <div className="text-lg font-black text-white mt-1">R$ 7.840,50</div>
                    <div className="text-[10px] text-emerald-400">+22% vs domingo passado</div>
                  </div>
                  <div className="bg-black/60 p-3 rounded-xl border border-zinc-800">
                    <div className="text-[11px] text-zinc-400 font-bold uppercase">CMV Real dos Pratos</div>
                    <div className="text-lg font-black text-[#00D26A] mt-1">28.4%</div>
                    <div className="text-[10px] text-emerald-400">Meta cumprida (&lt; 30%)</div>
                  </div>
                  <div className="bg-black/60 p-3 rounded-xl border border-zinc-800">
                    <div className="text-[11px] text-zinc-400 font-bold uppercase">Tempo Médio KDS</div>
                    <div className="text-lg font-black text-[#FFC72C] mt-1">11.2 min</div>
                    <div className="text-[10px] text-zinc-400">Entrega rápida</div>
                  </div>
                  <div className="bg-black/60 p-3 rounded-xl border border-zinc-800">
                    <div className="text-[11px] text-zinc-400 font-bold uppercase">Economia em Taxas</div>
                    <div className="text-lg font-black text-[#FF7A00] mt-1">R$ 940,86</div>
                    <div className="text-[10px] text-zinc-400">Zero taxas de iFood retidas</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. 🔥 STRATEGIC BANNER: 15 DIAS GRÁTIS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-gradient-to-r from-[#180A0C] via-[#2D0F14] to-[#160E0A] border-2 border-[#DA291C]/50 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[#DA291C]/20 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DA291C]/20 text-[#FFC72C] text-xs font-black uppercase tracking-wider border border-[#FFC72C]/30">
                <Award className="w-3.5 h-3.5 text-[#FFC72C]" />
                <span>Garantia de Satisfação Neon</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                15 DIAS GRÁTIS
              </h2>
              <p className="text-sm sm:text-base text-zinc-300 max-w-xl font-medium">
                Experimente o NEON FOOD OS antes de decidir. Configure em 30 segundos, cadastre seus produtos e veja seus pedidos rodarem no mesmo dia. Sem pegadinhas e sem cartão.
              </p>
            </div>

            <button
              onClick={() => {
                playCashRegister();
                setShowTrialModal(true);
              }}
              className="px-8 py-4 bg-gradient-to-r from-[#FFC72C] via-[#FFB800] to-[#FF7A00] hover:brightness-110 active:scale-95 text-black font-black text-sm sm:text-base rounded-2xl shadow-[0_0_30px_rgba(255,199,44,0.4)] transition-all flex items-center gap-2.5 cursor-pointer shrink-0"
            >
              <span>QUERO MEUS 15 DIAS GRÁTIS</span>
              <ArrowRight className="w-5 h-5 text-black" />
            </button>
          </div>
        </div>
      </section>

      {/* 5. 🧩 OS 12 BENEFÍCIOS DO SISTEMA (ECOSSISTEMA INTEGRADO) */}
      <section id="beneficios" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-zinc-800/80">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-black uppercase tracking-wider text-[#FFC72C] bg-[#FFC72C]/10 px-3 py-1 rounded-full border border-[#FFC72C]/20">
            Tudo o Que Seu Restaurante Precisa
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mt-3 text-white">
            12 Módulos Integrados. <span className="text-[#DA291C]">Zero Complicações.</span>
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 mt-3">
            Diga adeus àquela bagunça de abrir 4 programas diferentes que travam e não conversam entre si.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* 1. Cardápio Digital */}
          <div className="bg-[#100E14] border border-zinc-800/90 hover:border-[#DA291C]/50 p-5 rounded-2xl transition-all group">
            <div className="w-10 h-10 rounded-xl bg-[#DA291C]/15 flex items-center justify-center text-[#DA291C] mb-3 group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-white">Cardápio Digital</h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Fotos de dar água na boca, busca inteligente por ingredientes, adicionais e QR Code para a mesa do salão.
            </p>
          </div>

          {/* 2. Pedidos */}
          <div className="bg-[#100E14] border border-zinc-800/90 hover:border-[#FF7A00]/50 p-5 rounded-2xl transition-all group">
            <div className="w-10 h-10 rounded-xl bg-[#FF7A00]/15 flex items-center justify-center text-[#FF7A00] mb-3 group-hover:scale-110 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-white">Central de Pedidos</h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Todos os pedidos do salão, balcão, delivery e WhatsApp unificados em uma única lista cronológica sem erros.
            </p>
          </div>

          {/* 3. Atendimento */}
          <div className="bg-[#100E14] border border-zinc-800/90 hover:border-[#FFC72C]/50 p-5 rounded-2xl transition-all group">
            <div className="w-10 h-10 rounded-xl bg-[#FFC72C]/15 flex items-center justify-center text-[#FFC72C] mb-3 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-white">Atendente Móvel</h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Seus atendentes anotam os pedidos no celular ou tablet diretamente na mesa, agilizando o atendimento.
            </p>
          </div>

          {/* 4. Cozinha */}
          <div className="bg-[#100E14] border border-zinc-800/90 hover:border-emerald-500/50 p-5 rounded-2xl transition-all group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
              <CookingPot className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-white">Cozinha (KDS)</h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Telas por praça de preparo (Chapa, Fritura, Montagem, Bar) com cronômetro colorido e som de campainha.
            </p>
          </div>

          {/* 5. Mesas */}
          <div className="bg-[#100E14] border border-zinc-800/90 hover:border-[#DA291C]/50 p-5 rounded-2xl transition-all group">
            <div className="w-10 h-10 rounded-xl bg-[#DA291C]/15 flex items-center justify-center text-[#DA291C] mb-3 group-hover:scale-110 transition-transform">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-white">Gestão de Mesas</h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Visão completa do salão: tempo de permanência de cada mesa, valor consumido e fechamento rápido.
            </p>
          </div>

          {/* 6. Comandas */}
          <div className="bg-[#100E14] border border-zinc-800/90 hover:border-[#FF7A00]/50 p-5 rounded-2xl transition-all group">
            <div className="w-10 h-10 rounded-xl bg-[#FF7A00]/15 flex items-center justify-center text-[#FF7A00] mb-3 group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-white">Comandas Rápidas</h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Controle por número de comanda física ou cartão, com divisão de conta por pessoa automática no caixa.
            </p>
          </div>

          {/* 7. Delivery */}
          <div className="bg-[#100E14] border border-zinc-800/90 hover:border-[#FFC72C]/50 p-5 rounded-2xl transition-all group">
            <div className="w-10 h-10 rounded-xl bg-[#FFC72C]/15 flex items-center justify-center text-[#FFC72C] mb-3 group-hover:scale-110 transition-transform">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-white">Delivery Próprio</h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Taxas configuráveis por bairro ou KM, radar de entregadores com GPS e despacho sem pagar comissão.
            </p>
          </div>

          {/* 8. WhatsApp */}
          <div className="bg-[#100E14] border border-zinc-800/90 hover:border-emerald-500/50 p-5 rounded-2xl transition-all group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-white">WhatsApp Integrado</h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Link direto do seu cardápio, mensagens com formatação bonita e aviso de "Seu pedido saiu para entrega!".
            </p>
          </div>

          {/* 9. Estoque */}
          <div className="bg-[#100E14] border border-zinc-800/90 hover:border-cyan-500/50 p-5 rounded-2xl transition-all group">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
              <Boxes className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-white">Estoque & Ficha Técnica</h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Baixa de insumos grama por grama. Saiba na hora quanto tem de carne, pão, queijo e molho na despensa.
            </p>
          </div>

          {/* 10. Financeiro */}
          <div className="bg-[#100E14] border border-zinc-800/90 hover:border-violet-500/50 p-5 rounded-2xl transition-all group">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-400 mb-3 group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-white">Caixa & Financeiro</h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Abertura e fechamento de caixa sem furos, controle de sangrias e DRE em tempo real com margem real.
            </p>
          </div>

          {/* 11. Clientes */}
          <div className="bg-[#100E14] border border-zinc-800/90 hover:border-pink-500/50 p-5 rounded-2xl transition-all group">
            <div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center text-pink-400 mb-3 group-hover:scale-110 transition-transform">
              <Heart className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-white">Clientes & Fidelidade</h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Acúmulo de pontos e cashback automático a cada pedido, incentivando os clientes a comprarem de novo.
            </p>
          </div>

          {/* 12. Resultados */}
          <div className="bg-[#100E14] border border-zinc-800/90 hover:border-[#FFC72C]/50 p-5 rounded-2xl transition-all group">
            <div className="w-10 h-10 rounded-xl bg-[#FFC72C]/15 flex items-center justify-center text-[#FFC72C] mb-3 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-white">Resultados & BI</h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Descubra os pratos mais vendidos, horários de pico, CMV médio e faturamento mensal sem planilhas complexas.
            </p>
          </div>
        </div>
      </section>

      {/* 6. 🛒 SEÇÃO CARDÁPIO (PRODUTOS, CATEGORIAS, IMAGENS, PREÇOS, QR CODE) */}
      <section id="cardapio" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-zinc-800/80">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-4 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DA291C]/20 text-[#FFC72C] text-xs font-black uppercase tracking-wider border border-[#FFC72C]/30">
              <QrCode className="w-3.5 h-3.5 text-[#FFC72C]" />
              <span>Cardápio Digital Moderno</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              O Cardápio Digital Mais Rápido e Desejado do Mercado
            </h2>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
              Apresente seus lanches, pizzas e porções com fotos gastronômicas de alta definição, adicionais que aumentam o ticket médio e QR Code direto na mesa do salão ou link no WhatsApp.
            </p>

            <ul className="space-y-3 text-xs sm:text-sm text-zinc-300 pt-2">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Fotos & Categorias:</strong> Organização visual por burgers, bebidas, porções e sobremesas.</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Personalização Inteligente:</strong> Adicionais de bacon, cheddar, ponto da carne e "sem cebola".</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>QR Code de Mesa:</strong> Cada mesa tem seu QR Code exclusivo para pedir sem esperar atendente.</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Exportação em PDF:</strong> Imprima o cardápio físico quando quiser com 1 clique.</span>
              </li>
            </ul>

            <div className="pt-4">
              <button
                onClick={() => {
                  playCashRegister();
                  setShowTrialModal(true);
                }}
                className="px-6 py-3.5 bg-gradient-to-r from-[#DA291C] to-[#FF7A00] hover:brightness-110 active:scale-95 text-white font-black text-sm rounded-xl shadow-lg shadow-red-950/40 flex items-center gap-2 cursor-pointer transition-all border border-[#FFC72C]/30"
              >
                <span>CRIAR MEU CARDÁPIO (15 DIAS GRÁTIS)</span>
                <ArrowRight className="w-4 h-4 text-[#FFC72C]" />
              </button>
            </div>
          </div>

          {/* Visual Showcase Card */}
          <div className="bg-[#121118] border border-zinc-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#DA291C]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFC72C]" />
                <span className="text-xs font-bold text-zinc-300">Cardápio ao Vivo • Mesa 04</span>
              </div>
              <span className="text-[11px] font-mono text-[#FFC72C] bg-[#FFC72C]/10 px-2 py-0.5 rounded border border-[#FFC72C]/20">
                QR Code Ativo
              </span>
            </div>

            <div className="space-y-3">
              {/* Product 1 */}
              <div className="p-3 bg-black/60 rounded-2xl border border-zinc-800/80 flex items-center gap-3">
                <img 
                  src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&auto=format&fit=crop&q=80" 
                  alt="Smash Angus" 
                  className="w-16 h-16 rounded-xl object-cover border border-[#DA291C]/40 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-white truncate">Smash Angus Duplo Cheddar</h4>
                    <span className="text-xs font-mono font-black text-[#FFC72C]">R$ 36,90</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-1">Carne Angus, cheddar cremoso e bacon artesanal.</p>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400">
                    <span className="bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-bold">+ Adicionais</span>
                  </div>
                </div>
              </div>

              {/* Product 2 */}
              <div className="p-3 bg-black/60 rounded-2xl border border-zinc-800/80 flex items-center gap-3">
                <img 
                  src="https://images.unsplash.com/photo-1576107232684-1279f3908594?w=200&auto=format&fit=crop&q=80" 
                  alt="Batata Rústica" 
                  className="w-16 h-16 rounded-xl object-cover border border-[#FF7A00]/40 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-white truncate">Batata Rústica com Alecrim & Queijo</h4>
                    <span className="text-xs font-mono font-black text-[#FFC72C]">R$ 22,90</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-1">Crocante por fora, macia por dentro com molho tártaro.</p>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-[#FFC72C]">
                    <span className="bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 font-bold">Mais Vendido</span>
                  </div>
                </div>
              </div>

              {/* QR Code Demo Section */}
              <div className="p-3 bg-[#1A141A] rounded-2xl border border-[#DA291C]/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-white rounded-xl">
                    <QrCode className="w-8 h-8 text-black" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">QR Code de Mesa Individual</div>
                    <div className="text-[10px] text-zinc-400">O cliente escaneia e pede em 30 segundos</div>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentView('cardapio_digital')}
                  className="text-xs font-bold text-[#FFC72C] bg-[#FFC72C]/10 hover:bg-[#FFC72C]/20 border border-[#FFC72C]/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Abrir Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. 📦 SEÇÃO OPERAÇÃO: “DO PEDIDO ATÉ A COZINHA, TUDO CONECTADO.” */}
      <section id="operacao" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-zinc-800/80">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-black uppercase tracking-wider text-[#00D26A] bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Fluxo Contínuo Sem Fricção
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mt-3 text-white">
            “Do pedido até a cozinha, tudo conectado.”
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 mt-3">
            Veja como a esteira de pedidos do Neon Food OS acaba de vez com os papéis perdidos e gritos no salão.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          {operationalSteps.map((st, i) => (
            <div 
              key={st.step} 
              className="bg-[#100E14] border border-zinc-800/90 rounded-2xl p-5 relative flex flex-col justify-between hover:border-zinc-700 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl font-mono font-black" style={{ color: st.color }}>
                    {st.step}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
                    {st.badge}
                  </span>
                </div>
                <h4 className="text-sm font-black text-white">{st.title}</h4>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{st.desc}</p>
              </div>

              {i < operationalSteps.length - 1 && (
                <div className="hidden md:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 text-zinc-600">
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 8. 📊 SEÇÃO RESULTADOS: VENDAS, PEDIDOS, PRODUTOS, LUCRO, HORÁRIOS, CLIENTES */}
      <section id="resultados" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-zinc-800/80">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-black uppercase tracking-wider text-[#FFC72C] bg-[#FFC72C]/10 px-3 py-1 rounded-full border border-[#FFC72C]/20">
            Inteligência de Negócio
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mt-3 text-white">
            Resultados Reais no Seu Caixa Todos os Dias
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 mt-3">
            Tenha clareza de onde vem cada centavo de lucro do seu restaurante.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: Vendas */}
          <div className="bg-[#100E14] border border-zinc-800/90 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-bold uppercase flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" /> Vendas do Dia
              </span>
              <span className="text-emerald-400 font-bold">+24% vs ontem</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-2">
              R$ 8.490,00
            </div>
            <p className="text-xs text-zinc-400 mt-1">Lançadas no PDV, Balcão, Mesas e Delivery sem furos.</p>
          </div>

          {/* Card 2: Pedidos */}
          <div className="bg-[#100E14] border border-zinc-800/90 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-bold uppercase flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-[#FF7A00]" /> Total de Pedidos
              </span>
              <span className="text-zinc-400">Ticket R$ 59,78</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#FF7A00] mt-2">
              142 pedidos
            </div>
            <p className="text-xs text-zinc-400 mt-1">Zero comanda perdida e zero cancelamento por atraso.</p>
          </div>

          {/* Card 3: Produtos Mais Vendidos */}
          <div className="bg-[#100E14] border border-zinc-800/90 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-bold uppercase flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-[#FFC72C]" /> Top Pratos Campeões
              </span>
              <span className="text-[#FFC72C] font-bold">Mais lucrativos</span>
            </div>
            <div className="text-sm font-bold text-white mt-2 space-y-1">
              <div className="flex justify-between">
                <span>1. Smash Angus Duplo</span>
                <span className="font-mono text-[#FFC72C]">48 vendas</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>2. Batata Rústica</span>
                <span className="font-mono">62 vendas</span>
              </div>
            </div>
          </div>

          {/* Card 4: Lucro Real & CMV */}
          <div className="bg-[#100E14] border border-zinc-800/90 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-bold uppercase flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-cyan-400" /> CMV & Margem Real
              </span>
              <span className="text-emerald-400 font-bold">Margem 38.4%</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-cyan-400 mt-2">
              28.2% CMV
            </div>
            <p className="text-xs text-zinc-400 mt-1">Cálculo de insumos em tempo real pela Ficha Técnica.</p>
          </div>

          {/* Card 5: Horários de Pico */}
          <div className="bg-[#100E14] border border-zinc-800/90 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-bold uppercase flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-violet-400" /> Horários de Pico
              </span>
              <span className="text-violet-300 font-bold">Rush Noturno</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-2">
              19h45 às 21h30
            </div>
            <p className="text-xs text-zinc-400 mt-1">Organize sua escala de atendentes e praça com dados.</p>
          </div>

          {/* Card 6: Clientes Fiéis */}
          <div className="bg-[#100E14] border border-zinc-800/90 p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-bold uppercase flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-pink-400" /> Recompra com Cashback
              </span>
              <span className="text-pink-400 font-bold">68% Fidelidade</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-pink-400 mt-2">
              +1.240 Clientes
            </div>
            <p className="text-xs text-zinc-400 mt-1">Retenção de clientes com programa de pontos próprio.</p>
          </div>
        </div>
      </section>

      {/* 9. ⚖️ COMPARATIVO COM COMPETIDORES (CONSUMER & ANOTA AÍ) + CALCULADORA */}
      <section id="comparativo" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-zinc-800/80">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-black uppercase tracking-wider text-[#DA291C] bg-[#DA291C]/10 px-3 py-1 rounded-full border border-[#DA291C]/20">
            Comparativo Direto
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mt-3 text-white">
            Por que migrar para o <span className="text-[#DA291C]">Neon Food OS</span>?
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 mt-3">
            Compare recurso a recurso e veja por que donos de restaurantes em todo o Brasil estão fazendo a troca.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-[#0E0D12]">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/60">
                <th className="py-4 px-5 text-xs font-bold text-zinc-400 uppercase">Recurso / Tecnologia</th>
                <th className="py-4 px-4 text-center text-xs font-black text-zinc-400">Consumer Tradicional</th>
                <th className="py-4 px-4 text-center text-xs font-black text-zinc-400">Anota AI</th>
                <th className="py-4 px-5 text-center text-sm font-black text-[#FFC72C] bg-[#DA291C]/15 border-x border-[#DA291C]/40">
                  ⚡ NEON FOOD OS
                </th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-zinc-800/60">
              <tr>
                <td className="py-3.5 px-5 font-semibold text-white">Preço acessível a partir de</td>
                <td className="py-3.5 px-4 text-center text-zinc-400">R$ 150+ /mês</td>
                <td className="py-3.5 px-4 text-center text-zinc-400">R$ 199+ /mês</td>
                <td className="py-3.5 px-5 text-center font-black text-emerald-400 bg-[#DA291C]/5 border-x border-[#DA291C]/40">
                  A partir de R$ 20/mês
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-5 font-semibold text-white">Frente de Caixa + Cozinha KDS + Cardápio Integrados</td>
                <td className="py-3.5 px-4 text-center text-zinc-400">Instalação pesada no PC</td>
                <td className="py-3.5 px-4 text-center text-zinc-400">Apenas WhatsApp/Delivery</td>
                <td className="py-3.5 px-5 text-center font-bold text-emerald-400 bg-[#DA291C]/5 border-x border-[#DA291C]/40">
                  ✓ 100% Nuvem, Celular, Tablet e PC
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-5 font-semibold text-white">Radar de Entregadores com GPS ao Vivo</td>
                <td className="py-3.5 px-4 text-center text-[#DA291C]">✕ Módulo extra cobrado à parte</td>
                <td className="py-3.5 px-4 text-center text-[#DA291C]">✕ Não possui</td>
                <td className="py-3.5 px-5 text-center font-bold text-emerald-400 bg-[#DA291C]/5 border-x border-[#DA291C]/40">
                  ✓ Incluso com Rastreio em Tempo Real
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-5 font-semibold text-white">Ficha Técnica com Baixa Automática de Insumos</td>
                <td className="py-3.5 px-4 text-center text-zinc-400">Básico e manual</td>
                <td className="py-3.5 px-4 text-center text-[#DA291C]">✕ Não possui</td>
                <td className="py-3.5 px-5 text-center font-bold text-emerald-400 bg-[#DA291C]/5 border-x border-[#DA291C]/40">
                  ✓ Alerta de Falta & CMV Automático
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-5 font-semibold text-white">Período de Teste Grátis</td>
                <td className="py-3.5 px-4 text-center text-zinc-400">Restrito / Cartão obrigatório</td>
                <td className="py-3.5 px-4 text-center text-zinc-400">Demonstração com vendedor</td>
                <td className="py-3.5 px-5 text-center font-black text-[#FFC72C] bg-[#DA291C]/5 border-x border-[#DA291C]/40">
                  ✓ 15 Dias Grátis Imediatos
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ROI & Savings Interactive Calculator */}
        <div className="mt-10 bg-gradient-to-br from-[#121118] to-[#181116] border border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#FFC72C] flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-[#FFC72C]" /> Simulador de Economia de Taxas
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white mt-2">
                Veja quanto dinheiro você para de perder em comissões
              </h3>
              <p className="text-xs sm:text-sm text-zinc-300 mt-2">
                Vendendo pelo seu próprio Cardápio e WhatsApp Neon, você não entrega de 12% a 27% do seu faturamento para plataformas de terceiros.
              </p>

              <div className="mt-6 space-y-5">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-zinc-300">Pedidos por Mês:</span>
                    <span className="text-[#FFC72C] text-sm font-mono">{monthlyOrdersCalc} pedidos</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="3000"
                    step="50"
                    value={monthlyOrdersCalc}
                    onChange={e => setMonthlyOrdersCalc(Number(e.target.value))}
                    className="w-full accent-[#DA291C] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-zinc-300">Ticket Médio por Pedido:</span>
                    <span className="text-[#FFC72C] text-sm font-mono">{formatBRL(avgTicketCalc)}</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="150"
                    step="5"
                    value={avgTicketCalc}
                    onChange={e => setAvgTicketCalc(Number(e.target.value))}
                    className="w-full accent-[#FF7A00] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Result Box */}
            <div className="bg-[#09090D] border border-zinc-800 rounded-2xl p-6 text-center shadow-inner">
              <div className="text-xs text-zinc-400 uppercase font-bold">Economia Estimada no Seu Bolso</div>
              <div className="text-4xl sm:text-5xl font-black font-mono text-emerald-400 mt-2">
                {formatBRL(monthlySavings)}
                <span className="text-xs font-normal text-zinc-400"> /mês</span>
              </div>
              <div className="text-sm font-black text-[#FFC72C] mt-1">
                {formatBRL(annualSavings)} economizados por ano!
              </div>

              <div className="mt-5 pt-4 border-t border-zinc-800 text-left text-xs space-y-1.5 text-zinc-400">
                <div className="flex justify-between">
                  <span>Comissão estimada marketplaces (12%):</span>
                  <span className="text-[#DA291C] font-bold">-{formatBRL(marketplaceCommission)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mensalidade Neon Pro:</span>
                  <span className="text-white font-bold">R$ 39,90</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-extrabold text-sm pt-2 border-t border-zinc-800">
                  <span>Lucro que fica com você:</span>
                  <span>+{formatBRL(monthlySavings)}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  playCashRegister();
                  setShowTrialModal(true);
                }}
                className="w-full mt-5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:brightness-110 active:scale-95 text-black font-black text-xs sm:text-sm py-3.5 rounded-xl shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
              >
                COMEÇAR A ECONOMIZAR HOJE (15 DIAS GRÁTIS)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 10. 💰 SEÇÃO PREÇOS: START, PRO, BUSINESS, PREMIUM COM 15 DIAS GRÁTIS */}
      <section id="planos" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-zinc-800/80">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-black uppercase tracking-wider text-[#00D26A] bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Planos Acessíveis & Transparentes
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mt-3 text-white">
            Escolha o Plano Ideal para a Sua Fase
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 mt-2">
            Todos os planos incluem 15 dias de teste grátis com tudo liberado. Cancele quando quiser.
          </p>

          {/* Billing Cycle Switch */}
          <div className="mt-6 inline-flex items-center bg-[#131118] p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => {
                playBeep(700, 0.03);
                setBillingCycle('monthly');
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                billingCycle === 'monthly' ? 'bg-[#DA291C] text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => {
                playBeep(750, 0.03);
                setBillingCycle('annual');
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                billingCycle === 'annual' ? 'bg-[#FF7A00] text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>Anual</span>
              <span className="text-[10px] bg-black/50 text-[#FFC72C] px-1.5 py-0.2 rounded font-black">20% OFF</span>
            </button>
          </div>
        </div>

        {/* 4 Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {saasPlans.map(plan => {
            const price = billingCycle === 'annual' ? (plan.priceAnnual / 12) : plan.priceMonthly;

            return (
              <div
                key={plan.id}
                className={`rounded-3xl p-5 sm:p-6 flex flex-col justify-between transition-all relative ${
                  plan.recommended
                    ? 'bg-gradient-to-b from-[#1E1116] to-[#120E15] border-2 border-[#FFC72C] shadow-[0_0_30px_rgba(255,199,44,0.3)] scale-[1.02]'
                    : 'bg-[#100E14] border border-zinc-800/90 hover:border-zinc-700'
                }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#DA291C] to-[#FF7A00] text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg flex items-center gap-1 border border-[#FFC72C]/40">
                    <Flame className="w-3 h-3 text-[#FFC72C]" />
                    <span>Mais Escolhido no Brasil</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-white">{plan.name}</h3>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#DA291C]/20 text-[#FFC72C] border border-[#FFC72C]/30">
                      15 DIAS GRÁTIS
                    </span>
                  </div>
                  
                  <p className="text-xs text-zinc-400 mt-2 min-h-[36px] leading-relaxed">{plan.description}</p>

                  <div className="mt-4 pb-4 border-b border-zinc-800">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs text-zinc-400">R$</span>
                      <span className="text-3xl font-black font-mono text-white">{price.toFixed(2).replace('.', ',')}</span>
                      <span className="text-xs text-zinc-400">/mês</span>
                    </div>
                    {billingCycle === 'annual' && (
                      <div className="text-[10px] text-emerald-400 font-bold mt-0.5">
                        Cobrado anualmente: {formatBRL(plan.priceAnnual)}
                      </div>
                    )}
                  </div>

                  <ul className="mt-4 space-y-2 text-xs text-zinc-300">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => {
                    playLevelUp();
                    setShowTrialModal(true);
                  }}
                  className={`w-full mt-6 py-3.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    plan.recommended
                      ? 'bg-gradient-to-r from-[#DA291C] via-[#E83324] to-[#FF7A00] hover:brightness-110 text-white shadow-lg shadow-red-950/50 border border-[#FFC72C]/40'
                      : 'bg-zinc-800/80 hover:bg-zinc-700 text-white border border-zinc-700'
                  }`}
                >
                  <span>TESTAR 15 DIAS GRÁTIS</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#FFC72C]" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 11. ❓ FAQ (ACORDEÃO INTERATIVO COMPLETO) */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-zinc-800/80">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-black uppercase tracking-wider text-[#FFC72C] bg-[#FFC72C]/10 px-3 py-1 rounded-full border border-[#FFC72C]/20">
            Tire Suas Dúvidas
          </span>
          <h2 className="text-3xl sm:text-4xl font-black mt-3 text-white">
            Perguntas Frequentes
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-2">
            Tudo o que você precisa saber antes de iniciar seus 15 dias gratuitos.
          </p>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, index) => {
            const isOpen = openFaqIndex === index;

            return (
              <div
                key={index}
                className={`rounded-2xl border transition-all ${
                  isOpen 
                    ? 'bg-[#15121B] border-[#DA291C]/40 shadow-lg' 
                    : 'bg-[#0E0D12] border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer"
                >
                  <span className="text-sm font-extrabold text-white flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[#FFC72C] shrink-0" />
                    <span>{item.q}</span>
                  </span>
                  <div className="w-6 h-6 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-800">
                    {isOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-[#FFC72C]" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-zinc-300 leading-relaxed border-t border-zinc-800/60 mt-1">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 12. 🔥 CTA FINAL: "SEU NEGÓCIO MERECE UMA OPERAÇÃO MAIS SIMPLES." */}
      <section className="border-t border-zinc-800/80 bg-gradient-to-b from-[#0B090F] via-[#1A0A0E] to-[#08070B] py-20 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#DA291C]/20 blur-[140px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10 space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#DA291C]/20 text-[#FFC72C] text-xs font-black uppercase tracking-wider border border-[#FFC72C]/30">
            <Flame className="w-4 h-4 text-[#DA291C]" />
            <span>Modernize Seu Restaurante Hoje</span>
          </div>

          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight uppercase leading-[1.1]">
            SEU NEGÓCIO MERECE UMA OPERAÇÃO MAIS SIMPLES.
          </h2>

          <p className="text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto font-medium">
            Cardápio, pedidos, atendimento, cozinha, estoque, caixa, clientes e gestão em um só lugar.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
            <button
              onClick={() => {
                playCashRegister();
                setShowTrialModal(true);
              }}
              className="w-full px-8 py-4 bg-gradient-to-r from-[#DA291C] via-[#E83324] to-[#FF7A00] hover:brightness-110 active:scale-95 text-white font-black text-base rounded-2xl shadow-[0_0_35px_rgba(218,41,28,0.6)] transition-all flex items-center justify-center gap-2.5 cursor-pointer border border-[#FFC72C]/40"
            >
              <span>COMEÇAR MEU TESTE GRÁTIS</span>
              <ArrowRight className="w-5 h-5 text-[#FFC72C]" />
            </button>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-5 text-xs text-zinc-400 font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 15 Dias 100% Grátis
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Sem Cartão de Crédito
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Suporte no WhatsApp
            </span>
          </div>
        </div>
      </section>

      {/* 13. FOOTER */}
      <footer className="border-t border-zinc-800/80 bg-[#07070A] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#DA291C] to-[#FFC72C] flex items-center justify-center text-black font-black">
              <Flame className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="font-black text-sm text-white flex items-center gap-1 justify-center md:justify-start">
                NEON<span className="text-[#DA291C]">FOOD</span> <span className="text-[#FFC72C]">OS</span>
              </div>
              <div className="text-[10px] text-zinc-500">Tecnologia Gastronômica Brasileira de Alto Desempenho</div>
            </div>
          </div>

          <div className="text-xs text-zinc-500">
            © 2026 Neon Food OS Tecnologias. CNPJ 38.492.011/0001-85. Todos os direitos reservados.
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-zinc-400">
            <button onClick={() => setCurrentView('overview_bi')} className="hover:text-white cursor-pointer">Painel Loja</button>
            <button onClick={() => setCurrentView('super_admin')} className="hover:text-white cursor-pointer">Super Admin</button>
            <button onClick={() => setShowTrialModal(true)} className="text-[#FFC72C] hover:underline cursor-pointer">15 Dias Grátis</button>
          </div>
        </div>
      </footer>

      {/* 14. 15-DAY FREE TRIAL MODAL (ALTA CONVERSÃO) */}
      {showTrialModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121118] border-2 border-[#DA291C]/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setShowTrialModal(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#DA291C] to-[#FFC72C] flex items-center justify-center mb-4 text-black shadow-md">
              <Flame className="w-6 h-6 text-black" />
            </div>

            <h3 className="text-xl font-black text-white">Ativar Meus 15 Dias Grátis</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Sem cartão de crédito. Comece a receber pedidos e testar a cozinha imediatamente.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowTrialModal(false);
                handleStartTrial();
              }}
              className="mt-5 space-y-3 text-left"
            >
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">Nome do Restaurante / Lanchonete</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Burger Smash Club"
                  className="w-full bg-[#181622] border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-[#FFC72C] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">Seu WhatsApp (com DDD)</label>
                <input
                  type="tel"
                  required
                  placeholder="(11) 98765-4321"
                  className="w-full bg-[#181622] border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-[#FFC72C] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">Seu E-mail Profissional</label>
                <input
                  type="email"
                  required
                  placeholder="gerente@restaurante.com.br"
                  className="w-full bg-[#181622] border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-[#FFC72C] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-4 bg-gradient-to-r from-[#DA291C] via-[#E83324] to-[#FF7A00] hover:brightness-110 active:scale-95 text-white font-black text-sm py-3.5 rounded-xl shadow-lg shadow-red-950/50 transition-all cursor-pointer border border-[#FFC72C]/40"
              >
                QUERO COMEÇAR AGORA
              </button>

              <div className="text-center text-[10px] text-zinc-500 mt-2">
                🔒 Seus dados estão protegidos sob criptografia de ponta a ponta e LGPD.
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
