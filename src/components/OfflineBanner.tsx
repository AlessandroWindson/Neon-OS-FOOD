import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  WifiOff, 
  Wifi, 
  RefreshCw, 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  Server,
  Zap
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const OfflineBanner: React.FC = () => {
  const { 
    effectiveIsOnline, 
    isForceOffline, 
    toggleForceOffline,
    pendingSyncQueue, 
    isSyncing, 
    triggerManualSync, 
    setIsOfflineSyncModalOpen,
    lastSyncTimestamp
  } = useApp();

  const pendingCount = pendingSyncQueue.length;

  // Don't show if everything is online and no items pending
  if (effectiveIsOnline && pendingCount === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden sticky top-16 z-30 shadow-lg"
      >
        {!effectiveIsOnline ? (
          /* OFFLINE WARNING BANNER */
          <div className="bg-gradient-to-r from-[#B31B10] via-[#DA291C] to-[#800F07] text-white px-4 py-2.5 border-b border-red-500/40">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 text-xs">
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-black/30 border border-white/20 flex items-center justify-center shrink-0 animate-pulse">
                  <WifiOff className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold uppercase tracking-wide bg-black/40 px-2 py-0.5 rounded text-[11px] text-amber-300 border border-amber-300/30">
                      Modo Offline Ativo
                    </span>
                    {isForceOffline && (
                      <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-mono">
                        (Simulação de Queda Ativa)
                      </span>
                    )}
                    <span className="font-medium text-white/90">
                      O restaurante continua operando 100% via Service Worker & Cache Local.
                    </span>
                  </div>
                  <p className="text-[11px] text-white/80 mt-0.5">
                    {pendingCount > 0 
                      ? `${pendingCount} ${pendingCount === 1 ? 'registro salvo' : 'registros salvos'} no dispositivo aguardando retorno da internet para sincronização.`
                      : 'Nenhum pedido pendente no momento. Todos os lançamentos serão guardados com segurança.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                <button
                  onClick={() => setIsOfflineSyncModalOpen(true)}
                  className="bg-black/30 hover:bg-black/50 text-white font-bold px-3 py-1.5 rounded-lg border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <Database className="w-3.5 h-3.5 text-amber-300" />
                  <span>Ver Fila ({pendingCount})</span>
                </button>

                {isForceOffline ? (
                  <button
                    onClick={toggleForceOffline}
                    className="bg-white hover:bg-zinc-100 text-zinc-950 font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer text-xs shadow-md"
                  >
                    <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Restaurar Conexão</span>
                  </button>
                ) : (
                  <button
                    onClick={() => triggerManualSync()}
                    disabled={isSyncing}
                    className="bg-white hover:bg-zinc-100 text-zinc-950 font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer text-xs shadow-md disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-red-600 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Conectando...' : 'Tentar Conectar'}</span>
                  </button>
                )}
              </div>

            </div>
          </div>
        ) : (
          /* ONLINE BUT SYNCING PENDING DATA BANNER */
          <div className="bg-gradient-to-r from-amber-950/95 via-amber-900/95 to-zinc-900/95 text-amber-100 px-4 py-2 border-b border-amber-500/30">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2.5">
                <RefreshCw className={`w-4 h-4 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <div>
                  <span className="font-bold text-amber-300">
                    Internet Restabelecida!
                  </span>
                  <span className="ml-2 text-zinc-300">
                    Sincronizando {pendingCount} {pendingCount === 1 ? 'registro pendente' : 'registros pendentes'} com o servidor na nuvem...
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => triggerManualSync()}
                  disabled={isSyncing}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer text-xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Transmitindo...' : 'Sincronizar Agora'}</span>
                </button>
                <button
                  onClick={() => setIsOfflineSyncModalOpen(true)}
                  className="bg-black/30 hover:bg-black/50 text-amber-200 px-2.5 py-1 rounded-lg border border-amber-500/20 text-xs cursor-pointer"
                >
                  Detalhes
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
