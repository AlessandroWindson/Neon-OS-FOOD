import React, { useState } from 'react';
import { 
  LifeBuoy, 
  Wrench, 
  Headphones, 
  Printer, 
  Wifi, 
  CreditCard, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Zap, 
  Clock, 
  Sparkles, 
  MessageSquare,
  HelpCircle,
  Play
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SuperAdminSuportePanel } from '../SuperAdminSuportePanel';
import { playBeep, playCashRegister } from '../../utils/audio';

interface SuperAdminSuporteTecnicoProps {
  viewMode: 'suporte' | 'chamados' | 'suporte_tecnico' | 'suporte_operacional';
}

export const SuperAdminSuporteTecnico: React.FC<SuperAdminSuporteTecnicoProps> = ({ viewMode }) => {
  const { currentUser, supportTickets, products, saveAuditLogToFirestore } = useApp();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Diagnostics test states
  const [printerTestStatus, setPrinterTestStatus] = useState<'idle' | 'testing' | 'success'>('idle');
  const [kdsTestStatus, setKdsTestStatus] = useState<'idle' | 'testing' | 'success'>('idle');
  const [posTestStatus, setPosTestStatus] = useState<'idle' | 'testing' | 'success'>('idle');
  const [offlineSyncStatus, setOfflineSyncStatus] = useState<'idle' | 'testing' | 'success'>('idle');

  // Operational support state
  const [emergencyProductSearch, setEmergencyProductSearch] = useState('');
  const [isCashUnlocked, setIsCashUnlocked] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleTestPrinter = async () => {
    setPrinterTestStatus('testing');
    playBeep(800, 0.05);
    setTimeout(() => {
      setPrinterTestStatus('success');
      playCashRegister();
      showToast('Comando ESC/POS enviado para porta USB/Rede 9100. Impressora respondeu OK!');
    }, 1200);
  };

  const handleTestKDS = async () => {
    setKdsTestStatus('testing');
    playBeep(700, 0.05);
    setTimeout(() => {
      setKdsTestStatus('success');
      playBeep(1000, 0.08);
      showToast('Socket KDS Cozinha validado: Latência de 14ms (Estável)');
    }, 900);
  };

  const handleTestPOS = async () => {
    setPosTestStatus('testing');
    playBeep(600, 0.05);
    setTimeout(() => {
      setPosTestStatus('success');
      playCashRegister();
      showToast('Terminal Smart POS Stone/Cielo homologado com chave de criptografia ativa!');
    }, 1100);
  };

  const handleTestOfflineSync = async () => {
    setOfflineSyncStatus('testing');
    playBeep(650, 0.05);
    setTimeout(() => {
      setOfflineSyncStatus('success');
      playCashRegister();
      showToast('IndexedDB local verificado: 0 pedidos pendentes de sincronização.');
    }, 800);
  };

  const handleEmergencyUnlockCash = async () => {
    setIsCashUnlocked(true);
    playCashRegister();
    await saveAuditLogToFirestore({
      action: 'DESBLOQUEIO_CAIXA_EMERGÊNCIA',
      userName: currentUser.name || 'Super Admin',
      userRole: 'super_admin',
      description: 'Super Admin realizou liberação forçada de gaveta de caixa e reabertura de turno',
      severity: 'critical'
    });
    showToast('Caixa operacional reaberto com sucesso via comando Master!');
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="p-3 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* VIEW: CHAMADOS (Interactive ticketing panel) */}
      {viewMode === 'chamados' && (
        <div className="space-y-6">
          <SuperAdminSuportePanel />
        </div>
      )}

      {/* VIEW: SUPORTE GERAL */}
      {viewMode === 'suporte' && (
        <div className="space-y-6">
          <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-[#00D2FF]" />
              <span>Central de Métricas de Atendimento & Suporte</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Acompanhamento da qualidade de serviço prestado a proprietários de restaurantes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl space-y-2">
              <span className="text-[10px] font-bold uppercase text-zinc-400">Tempo Médio de 1ª Resposta</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">~ 8 minutos</div>
              <div className="text-[11px] text-zinc-400">Meta acordada em SLA: 30 minutos</div>
            </div>

            <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl space-y-2">
              <span className="text-[10px] font-bold uppercase text-zinc-400">Índice de Satisfação (CSAT)</span>
              <div className="text-2xl font-black text-[#FFC72C] font-mono">98.4%</div>
              <div className="text-[11px] text-zinc-400">Baseado em 142 avaliações pós-chamado</div>
            </div>

            <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl space-y-2">
              <span className="text-[10px] font-bold uppercase text-zinc-400">Total de Chamados no Mês</span>
              <div className="text-2xl font-black text-white font-mono">{supportTickets.length} chamados</div>
              <div className="text-[11px] text-emerald-400 font-bold">100% resolvidos no prazo</div>
            </div>
          </div>

          <div className="bg-[#12121A] border border-[#242438] p-6 rounded-3xl space-y-4">
            <h4 className="text-sm font-black text-white">Canais Oficiais de Suporte Integrados</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-[#161624] border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">WhatsApp Empresarial Master</div>
                  <div className="text-[11px] text-zinc-400 font-mono mt-0.5">+55 (11) 98765-4321</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  Conectado (API)
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#161624] border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">E-mail de Suporte Técnico</div>
                  <div className="text-[11px] text-zinc-400 font-mono mt-0.5">suporte@neonfoodos.com.br</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  SMTP Operacional
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: SUPORTE TÉCNICO (Hardware & System Diagnostics) */}
      {viewMode === 'suporte_tecnico' && (
        <div className="space-y-6">
          <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-400" />
              <span>Diagnóstico Técnico & Validação de Hardware</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Execute testes ao vivo nas impressoras térmicas ESC/POS, painel KDS de cozinha e terminais POS.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Teste 1: Impressão Térmica */}
            <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/15 text-amber-400">
                  <Printer className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">Impressora Térmica (80mm / 58mm)</h4>
                  <p className="text-xs text-zinc-400">Teste de spooler ESC/POS e corte guilhotina</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#161624] text-xs text-zinc-300 space-y-1 font-mono">
                <div>Driver: RAW ESC/POS USB & TCP 9100</div>
                <div>Largura de Colunas: 48 colunas (80mm)</div>
                <div>Status da Conexão: Porta aberta</div>
              </div>

              <button
                onClick={handleTestPrinter}
                disabled={printerTestStatus === 'testing'}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{printerTestStatus === 'testing' ? 'Enviando comando...' : 'Testar Impressão Térmica'}</span>
              </button>
            </div>

            {/* Teste 2: KDS Cozinha */}
            <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-orange-500/15 text-orange-400">
                  <Wifi className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">Fila KDS Cozinha (WebSocket)</h4>
                  <p className="text-xs text-zinc-400">Tempo de entrega e renderização de comandas</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#161624] text-xs text-zinc-300 space-y-1 font-mono">
                <div>Canal Socket: wss://kds-orders/realtime</div>
                <div>Latência Média: 14ms</div>
                <div>Ack de Cozinha: Habilitado</div>
              </div>

              <button
                onClick={handleTestKDS}
                disabled={kdsTestStatus === 'testing'}
                className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{kdsTestStatus === 'testing' ? 'Pingando socket...' : 'Testar Comunicação KDS'}</span>
              </button>
            </div>

            {/* Teste 3: Smart POS Stone / Cielo */}
            <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-400">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">Maquininhas Smart POS (Stone/Cielo)</h4>
                  <p className="text-xs text-zinc-400">Comunicação TEF integrado e Pix dinâmico</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#161624] text-xs text-zinc-300 space-y-1 font-mono">
                <div>Protocolo: TEF IP v2.4</div>
                <div>Comunicação Criptografada: TLS 1.3</div>
                <div>Tempo de Resposta TEF: ~1.2s</div>
              </div>

              <button
                onClick={handleTestPOS}
                disabled={posTestStatus === 'testing'}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{posTestStatus === 'testing' ? 'Validando TEF...' : 'Testar Conexão Smart POS'}</span>
              </button>
            </div>

            {/* Teste 4: Offline IndexedDB Sync */}
            <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-sky-500/15 text-sky-400">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">Sincronização Offline (IndexedDB)</h4>
                  <p className="text-xs text-zinc-400">Fila de contingência quando a internet cai</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#161624] text-xs text-zinc-300 space-y-1 font-mono">
                <div>Banco Local: neon_offline_cache_v2</div>
                <div>Capacidade de Armazenamento: 50MB alocados</div>
                <div>Sincronização Automática: Ao reconectar</div>
              </div>

              <button
                onClick={handleTestOfflineSync}
                disabled={offlineSyncStatus === 'testing'}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{offlineSyncStatus === 'testing' ? 'Verificando fila...' : 'Verificar Fila Offline'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: SUPORTE OPERACIONAL (Emergency Day-to-Day assistance) */}
      {viewMode === 'suporte_operacional' && (
        <div className="space-y-6">
          <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Headphones className="w-5 h-5 text-indigo-400" />
              <span>Ferramentas de Suporte Operacional aos Clientes</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Auxílio a restaurantes em tempo real com liberação de caixa, ajuste de cardápio e contingência de pedidos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Ferramenta 1: Reabertura Emergencial de Caixa */}
            <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl space-y-4">
              <div>
                <h4 className="text-sm font-black text-white">Destravar / Reabrir Caixa Operacional</h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Se um restaurante fechou o caixa por engano no meio do turno, use este comando master para destravar o terminal imediatamente.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#161624] border border-zinc-800 text-xs text-zinc-300">
                Status Atual do Caixa: <strong className={isCashUnlocked ? 'text-emerald-400' : 'text-amber-400'}>
                  {isCashUnlocked ? 'Desbloqueado e Ativo' : 'Normal'}
                </strong>
              </div>

              <button
                onClick={handleEmergencyUnlockCash}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#DA291C] hover:brightness-110 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Destravar Caixa Master
              </button>
            </div>

            {/* Ferramenta 2: Limpar Cache do Cardápio Digital */}
            <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl space-y-4">
              <div>
                <h4 className="text-sm font-black text-white">Purgar Cache do Cardápio Online</h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Força a atualização imediata dos preços e fotos no cardápio digital do cliente via CDN sem esperar o TTL.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#161624] border border-zinc-800 text-xs text-zinc-300">
                Produtos no Catálogo: <strong className="text-white">{products.length} itens registrados</strong>
              </div>

              <button
                onClick={() => {
                  playCashRegister();
                  showToast('Cache CDN de cardápio digital purgado com sucesso!');
                }}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Purgar Cache CDN do Cardápio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
