import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Database, 
  ShieldCheck, 
  Server, 
  Activity, 
  X, 
  Layers, 
  Trash2, 
  Clock, 
  Cpu, 
  Play, 
  HardDrive,
  FileCheck,
  Radio,
  Zap
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { playBeep } from '../utils/audio';

export const OfflineSyncModal: React.FC = () => {
  const { 
    isOfflineSyncModalOpen, 
    setIsOfflineSyncModalOpen,
    effectiveIsOnline,
    isForceOffline,
    toggleForceOffline,
    networkLatencyMs,
    pendingSyncQueue,
    isSyncing,
    lastSyncTimestamp,
    triggerManualSync,
    clearSyncQueue,
    removeSyncQueueItem,
    simulateOfflineOrder
  } = useApp();

  const [testResult, setTestResult] = useState<string | null>(null);

  if (!isOfflineSyncModalOpen) return null;

  const handleSyncNow = async () => {
    setTestResult('Iniciando sincronização com o servidor central...');
    const res = await triggerManualSync();
    if (res.success) {
      setTestResult(`Sucesso! ${res.syncedCount} ações sincronizadas com a nuvem.`);
    } else {
      setTestResult('Não foi possível conectar ao servidor central no momento. Os dados permanecem seguros no dispositivo.');
    }
  };

  const handleCreateTestOrder = () => {
    simulateOfflineOrder();
    playBeep(900, 0.05);
    setTestResult('Novo pedido criado offline com sucesso e adicionado à fila!');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-[#12121A] border border-[#2B2B3E] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#222232] flex items-center justify-between bg-[#151522]">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                effectiveIsOnline 
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/15 border-red-500/30 text-red-400 animate-pulse'
              }`}>
                {effectiveIsOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Central de Operação Offline & Service Worker
                  </h2>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                    effectiveIsOnline 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                      : 'bg-red-500/20 text-red-300 border-red-500/40'
                  }`}>
                    {effectiveIsOnline ? 'Nuvem Conectada' : 'Modo Offline Ativo'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Garantia de operação ininterrupta do restaurante mesmo sob pane ou oscilação de internet.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOfflineSyncModalOpen(false)}
              className="w-8 h-8 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs scrollbar-thin">
            
            {/* Status Metric Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#181824] p-3.5 rounded-xl border border-[#262638]">
                <span className="text-[11px] text-zinc-400 block mb-1">Status da Conexão</span>
                <div className="flex items-center gap-2 font-bold text-sm">
                  <div className={`w-2.5 h-2.5 rounded-full ${effectiveIsOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                  <span className={effectiveIsOnline ? 'text-emerald-400' : 'text-red-400'}>
                    {effectiveIsOnline ? 'Online (Estável)' : 'Offline (Local)'}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 block mt-1 font-mono">
                  {effectiveIsOnline ? `Ping: ${networkLatencyMs}ms` : 'Sem rede externa'}
                </span>
              </div>

              <div className="bg-[#181824] p-3.5 rounded-xl border border-[#262638]">
                <span className="text-[11px] text-zinc-400 block mb-1">Service Worker PWA</span>
                <div className="flex items-center gap-2 font-bold text-sm text-amber-400">
                  <Cpu className="w-4 h-4 text-amber-400" />
                  <span>v3 Ativo & Cache</span>
                </div>
                <span className="text-[10px] text-zinc-500 block mt-1">
                  Shell & Áudio pré-armazenados
                </span>
              </div>

              <div className="bg-[#181824] p-3.5 rounded-xl border border-[#262638]">
                <span className="text-[11px] text-zinc-400 block mb-1">Fila Pendente de Sync</span>
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Database className="w-4 h-4 text-[#FFC72C]" />
                  <span className={pendingSyncQueue.length > 0 ? 'text-amber-400 font-extrabold' : 'text-zinc-200'}>
                    {pendingSyncQueue.length} {pendingSyncQueue.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 block mt-1">
                  IndexedDB + Redundância
                </span>
              </div>

              <div className="bg-[#181824] p-3.5 rounded-xl border border-[#262638]">
                <span className="text-[11px] text-zinc-400 block mb-1">Última Sincronização</span>
                <div className="flex items-center gap-2 font-bold text-sm text-zinc-300">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span>{lastSyncTimestamp ? new Date(lastSyncTimestamp).toLocaleTimeString('pt-BR') : 'Hoje às 11:30'}</span>
                </div>
                <span className="text-[10px] text-zinc-500 block mt-1">
                  Background Sync habilitado
                </span>
              </div>
            </div>

            {/* Test Simulation Controls */}
            <div className="bg-gradient-to-br from-[#181824] to-[#14141E] p-4 rounded-xl border border-[#2A2A3E]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222234]">
                <div>
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[#FFC72C]" />
                    <span className="font-bold text-sm text-white">
                      Simulador de Instabilidade & Queda de Rede
                    </span>
                  </div>
                  <p className="text-zinc-400 text-xs mt-0.5">
                    Teste o comportamento de contingência do restaurante ligando ou desligando a internet simulada.
                  </p>
                </div>

                {/* Force Offline Toggle Switch */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-zinc-300">
                    {isForceOffline ? 'Simulando Queda de Internet' : 'Conexão Normal'}
                  </span>
                  <button
                    onClick={toggleForceOffline}
                    className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors cursor-pointer ${
                      isForceOffline ? 'bg-[#DA291C]' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isForceOffline ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleCreateTestOrder}
                  className="bg-[#DA291C]/20 hover:bg-[#DA291C]/30 text-[#FFC72C] border border-[#FFC72C]/40 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer text-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-[#FFC72C]" />
                  <span>Simular Pedido Criado Offline</span>
                </button>

                <button
                  onClick={handleSyncNow}
                  disabled={isSyncing || pendingSyncQueue.length === 0}
                  className="bg-[#FFC72C] hover:bg-[#ffcf4d] text-zinc-950 font-black px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer text-xs disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Forçar Sincronização Imediata'}</span>
                </button>

                {pendingSyncQueue.length > 0 && (
                  <button
                    onClick={clearSyncQueue}
                    className="bg-zinc-800/60 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-zinc-700 hover:border-red-500/40 px-3 py-1.5 rounded-xl transition-all cursor-pointer text-xs flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpar Fila</span>
                  </button>
                )}
              </div>

              {testResult && (
                <div className="mt-3 p-2.5 rounded-lg bg-zinc-900 border border-[#2E2E40] text-zinc-200 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{testResult}</span>
                </div>
              )}
            </div>

            {/* Pending Queue List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#00D2FF]" />
                  <h3 className="font-bold text-sm text-white">
                    Fila de Ações Pendentes de Sincronização ({pendingSyncQueue.length})
                  </h3>
                </div>
                <span className="text-[11px] text-zinc-400">
                  Transmitidas automaticamente ao restaurar conexão
                </span>
              </div>

              {pendingSyncQueue.length === 0 ? (
                <div className="bg-[#151522] border border-[#232336] rounded-xl p-8 text-center text-zinc-400 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-zinc-200">
                    Fila de Sincronização Limpa
                  </h4>
                  <p className="text-xs text-zinc-500 max-w-md mx-auto">
                    Todos os pedidos, movimentações de caixa e status de cozinha estão sincronizados com o servidor central.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                  {pendingSyncQueue.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#171724] border border-[#2A2A3E] hover:border-amber-500/40 p-3 rounded-xl flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {item.type === 'CREATE_ORDER' ? '🍔' : item.type === 'CASH_MOVEMENT' ? '💰' : '📋'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-200">{item.description}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-800 text-amber-300 border border-amber-500/20">
                              {item.type}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-500 block mt-0.5">
                            Registrado em: {new Date(item.timestamp).toLocaleTimeString('pt-BR')} • Tentativas: {item.retries}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          Aguardando Sincronização
                        </span>
                        <button
                          onClick={() => removeSyncQueueItem(item.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                          title="Remover este item"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Architecture Highlights: How NEON FOOD OS Redundancy Works */}
            <div className="bg-[#141420] border border-[#232336] rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#FFC72C] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#00E676]" />
                Como o Restaurante Funciona Sem Internet (Arquitetura de Alta Disponibilidade)
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-zinc-400">
                <div className="bg-[#181826] p-3 rounded-lg border border-[#252538]">
                  <span className="font-bold text-zinc-200 block mb-1">1. Cache-First Service Worker</span>
                  O código HTML, JavaScript, ícones e cardápio são servidos diretamente da memória local do navegador, sem depender de carregar páginas da internet.
                </div>
                <div className="bg-[#181826] p-3 rounded-lg border border-[#252538]">
                  <span className="font-bold text-zinc-200 block mb-1">2. Fila IndexedDB Local</span>
                  Se o atendente lançar um pedido ou o caixa registrar um pagamento no PDV sem Wi-Fi, o dado é persistido com segurança no banco local do dispositivo.
                </div>
                <div className="bg-[#181826] p-3 rounded-lg border border-[#252538]">
                  <span className="font-bold text-zinc-200 block mb-1">3. Background Sync Automático</span>
                  Assim que o sinal de internet retorna, o navegador emite o evento de reconexão e o sistema dispara o lote de sincronização com deduplicação de IDs.
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-[#222232] bg-[#14141F] flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono">
              NEON FOOD OS • Protocolo de Resiliência Gastronômica Ativo
            </span>
            <button
              onClick={() => setIsOfflineSyncModalOpen(false)}
              className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
