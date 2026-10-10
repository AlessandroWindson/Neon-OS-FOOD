import React, { useState } from 'react';
import { 
  Crown, 
  Check, 
  Sparkles, 
  X, 
  Calendar, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Flame,
  CreditCard,
  Zap,
  HelpCircle,
  Clock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SaaSPlan } from '../types';
import { formatBRL } from '../utils/formatters';
import { playCashRegister, playBeep, playLevelUp } from '../utils/audio';

interface MeuPlanoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MeuPlanoModal: React.FC<MeuPlanoModalProps> = ({ isOpen, onClose }) => {
  const { saasPlans, tenant } = useApp();
  const [selectedPlanId, setSelectedPlanId] = useState<string>('plan_pro');
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  // Official reference plans specified in the Master Prompt:
  // START R$ 20/mês, PRO R$ 39,90/mês, BUSINESS R$ 69,90/mês, PREMIUM R$ 99,90/mês
  const defaultPlans: SaaSPlan[] = [
    {
      id: 'plan_start',
      name: 'START',
      priceMonthly: 20.00,
      priceAnnual: 199.00,
      description: 'Ideal para pequenos negócios, lanchonetes e início de operação.',
      features: [
        'Cardápio Digital com QR Code',
        'Frente de Caixa (Vendas / Balcão)',
        'Atendimento Presencial no Celular',
        'Até 2 atendentes simultâneos',
        'Controle de Estoque Básico',
        'Suporte por E-mail'
      ],
      maxOrdersMonth: 500,
      maxBranches: 1,
      maxUsers: 2,
      supportType: 'E-mail'
    },
    {
      id: 'plan_pro',
      name: 'PRO',
      priceMonthly: 39.90,
      priceAnnual: 399.00,
      recommended: true,
      description: 'Perfeito para hamburguerias, pizzarias e restaurantes em crescimento.',
      features: [
        'Tudo do Plano Start',
        'Cozinha em Tempo Real com Cronômetro',
        'Mesas & Comandas Digitais',
        'Delivery & Gestão de Motoboys',
        'Até 5 atendentes simultâneos',
        'Composição do Produto & Custos',
        'Fidelidade & Cupons WhatsApp',
        'Impressão Térmica 58mm/80mm',
        'Suporte Humanizado WhatsApp'
      ],
      maxOrdersMonth: 2000,
      maxBranches: 2,
      maxUsers: 5,
      supportType: 'WhatsApp Humanizado'
    },
    {
      id: 'plan_business',
      name: 'BUSINESS',
      priceMonthly: 69.90,
      priceAnnual: 699.00,
      description: 'Para operações dinâmicas com alto volume de pedidos diários.',
      features: [
        'Tudo do Plano Pro',
        'Atendentes Ilimitados',
        'Engenharia de Cardápio (Margem & Lucro)',
        'Gamificação de Metas da Equipe',
        'Financeiro & DRE Automatizado',
        'Relatórios Avançados de Gestão',
        'Operação Offline com Sincronização',
        'Integração via Webhooks (iFood/WhatsApp)',
        'Suporte Prioritário VIP 24/7'
      ],
      maxOrdersMonth: 'ilimitado',
      maxBranches: 5,
      maxUsers: 15,
      supportType: 'WhatsApp VIP 24/7'
    },
    {
      id: 'plan_premium',
      name: 'PREMIUM',
      priceMonthly: 99.90,
      priceAnnual: 999.00,
      description: 'Ecossistema completo com Inteligência de Gestão e Multiunidades.',
      features: [
        'Tudo do Plano Business',
        'Multiunidades & Franquias Ilimitadas',
        'Copiloto com Inteligência Artificial',
        'Auditoria Completa & Histórico de Atividades',
        'Domínio Próprio para Cardápio Digital',
        'Gerente de Contas Dedicado',
        'Backup e Segurança Bancária'
      ],
      maxOrdersMonth: 'ilimitado',
      maxBranches: 999,
      maxUsers: 999,
      supportType: 'Gerente Dedicado'
    }
  ];

  const plans = saasPlans && saasPlans.length > 0 ? saasPlans : defaultPlans;
  const currentPlan = plans.find(p => p.id === selectedPlanId) || plans[1];

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find(p => p.id === planId);
    playCashRegister();
    setSuccessFeedback(`Tudo certo! Você selecionou o Plano ${plan?.name || ''}.`);
    setTimeout(() => {
      setSuccessFeedback(null);
    }, 3500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-[#101016] border border-[#27273A] rounded-3xl w-full max-w-5xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.8)] my-8 text-white animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-[#171722] to-[#12121A] border-b border-[#242434] relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#DA291C] to-[#FF7A00] flex items-center justify-center text-[#FFC72C] shadow-[0_0_20px_rgba(218,41,28,0.4)] border border-[#FFC72C]/30 shrink-0">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-white">Meu Plano & Assinatura</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Teste Grátis Ativo
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Gerencie os recursos liberados, limites da operação e faturamento da sua empresa.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#1C1C28] hover:bg-[#252536] text-zinc-400 hover:text-white flex items-center justify-center transition-colors self-end sm:self-auto cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Plan Summary Card */}
        <div className="p-6 sm:p-8 pb-4">
          <div className="bg-[#161622] border border-[#2A2A3E] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#DA291C]" />
                <span>Plano Contratado</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{currentPlan.name}</span>
                <span className="text-sm font-bold text-[#FFC72C]">{formatBRL(currentPlan.priceMonthly)}/mês</span>
              </div>
              <p className="text-xs text-zinc-300">{currentPlan.description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="p-3 rounded-xl bg-[#1E1E2E] border border-[#2E2E42]">
                <div className="text-zinc-400 text-[10px] uppercase font-bold flex items-center gap-1 mb-0.5">
                  <Clock className="w-3 h-3 text-[#FFC72C]" />
                  <span>Período de Teste</span>
                </div>
                <div className="font-extrabold text-white text-sm">15 Dias Grátis</div>
                <div className="text-[10px] text-emerald-400 font-semibold">12 dias restantes</div>
              </div>

              <div className="p-3 rounded-xl bg-[#1E1E2E] border border-[#2E2E42]">
                <div className="text-zinc-400 text-[10px] uppercase font-bold flex items-center gap-1 mb-0.5">
                  <Calendar className="w-3 h-3 text-sky-400" />
                  <span>Próximo Vencimento</span>
                </div>
                <div className="font-extrabold text-white text-sm">24/03/2026</div>
                <div className="text-[10px] text-zinc-400">Renovação mensal</div>
              </div>
            </div>
          </div>

          {/* Success Feedback Alert */}
          {successFeedback && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successFeedback}</span>
            </div>
          )}
        </div>

        {/* Plans Comparison Grid */}
        <div className="px-6 sm:px-8 pb-8">
          <div className="mb-4">
            <h3 className="font-bold text-sm text-white">Escolha ou Altere seu Plano</h3>
            <p className="text-xs text-zinc-400">Faça upgrade a qualquer momento com cálculo proporcional automático.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map(plan => {
              const isSelected = selectedPlanId === plan.id;
              return (
                <div 
                  key={plan.id}
                  className={`rounded-2xl p-5 flex flex-col justify-between transition-all relative border ${
                    isSelected 
                      ? 'bg-gradient-to-b from-[#1E1E2E] to-[#151520] border-[#FFC72C] shadow-[0_0_20px_rgba(255,199,44,0.2)]' 
                      : 'bg-[#14141E] border-[#242436] hover:border-[#34344E]'
                  }`}
                >
                  {plan.recommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-[#DA291C] to-[#FF7A00] text-white shadow-md">
                      Mais Escolhido
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-base text-white tracking-tight">{plan.name}</span>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-[#FFC72C] text-black flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                      )}
                    </div>

                    <div className="mb-3">
                      <div className="text-2xl font-black text-[#FFC72C] tracking-tight">
                        {formatBRL(plan.priceMonthly)}
                        <span className="text-xs font-normal text-zinc-400">/mês</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-snug mt-1">{plan.description}</p>
                    </div>

                    <div className="h-px bg-[#242436] my-3" />

                    <div className="space-y-2 mb-4">
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-tight text-[11px]">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#FFC72C] text-zinc-950 font-black shadow-[0_0_12px_rgba(255,199,44,0.4)]'
                        : 'bg-[#202030] text-white hover:bg-[#DA291C] hover:text-white'
                    }`}
                  >
                    {isSelected ? 'Plano Ativo' : 'Mudar para este'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Guarantee & Humanized Help */}
          <div className="mt-6 p-4 rounded-2xl bg-[#161622] border border-[#252536] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Sem fidelidade obrigatória. Cancele ou altere seu plano quando desejar com 1 clique.</span>
            </div>
            <a
              href="https://wa.me/5511987654321?text=Ol%C3%A1%2C%20gostaria%20de%20tirar%20d%C3%BAvidas%20sobre%20os%20planos%20do%20NEON%20FOOD%20OS."
              target="_blank"
              rel="noreferrer"
              className="text-[#FFC72C] hover:underline font-bold flex items-center gap-1 cursor-pointer shrink-0"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Falar com especialista no WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
