import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  QrCode, 
  Copy, 
  Check, 
  Save, 
  CheckCircle2, 
  Sparkles, 
  Building2, 
  Smartphone, 
  Mail, 
  Key, 
  CreditCard, 
  DollarSign, 
  HelpCircle, 
  ShieldCheck, 
  ExternalLink,
  Eye,
  RefreshCw,
  Zap,
  Info
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { playBeep, playCashRegister } from '../utils/audio';
import { generatePixPayload, getPixQrCodeUrl } from '../utils/pix';

export const PixConfiguracaoPainel: React.FC = () => {
  const { tenant, updateTenantSettings } = useApp();

  // PIX Local States
  const [pixKeyType, setPixKeyType] = useState<'cnpj' | 'cpf' | 'email' | 'phone' | 'random'>(
    tenant.settings.pixKeyType || 'cnpj'
  );
  const [pixKey, setPixKey] = useState(tenant.settings.pixKey || '38492011000185');
  const [beneficiaryName, setBeneficiaryName] = useState(
    tenant.settings.pixBeneficiaryName || tenant.name || 'Lanchonete Dulci'
  );
  const [pixCity, setPixCity] = useState(tenant.settings.pixCity || 'Sao Paulo');

  // Test Simulator State
  const [testAmount, setTestAmount] = useState<number>(58.90);
  const [testTxId, setTestTxId] = useState<string>('PED-1042');
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Dynamic placeholders and tips based on selected Pix key type
  const typeConfig = useMemo(() => {
    switch (pixKeyType) {
      case 'cnpj':
        return {
          label: 'CNPJ',
          icon: Building2,
          placeholder: '00.000.000/0001-00 ou 00000000000100',
          helper: 'Informe o CNPJ da empresa titular da conta bancária.',
          example: '38492011000185',
        };
      case 'cpf':
        return {
          label: 'CPF',
          icon: CreditCard,
          placeholder: '000.000.000-00 ou 00000000000',
          helper: 'Informe o CPF do titular da conta bancária da loja.',
          example: '12345678900',
        };
      case 'phone':
        return {
          label: 'Celular / Telefone',
          icon: Smartphone,
          placeholder: '+5511999999999 ou 11999999999',
          helper: 'Informe o celular com DDD (com ou sem +55).',
          example: '+5511987654321',
        };
      case 'email':
        return {
          label: 'E-mail',
          icon: Mail,
          placeholder: 'pagamentos@sualoja.com.br',
          helper: 'Informe o e-mail cadastrado como chave Pix no seu banco.',
          example: 'financeiro@neonfood.com.br',
        };
      case 'random':
        return {
          label: 'Chave Aleatória (EVP)',
          icon: Key,
          placeholder: '123e4567-e89b-12d3-a456-426614174000',
          helper: 'Cole o código UUID aleatório de 32/36 caracteres gerado no seu banco.',
          example: '8f7d4e21-9a3b-4c5d-8e6f-123456789abc',
        };
    }
  }, [pixKeyType]);

  // Clean key for payload generation
  const cleanKey = useMemo(() => {
    if (pixKeyType === 'cnpj' || pixKeyType === 'cpf') {
      return pixKey.replace(/\D/g, '');
    }
    if (pixKeyType === 'phone') {
      const numbers = pixKey.replace(/\D/g, '');
      if (numbers.length === 10 || numbers.length === 11) {
        return `+55${numbers}`;
      }
      if (numbers.length === 12 || numbers.length === 13) {
        return `+${numbers}`;
      }
      return pixKey.trim();
    }
    return pixKey.trim();
  }, [pixKey, pixKeyType]);

  // Generate Real PIX Payload
  const currentPixPayload = useMemo(() => {
    if (!cleanKey) return '';
    return generatePixPayload({
      pixKey: cleanKey,
      pixKeyType,
      merchantName: beneficiaryName || tenant.name,
      merchantCity: pixCity || 'SAO PAULO',
      amount: testAmount > 0 ? testAmount : undefined,
      txId: testTxId || 'PED-CARDAPIO',
      description: `Pedido ${tenant.name}`,
    });
  }, [cleanKey, pixKeyType, beneficiaryName, tenant.name, pixCity, testAmount, testTxId]);

  // QR Code Image URL
  const qrCodeImageUrl = useMemo(() => {
    return getPixQrCodeUrl(currentPixPayload, 300);
  }, [currentPixPayload]);

  // Handle Save
  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateTenantSettings({
      pixKeyType,
      pixKey: cleanKey,
      pixBeneficiaryName: beneficiaryName.trim(),
      pixCity: pixCity.trim(),
    });
    setSavedSuccess(true);
    playCashRegister();
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Copy Copia e Cola Payload
  const handleCopyPayload = () => {
    if (!currentPixPayload) return;
    navigator.clipboard.writeText(currentPixPayload);
    setCopiedPayload(true);
    playBeep(980, 0.08);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="space-y-4 sm:space-y-6 select-none pb-12">
      {/* Banner Principal de Configuração PIX */}
      <motion.div 
        layout
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative overflow-hidden p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#0D1F1A] via-[#102922] to-[#0A1A15] border border-[#00E676]/40 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6"
      >
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#00E676] px-3 py-1 rounded-full bg-[#00E676]/15 border border-[#00E676]/30 flex items-center gap-1.5 shadow-sm">
              <QrCode className="w-3.5 h-3.5 text-[#00E676]" />
              CONFIGURAÇÕES DE PAGAMENTO & PIX
            </span>
            <span className="text-xs text-zinc-500">•</span>
            <span className="text-xs font-bold text-[#FFC72C] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00E676]" />
              Padrão BR Code Banco Central (EMVCo)
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-black font-display text-white tracking-tight pt-1 flex items-center gap-2 sm:gap-3 flex-wrap">
            <span>Configurações de Pagamento & Chave Pix</span>
            <span className="text-xs font-bold bg-[#00E676]/20 text-[#00E676] px-2.5 py-1 rounded-xl border border-[#00E676]/40">
              QR Code Automático
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
            Configure a Chave Pix da loja para que o sistema gere automaticamente o <strong className="text-white">QR Code estático e dinâmico</strong> baseado no valor total do pedido para exibição direta no checkout do cardápio digital.
          </p>
        </div>

        {/* Botão de Salvar no Topo */}
        <div className="flex items-center gap-3 w-full lg:w-auto z-10">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            onClick={handleSaveSettings}
            className="w-full lg:w-auto bg-gradient-to-r from-[#00E676] to-[#00B050] hover:brightness-110 text-black px-6 py-3.5 min-h-[44px] rounded-2xl text-xs sm:text-sm font-black shadow-[0_0_20px_rgba(0,230,118,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 border border-[#00E676]/50 shrink-0"
          >
            <Save className="w-4 h-4 text-black shrink-0" />
            <span>SALVAR CONFIGURAÇÕES</span>
          </motion.button>
        </div>

        {/* Glow de fundo */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#00E676]/10 rounded-full blur-3xl pointer-events-none" />
      </motion.div>

      {/* Alerta de Sucesso ao Salvar */}
      <AnimatePresence>
        {savedSuccess && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="p-4 bg-[#00E676]/20 border border-[#00E676] rounded-2xl text-xs text-[#00E676] font-black flex items-center justify-between gap-2 shadow-lg overflow-hidden"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-[#00E676]" />
              <span>Chave Pix e parâmetros atualizados! Todos os novos pedidos do cardápio digital já receberão o QR Code instantâneo.</span>
            </div>
            <span className="text-[10px] bg-[#00E676] text-black px-2 py-0.5 rounded-md font-black shrink-0">
              ATIVO
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid Principal: Configuração da Chave (Esquerda) + Simulador e QR Code em Tempo Real (Direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* COLUNA ESQUERDA: FORMULÁRIO DE DADOS DA CHAVE (7 colunas) */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-6">
          <div className="bg-[#12121A] border border-[#242438] p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4 sm:space-y-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#00E676]/10 border border-[#00E676]/30 text-[#00E676]">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">Dados da Chave Pix Bancária</h3>
                  <p className="text-xs text-zinc-400">Conta bancária onde os pagamentos dos clientes serão creditados</p>
                </div>
              </div>
            </div>

            {/* 1. SELETOR DE TIPO DE CHAVE PIX */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-2">
                1. Tipo de Chave Pix Cadastrada no Banco
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { type: 'cnpj', label: 'CNPJ', icon: Building2 },
                  { type: 'cpf', label: 'CPF', icon: CreditCard },
                  { type: 'phone', label: 'Celular', icon: Smartphone },
                  { type: 'email', label: 'E-mail', icon: Mail },
                  { type: 'random', label: 'Chave Aleatória (EVP)', icon: Key },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = pixKeyType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => {
                        setPixKeyType(item.type as any);
                        playBeep(700, 0.04);
                      }}
                      className={`p-3 min-h-[44px] rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#00E676]/15 border-[#00E676] text-white shadow-[0_0_12px_rgba(0,230,118,0.25)] font-black'
                          : 'bg-[#161624] border-[#282838] text-zinc-400 hover:text-white hover:bg-[#1A1A2C]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#00E676]' : 'text-zinc-500'}`} />
                      <span className="text-xs font-bold truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. CAMPO DA CHAVE PIX */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase text-zinc-400 flex items-center gap-1.5">
                  <span>2. Chave Pix ({typeConfig.label})</span>
                  <span className="text-[#DA291C]">*</span>
                </label>
                <span className="text-[10px] text-zinc-500">
                  Ex: {typeConfig.example}
                </span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder={typeConfig.placeholder}
                  className="w-full min-h-[44px] bg-[#161624] border border-[#282838] focus:border-[#00E676] rounded-2xl px-4 py-3 text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none transition-all shadow-inner"
                />
                {pixKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setPixKey('');
                      playBeep(400, 0.05);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 bg-zinc-800 rounded-lg cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-[#00E676] shrink-0" />
                <span>{typeConfig.helper}</span>
              </p>
            </div>

            {/* 3. NOME DO TITULAR / BENEFICIÁRIO & CIDADE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase text-zinc-400">
                    3. Nome do Favorecido / Razão Social
                  </label>
                  <span className="text-[10px] text-zinc-500">
                    {beneficiaryName.length}/25
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={25}
                  value={beneficiaryName}
                  onChange={(e) => setBeneficiaryName(e.target.value)}
                  placeholder="Ex: NEON BURGER BAR LTDA"
                  className="w-full min-h-[42px] bg-[#161624] border border-[#282838] focus:border-[#00E676] rounded-2xl px-4 py-2.5 text-xs text-white uppercase focus:outline-none transition-all"
                />
                <p className="text-[10px] text-zinc-500">
                  Nome que o cliente verá no app do banco (máx. 25 letras).
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase text-zinc-400">
                    4. Cidade da Conta Bancária
                  </label>
                  <span className="text-[10px] text-zinc-500">
                    {pixCity.length}/15
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={15}
                  value={pixCity}
                  onChange={(e) => setPixCity(e.target.value)}
                  placeholder="Ex: SAO PAULO"
                  className="w-full min-h-[42px] bg-[#161624] border border-[#282838] focus:border-[#00E676] rounded-2xl px-4 py-2.5 text-xs text-white uppercase focus:outline-none transition-all"
                />
                <p className="text-[10px] text-zinc-500">
                  Município da agência bancária (máx. 15 letras).
                </p>
              </div>
            </div>

            {/* Info Box sobre o fluxo no Cardápio */}
            <div className="p-4 bg-[#161624] border border-zinc-800 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#FFC72C]">
                <Zap className="w-4 h-4 text-[#FFC72C] shrink-0" />
                <span>Como funciona no Cardápio Digital:</span>
              </div>
              <ul className="text-xs text-zinc-300 space-y-1.5 list-disc list-inside">
                <li>O cliente escolhe os produtos e clica em <strong className="text-white">"Finalizar com PIX"</strong>.</li>
                <li>O sistema calcula o total do carrinho e gera o <strong className="text-[#00E676]">QR Code dinâmico</strong> na hora com botão de <strong className="text-white">Copiar Pix</strong>.</li>
                <li>O pedido é enviado com o comprovante no WhatsApp e vai direto para a cozinha (KDS).</li>
              </ul>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: SIMULADOR & TESTADOR DE QR CODE EM TEMPO REAL (5 colunas) */}
        <div className="lg:col-span-5 space-y-4 sm:space-y-6">
          <div className="bg-[#12121A] border border-[#242438] p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#FFC72C]/10 border border-[#FFC72C]/30 text-[#FFC72C]">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">Prévia do QR Code Dinâmico</h3>
                  <p className="text-xs text-zinc-400">Simulação em tempo real para conferência</p>
                </div>
              </div>

              <span className="text-[10px] font-black bg-[#00E676]/20 text-[#00E676] px-2.5 py-1 rounded-full border border-[#00E676]/30">
                TEMPO REAL
              </span>
            </div>

            {/* Test Amount Controls */}
            <div className="p-3 bg-[#161624] rounded-2xl border border-[#282838] space-y-2">
              <label className="text-[11px] font-bold uppercase text-zinc-400 flex items-center justify-between">
                <span>Simular Valor de Pedido:</span>
                <span className="text-[#FFC72C] font-black text-xs">
                  {testAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[15.00, 35.00, 58.90, 94.50].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setTestAmount(val);
                      playBeep(850, 0.03);
                    }}
                    className={`py-2 px-2 min-h-[38px] rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      testAmount === val
                        ? 'bg-[#DA291C] text-white shadow-sm'
                        : 'bg-[#1D1D2C] text-zinc-400 hover:text-white'
                    }`}
                  >
                    R$ {val.toFixed(2)}
                  </button>
                ))}
              </div>
            </div>

            {/* QR Code Graphic Box */}
            <div className="flex flex-col items-center justify-center p-4 bg-[#0A0A0E] border border-zinc-800 rounded-2xl space-y-3 shadow-inner">
              {cleanKey ? (
                <>
                  <div className="relative p-3 bg-white rounded-2xl shadow-xl flex items-center justify-center max-w-[220px]">
                    <img
                      src={qrCodeImageUrl}
                      alt="QR Code Pix"
                      className="w-40 h-40 sm:w-48 sm:h-48 object-contain"
                    />
                    <div className="absolute inset-0 border-4 border-[#00E676]/20 rounded-2xl pointer-events-none" />
                  </div>

                  <div className="text-center space-y-0.5">
                    <div className="text-xs font-black text-white">
                      {beneficiaryName || tenant.name}
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono">
                      Chave: {cleanKey} ({pixKeyType.toUpperCase()})
                    </div>
                    <div className="text-[10px] text-[#00E676] font-bold">
                      Cidade: {pixCity || 'SAO PAULO'} • {testTxId}
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-44 sm:h-48 flex flex-col items-center justify-center text-center p-4 text-zinc-500 space-y-2">
                  <QrCode className="w-12 h-12 text-zinc-700 animate-pulse" />
                  <p className="text-xs">Preencha o campo da Chave Pix acima para gerar o QR Code dinâmico.</p>
                </div>
              )}
            </div>

            {/* Copia e Cola Payload String Box */}
            {currentPixPayload && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-400 flex items-center justify-between">
                  <span>Código Pix Copia e Cola Gerado:</span>
                  <span className="text-[10px] text-[#00E676]">BR Code Oficial</span>
                </label>
                <div className="p-2.5 bg-[#161624] border border-zinc-800 rounded-xl font-mono text-[10px] text-zinc-400 break-all select-all max-h-16 overflow-y-auto">
                  {currentPixPayload}
                </div>

                <button
                  type="button"
                  onClick={handleCopyPayload}
                  className={`w-full py-3 min-h-[44px] rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                    copiedPayload
                      ? 'bg-[#00E676] text-black font-black'
                      : 'bg-[#1F1F30] hover:bg-[#282840] text-white border border-zinc-700'
                  }`}
                >
                  {copiedPayload ? (
                    <>
                      <Check className="w-4 h-4 text-black shrink-0" />
                      <span>CÓDIGO PIX COPIADO!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#00E676] shrink-0" />
                      <span>COPIAR CÓDIGO PIX DE TESTE</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Mobile save button at the bottom for quick access */}
            <div className="block lg:hidden pt-2">
              <button
                type="button"
                onClick={handleSaveSettings}
                className="w-full bg-gradient-to-r from-[#00E676] to-[#00B050] text-black py-3.5 min-h-[44px] rounded-2xl text-xs font-black shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4 text-black" />
                <span>SALVAR TODAS AS ALTERAÇÕES</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
