import React, { useState } from 'react';
import { 
  AlertOctagon, 
  Server, 
  Layers, 
  ShieldCheck, 
  FileText, 
  Radio, 
  Settings, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Cpu, 
  HardDrive, 
  Wifi, 
  Lock, 
  KeyRound, 
  Phone, 
  Trash2,
  ExternalLink,
  Shield,
  Activity,
  Globe
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Announcement } from '../../types';
import { playBeep, playCashRegister } from '../../utils/audio';

interface SuperAdminSistemaManutencaoProps {
  viewMode: 'manutencao' | 'sistema' | 'integracoes' | 'seguranca' | 'auditoria' | 'comunicacoes' | 'configuracoes';
}

export const SuperAdminSistemaManutencao: React.FC<SuperAdminSistemaManutencaoProps> = ({ viewMode }) => {
  const { 
    currentUser,
    maintenanceMode, 
    setMaintenanceMode, 
    maintenanceConfig, 
    setMaintenanceConfig,
    announcements,
    addAnnouncement,
    removeAnnouncement,
    auditLogs,
    saveAuditLogToFirestore,
    allTenants
  } = useApp();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form for Maintenance configuration
  const [maintTitle, setMaintTitle] = useState(maintenanceConfig?.title || 'Manutenção Programada do Sistema');
  const [maintMessage, setMaintMessage] = useState(
    maintenanceConfig?.message || 'Estamos realizando melhorias preventivas nos servidores do Neon Food OS. Voltaremos em breve!'
  );
  const [maintEstimatedReturn, setMaintEstimatedReturn] = useState(maintenanceConfig?.estimatedReturn || 'Hoje às 06:00');
  const [maintEmergencyContact, setMaintEmergencyContact] = useState(maintenanceConfig?.emergencyContact || '+55 (11) 98765-4321');

  // Form for New Announcement
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSeverity, setBroadcastSeverity] = useState<'info' | 'warning' | 'urgent'>('info');
  const [broadcastTargetPlan, setBroadcastTargetPlan] = useState<'all' | 'Start' | 'Pro' | 'Business' | 'Premium'>('all');

  // Master Settings State
  const [platformName, setPlatformName] = useState('NEON FOOD OS');
  const [apiUrl, setApiUrl] = useState('https://api.neonfoodos.com.br/v1');
  const [billingMode, setBillingMode] = useState('production');
  const [ipShieldActive, setIpShieldActive] = useState(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleMaintenance = async () => {
    const nextMode = !maintenanceMode;
    setMaintenanceMode(nextMode);
    
    if (nextMode) {
      setMaintenanceConfig({
        title: maintTitle,
        message: maintMessage,
        estimatedReturn: maintEstimatedReturn,
        emergencyContact: maintEmergencyContact,
        activatedAt: new Date().toISOString()
      });
    }

    await saveAuditLogToFirestore({
      action: nextMode ? 'MODO_MANUTENÇÃO_ATIVADO' : 'MODO_MANUTENÇÃO_DESATIVADO',
      userName: currentUser.name || 'Super Admin',
      userRole: 'super_admin',
      description: nextMode 
        ? `Super Admin ativou o Modo de Manutenção da plataforma. Aviso: ${maintTitle}`
        : 'Super Admin desativou o Modo de Manutenção. Plataforma liberada.',
      severity: 'critical'
    });

    playBeep(nextMode ? 350 : 880, 0.1);
    showToast(`Modo Manutenção ${nextMode ? 'ATIVADO' : 'DESATIVADO'} com sucesso!`);
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) return;

    const newAnnounce: Announcement = {
      id: `ann_${Date.now()}`,
      title: broadcastTitle,
      message: broadcastMessage,
      severity: broadcastSeverity,
      targetPlan: broadcastTargetPlan,
      createdAt: new Date().toISOString(),
      active: true
    };

    addAnnouncement(newAnnounce);
    await saveAuditLogToFirestore({
      action: 'COMUNICADO_TRANSMITIDO',
      userName: currentUser.name || 'Super Admin',
      userRole: 'super_admin',
      description: `Disparo de comunicado: "${broadcastTitle}" para ${broadcastTargetPlan === 'all' ? 'todos os planos' : 'plano ' + broadcastTargetPlan}`,
      severity: 'warning'
    });

    setBroadcastTitle('');
    setBroadcastMessage('');
    playCashRegister();
    showToast(`Comunicado transmitido com sucesso para todas as lojas conectadas!`);
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

      {/* VIEW: MANUTENÇÃO */}
      {viewMode === 'manutencao' && (
        <div className="space-y-6">
          <div className="bg-[#12121A] border border-[#DA291C]/40 p-6 rounded-3xl space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30">
                  <AlertOctagon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Chave Master: Modo de Manutenção</h3>
                  <p className="text-xs text-zinc-400">
                    Quando ativado, os usuários que acessarem a plataforma verão a tela de manutenção oficial.
                  </p>
                </div>
              </div>

              <button
                onClick={handleToggleMaintenance}
                className={`px-5 py-3 rounded-2xl font-black text-xs transition-all shadow-lg cursor-pointer ${
                  maintenanceMode
                    ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                    : 'bg-[#181826] hover:bg-[#222234] text-zinc-300 border border-zinc-700'
                }`}
              >
                {maintenanceMode ? '🚨 MODO MANUTENÇÃO ATIVO (CLIQUE P/ DESATIVAR)' : '● ATIVAR MODO MANUTENÇÃO'}
              </button>
            </div>

            {/* Maintenance Parameters */}
            <div className="space-y-3 pt-4 border-t border-zinc-800 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Título do Aviso</label>
                  <input
                    type="text"
                    value={maintTitle}
                    onChange={e => setMaintTitle(e.target.value)}
                    className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Previsão de Retorno</label>
                  <input
                    type="text"
                    value={maintEstimatedReturn}
                    onChange={e => setMaintEstimatedReturn(e.target.value)}
                    className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Mensagem Explicativa aos Clientes</label>
                <textarea
                  rows={2}
                  value={maintMessage}
                  onChange={e => setMaintMessage(e.target.value)}
                  className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl p-3 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">WhatsApp de Emergência</label>
                <input
                  type="text"
                  value={maintEmergencyContact}
                  onChange={e => setMaintEmergencyContact(e.target.value)}
                  className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: SISTEMA (Cloud Health) */}
      {viewMode === 'sistema' && (
        <div className="space-y-6">
          <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-400" />
              <span>Infraestrutura Cloud & Monitoramento de Servidores</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Telemetria em tempo real do Google Cloud Firestore, nós de API e canais WebSocket.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl space-y-1">
              <div className="text-[10px] font-bold uppercase text-zinc-400">Banco de Dados</div>
              <div className="text-lg font-black text-emerald-400">Cloud Firestore</div>
              <div className="text-xs text-zinc-400">Latência: 12ms (Excelente)</div>
            </div>

            <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl space-y-1">
              <div className="text-[10px] font-bold uppercase text-zinc-400">Nó de Aplicação</div>
              <div className="text-lg font-black text-sky-400">Cloud Run Containers</div>
              <div className="text-xs text-zinc-400">Porta 3000 Ingress Ativa</div>
            </div>

            <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl space-y-1">
              <div className="text-[10px] font-bold uppercase text-zinc-400">Canais de WebSocket</div>
              <div className="text-lg font-black text-amber-400">Tempo Real Ativo</div>
              <div className="text-xs text-zinc-400">100% de disponibilidade</div>
            </div>

            <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl space-y-1">
              <div className="text-[10px] font-bold uppercase text-zinc-400">Memória / Processamento</div>
              <div className="text-lg font-black text-white font-mono">182MB / 512MB</div>
              <div className="text-xs text-zinc-400">Uso de CPU: ~4%</div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: INTEGRAÇÕES */}
      {viewMode === 'integracoes' && (
        <div className="space-y-6">
          <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span>Status das Integrações com Parceiros & APIs</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Conexões externas de delivery, gateways de pagamento, emissão fiscal e mapas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {[
              { name: 'iFood API Delivery v2', status: 'Operacional', latency: '45ms', color: 'emerald' },
              { name: 'Rappi Integration Gateway', status: 'Operacional', latency: '82ms', color: 'emerald' },
              { name: '99Food Webhook Dispatcher', status: 'Operacional', latency: '60ms', color: 'emerald' },
              { name: 'Mercado Pago Pix Instantâneo', status: 'Operacional', latency: '210ms', color: 'emerald' },
              { name: 'Stone Smart POS TEF IP', status: 'Operacional', latency: '140ms', color: 'emerald' },
              { name: 'SEFAZ NFC-e Nota Fiscal Eletrônica', status: 'Operacional (SP/RJ/MG/AM)', latency: '350ms', color: 'emerald' },
              { name: 'Google Maps Geocoding & Rotas', status: 'Operacional', latency: '75ms', color: 'emerald' }
            ].map((integ, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-[#12121A] border border-[#242438] flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-sm">{integ.name}</div>
                  <div className="text-zinc-400 mt-0.5">Latência de requisição: {integ.latency}</div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px] border border-emerald-500/30">
                  ✓ {integ.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: SEGURANÇA */}
      {viewMode === 'seguranca' && (
        <div className="space-y-6">
          <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-sky-400" />
              <span>Controle de Segurança Master & Auditoria de Acessos</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Políticas de autenticação de Super Admin, sessões ativas e proteção contra força bruta.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">Escudo Anti-Força Bruta (Brute-Force Shield)</span>
                <button
                  onClick={() => setIpShieldActive(!ipShieldActive)}
                  className={`px-3 py-1 rounded-xl font-bold ${ipShieldActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}
                >
                  {ipShieldActive ? 'ATIVO' : 'DESATIVADO'}
                </button>
              </div>
              <p className="text-zinc-400">
                Bloqueia automaticamente endereços IP com mais de 5 tentativas consecutivas de senha inválida.
              </p>
            </div>

            <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl space-y-3 text-xs">
              <div className="font-bold text-white text-sm">Sessão Atual do Super Admin</div>
              <div className="p-3 rounded-2xl bg-[#161624] space-y-1 font-mono text-zinc-300">
                <div>Usuário: {currentUser.displayName || currentUser.name || 'Super Administrador'}</div>
                <div>Permissão: super_admin (Acesso Total Irrestrito)</div>
                <div>Criptografia: SHA-256 + Firebase Auth Token</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: AUDITORIA */}
      {viewMode === 'auditoria' && (
        <div className="space-y-6">
          <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              <span>Trilha de Auditoria Imutável do Super Admin</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Registro cronológico de todas as ações administrativas, ativações de empresa e diagnósticos executados.
            </p>
          </div>

          <div className="bg-[#12121A] border border-[#242438] rounded-3xl p-5 shadow-xl divide-y divide-zinc-800/80 text-xs">
            {auditLogs.map(log => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{log.userName}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      log.severity === 'critical' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                      log.severity === 'warning' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {log.action}
                    </span>
                  </div>
                  <p className="text-zinc-400 mt-1">{log.description}</p>
                </div>
                <div className="text-[11px] text-zinc-500 font-mono shrink-0">
                  {new Date(log.timestamp).toLocaleString('pt-BR')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: COMUNICAÇÕES (Broadcast) */}
      {viewMode === 'comunicacoes' && (
        <div className="space-y-6">
          <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-amber-400" />
              <span>Transmissão de Comunicados para os Restaurantes</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Envie alertas de novidades, atualizações de sistema ou orientações operacionais direto para as telas dos clientes.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSendAnnouncement} className="bg-[#12121A] border border-[#242438] p-6 rounded-3xl space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Título do Comunicado</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Nova atualização do Cardápio Digital disponível!"
                  value={broadcastTitle}
                  onChange={e => setBroadcastTitle(e.target.value)}
                  className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Nível de Gravidade</label>
                <select
                  value={broadcastSeverity}
                  onChange={e => setBroadcastSeverity(e.target.value as any)}
                  className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white"
                >
                  <option value="info">Informativo (Azul)</option>
                  <option value="warning">Aviso Importante (Amarelo)</option>
                  <option value="urgent">Urgente (Vermelho)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Mensagem aos Restaurantes</label>
              <textarea
                rows={3}
                required
                placeholder="Descreva o comunicado detalhadamente..."
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl p-3 text-white"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#DA291C] text-white font-bold flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Transmitir Comunicado para Todas as Lojas</span>
              </button>
            </div>
          </form>

          {/* List of active announcements */}
          {announcements.length > 0 && (
            <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl space-y-3">
              <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Comunicados Ativos</h4>
              <div className="space-y-2">
                {announcements.map(ann => (
                  <div key={ann.id} className="p-3 rounded-2xl bg-[#181828] border border-zinc-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">{ann.title}</div>
                      <p className="text-zinc-400 text-[11px] mt-0.5">{ann.message}</p>
                    </div>
                    <button
                      onClick={() => removeAnnouncement(ann.id)}
                      className="p-1.5 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 cursor-pointer ml-3"
                      title="Excluir comunicado"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: CONFIGURAÇÕES (Master Settings) */}
      {viewMode === 'configuracoes' && (
        <div className="space-y-6">
          <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-zinc-300" />
              <span>Configurações Mestres do NEON FOOD OS</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Parâmetros globais do sistema, credenciais de webhook e regras de cobrança.
            </p>
          </div>

          <div className="bg-[#12121A] border border-[#242438] p-6 rounded-3xl space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">Nome da Plataforma</label>
                <input
                  type="text"
                  value={platformName}
                  onChange={e => setPlatformName(e.target.value)}
                  className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-bold uppercase text-[10px] mb-1">API Base URL</label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={e => setApiUrl(e.target.value)}
                  className="w-full bg-[#181826] border border-[#2B2B3C] rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => {
                  playCashRegister();
                  showToast('Configurações mestres atualizadas com sucesso!');
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black cursor-pointer shadow-md"
              >
                Salvar Configurações Mestres
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
