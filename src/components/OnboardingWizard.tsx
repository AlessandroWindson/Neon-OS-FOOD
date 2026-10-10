import React, { useState } from 'react';
import { 
  Building2, 
  Utensils, 
  UploadCloud, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Flame, 
  Sparkles, 
  QrCode, 
  Smartphone, 
  CookingPot, 
  DollarSign, 
  Layers, 
  FileText,
  FileUp
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { playCashRegister, playLevelUp, playBeep } from '../utils/audio';

export const OnboardingWizard: React.FC = () => {
  const { setCurrentView, tenant, updateTenantSettings } = useApp();
  const [step, setStep] = useState(1);

  // Step 1
  const [restaurantName, setRestaurantName] = useState('Lanchonete Dulci');
  const [cnpj, setCnpj] = useState('38.492.011/0001-85');
  const [city, setCity] = useState('São Paulo - SP');

  // Step 2
  const [segment, setSegment] = useState<'hamburgueria' | 'pizzaria' | 'acai' | 'bar_restaurante' | 'oriental'>('hamburgueria');

  // Step 3
  const [menuSource, setMenuSource] = useState<'preset' | 'ifood' | 'pdf'>('preset');
  const [isImporting, setIsImporting] = useState(false);

  // Step 4
  const [channels, setChannels] = useState({
    pdv: true,
    kds: true,
    whatsapp: true,
    cardapio_online: true,
  });

  const handleNext = () => {
    playBeep(880, 0.05);
    if (step < 4) {
      setStep(step + 1);
    } else {
      // Finish onboarding
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#E31837', '#FF7A00', '#FFC72C', '#00D26A', '#77D4E1'],
        });
      } catch (e) {}
      playLevelUp();
      playCashRegister();
      setCurrentView('overview_bi');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#111117] border border-[#262636] rounded-3xl p-6 sm:p-10 shadow-2xl relative">
        {/* Progress header */}
        <div className="flex items-center justify-between border-b border-[#222230] pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E31837] to-[#FF7A00] flex items-center justify-center shadow-lg">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs text-[#A1A1AA] uppercase font-bold tracking-wider">Passo {step} de 4</div>
              <h2 className="text-lg font-black text-white">
                {step === 1 && '1. Identidade do seu Restaurante'}
                {step === 2 && '2. Escolha seu Segmento Gastronômico'}
                {step === 3 && '3. Configuração do Cardápio Inteligente'}
                {step === 4 && '4. Ativar Módulos Operacionais'}
              </h2>
            </div>
          </div>

          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  s === step
                    ? 'w-7 bg-gradient-to-r from-[#E31837] to-[#FF7A00]'
                    : s < step
                    ? 'w-3 bg-[#00D26A]'
                    : 'w-3 bg-[#242433]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Identity */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-xs text-[#A1A1AA]">
              Preencha os dados básicos do seu estabelecimento para personalizarmos os recibos, cardápios e relatórios fiscais.
            </p>
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#A1A1AA] mb-1">Nome Fantasia do Estabelecimento</label>
              <input
                type="text"
                value={restaurantName}
                onChange={e => setRestaurantName(e.target.value)}
                placeholder="Ex: Lanchonete Dulci"
                className="w-full bg-[#181824] border border-[#2B2B3C] rounded-xl px-4 py-3 text-xs text-white placeholder-[#52525B] focus:border-[#E31837] focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#A1A1AA] mb-1">CNPJ (ou CPF)</label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={e => setCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="w-full bg-[#181824] border border-[#2B2B3C] rounded-xl px-4 py-3 text-xs text-white placeholder-[#52525B] focus:border-[#E31837] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#A1A1AA] mb-1">Cidade / Estado</label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="São Paulo - SP"
                  className="w-full bg-[#181824] border border-[#2B2B3C] rounded-xl px-4 py-3 text-xs text-white placeholder-[#52525B] focus:border-[#E31837] focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Segment */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-[#A1A1AA]">
              O Neon Food OS adapta as estações KDS e fichas técnicas automaticamente conforme o seu nicho.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { id: 'hamburgueria', label: 'Hamburgueria & Smash', desc: 'Grelha, Frituras, Combos', icon: '🍔' },
                { id: 'pizzaria', label: 'Pizzaria Artesanal', desc: 'Massa, Forno, Sabores Meio a Meio', icon: '🍕' },
                { id: 'acai', label: 'Açaí, Sobremesas & Bowls', desc: 'Acompanhamentos por peso/adicionais', icon: '🍧' },
                { id: 'bar_restaurante', label: 'Bar, Chopp & Petiscos', desc: 'Controle de Mesas & Comandas', icon: '🍺' },
                { id: 'oriental', label: 'Sushi & Gastronomia Japonesa', desc: 'Sushibar, Combos e Rodízio', icon: '🍱' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setSegment(item.id as any)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    segment === item.id
                      ? 'bg-[#E31837]/15 border-[#E31837] shadow-[0_0_15px_rgba(227,24,55,0.3)]'
                      : 'bg-[#181824] border-[#2B2B3C] hover:border-[#3D3D52]'
                  }`}
                >
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="text-xs font-black text-white">{item.label}</div>
                  <div className="text-[10px] text-[#A1A1AA] mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Menu Import */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-xs text-[#A1A1AA]">
              Como você prefere carregar seus pratos, adicionais e preços no sistema?
            </p>

            <div className="space-y-3">
              <button
                onClick={() => setMenuSource('preset')}
                className={`w-full p-4 rounded-2xl border flex items-center justify-between text-left transition-all ${
                  menuSource === 'preset'
                    ? 'bg-[#00D26A]/15 border-[#00D26A] text-white'
                    : 'bg-[#181824] border-[#2B2B3C] text-[#A1A1AA]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#00D26A]/20 text-[#00D26A] flex items-center justify-center font-bold">
                    ⚡
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">Usar Cardápio Base Recomendado (Mais Rápido)</div>
                    <div className="text-[10px] text-[#A1A1AA]">
                      Carrega 10 pratos campeões de venda com ingredientes, custos e margens de lucro já calculados.
                    </div>
                  </div>
                </div>
                {menuSource === 'preset' && <CheckCircle2 className="w-5 h-5 text-[#00D26A]" />}
              </button>

              <button
                onClick={() => setMenuSource('ifood')}
                className={`w-full p-4 rounded-2xl border flex items-center justify-between text-left transition-all ${
                  menuSource === 'ifood'
                    ? 'bg-[#E31837]/15 border-[#E31837] text-white'
                    : 'bg-[#181824] border-[#2B2B3C] text-[#A1A1AA]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E31837]/20 text-[#FF2B4E] flex items-center justify-center font-bold">
                    🔴
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">Importar Link da Loja iFood</div>
                    <div className="text-[10px] text-[#A1A1AA]">
                      Nossa IA lê fotos, descrições, categorias e preços do iFood em 10 segundos.
                    </div>
                  </div>
                </div>
                {menuSource === 'ifood' && <CheckCircle2 className="w-5 h-5 text-[#FF2B4E]" />}
              </button>

              <button
                onClick={() => setMenuSource('pdf')}
                className={`w-full p-4 rounded-2xl border flex items-center justify-between text-left transition-all ${
                  menuSource === 'pdf'
                    ? 'bg-[#FF7A00]/15 border-[#FF7A00] text-white'
                    : 'bg-[#181824] border-[#2B2B3C] text-[#A1A1AA]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF7A00]/20 text-[#FF7A00] flex items-center justify-center font-bold">
                    <FileUp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">Upload de PDF ou Foto do Cardápio</div>
                    <div className="text-[10px] text-[#A1A1AA]">
                      Digitalização com reconhecimento de texto OCR inteligente.
                    </div>
                  </div>
                </div>
                {menuSource === 'pdf' && <CheckCircle2 className="w-5 h-5 text-[#FF7A00]" />}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Modules Activation */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-xs text-[#A1A1AA]">
              Selecione quais telas e funcionalidades você deseja ativar na sua operação diária:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'pdv', label: 'Frente de Caixa (Balcão)', desc: 'Atalhos F2, Pix no QR Code e Impressão Térmica', icon: DollarSign, color: 'text-[#E31837]' },
                { key: 'kds', label: 'Tela da Cozinha em Tempo Real', desc: 'Grelha, Fritura, Montagem sem papel', icon: CookingPot, color: 'text-[#00D26A]' },
                { key: 'whatsapp', label: 'Atendimento Automático no WhatsApp', desc: 'Recebe e anota pedidos automáticos 24h', icon: Smartphone, color: 'text-[#FFC72C]' },
                { key: 'cardapio_online', label: 'Cardápio Online & WhatsApp', desc: 'Link direto, QR Code na mesa e PDF de alta qualidade', icon: Layers, color: 'text-[#FFC72C]' },
              ].map(item => {
                const Icon = item.icon;
                const active = (channels as any)[item.key];

                return (
                  <button
                    key={item.key}
                    onClick={() => setChannels(prev => ({ ...prev, [item.key]: !active }))}
                    className={`p-4 rounded-2xl border text-left flex items-start justify-between transition-all ${
                      active
                        ? 'bg-[#1C1C28] border-[#FF7A00]/50 shadow-sm'
                        : 'bg-[#12121A] border-[#222230] opacity-50'
                    }`}
                  >
                    <div className="flex gap-3">
                      <Icon className={`w-5 h-5 ${item.color} shrink-0 mt-0.5`} />
                      <div>
                        <div className="text-xs font-black text-white">{item.label}</div>
                        <div className="text-[10px] text-[#A1A1AA] mt-0.5">{item.desc}</div>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${active ? 'bg-[#00D26A] border-[#00D26A]' : 'border-[#444]'}`}>
                      {active && <CheckCircle2 className="w-3 h-3 text-black" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="mt-8 pt-5 border-t border-[#222230] flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => { setStep(step - 1); playBeep(700, 0.05); }}
              className="flex items-center gap-2 text-xs font-bold text-[#A1A1AA] hover:text-white px-4 py-2.5 rounded-xl hover:bg-[#1C1C26] transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            className="bg-gradient-to-r from-[#E31837] via-[#FF7A00] to-[#FFC72C] text-black font-black text-xs px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(227,24,55,0.4)] hover:shadow-[0_0_30px_rgba(227,24,55,0.6)] transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>{step === 4 ? 'CONCLUIR E ACESSAR PAINEL' : 'Próximo Passo'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
