import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { SuperAdminHeader } from './superadmin/SuperAdminHeader';
import { SuperAdminNav17, SuperAdminTab } from './superadmin/SuperAdminNav17';
import { SuperAdminVisaoGeral } from './superadmin/SuperAdminVisaoGeral';
import { SuperAdminUsuarios } from './superadmin/SuperAdminUsuarios';
import { SuperAdminEmpresas } from './superadmin/SuperAdminEmpresas';
import { SuperAdminPlanosAssinaturas } from './superadmin/SuperAdminPlanosAssinaturas';
import { SuperAdminSuporteTecnico } from './superadmin/SuperAdminSuporteTecnico';
import { SuperAdminSistemaManutencao } from './superadmin/SuperAdminSistemaManutencao';
import { SuperAdminConfiguracoesMaster } from './superadmin/SuperAdminConfiguracoesMaster';
import { playBeep } from '../utils/audio';

export const SuperAdminSaaS: React.FC = () => {
  const { 
    currentUser, 
    setCurrentView, 
    switchToSuperAdmin, 
    switchToUser,
    supportTickets,
    maintenanceMode
  } = useApp();

  // Active tab in Central de Comando (defaults to 'visao_geral')
  const [activeTab, setActiveTab] = useState<SuperAdminTab>('visao_geral');

  const handleLock = () => {
    try {
      sessionStorage.removeItem('super_admin_verified');
      sessionStorage.removeItem('super_admin_auth');
    } catch {}
    playBeep(500, 0.05);
    switchToUser();
  };

  const pendingTicketsCount = supportTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;

  return (
    <div className="space-y-6 pb-20 select-none">
      {/* 1. Header do Super Admin */}
      <SuperAdminHeader
        onLock={handleLock}
        onSelectTab={setActiveTab}
        unreadNotificationsCount={3}
      />

      {/* 2. Central de Comando Navigation Bar (17 itens) */}
      <SuperAdminNav17
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        openTicketsCount={pendingTicketsCount}
        maintenanceActive={maintenanceMode}
      />

      {/* 3. Central de Conteúdo Dinâmico (17 Módulos Funcionais) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          className="w-full"
        >
          {/* Módulo 1: Visão Geral */}
          {activeTab === 'visao_geral' && (
            <SuperAdminVisaoGeral onSelectTab={setActiveTab} />
          )}

          {/* Módulo 2: Usuários */}
          {activeTab === 'usuarios' && (
            <SuperAdminUsuarios />
          )}

          {/* Módulo 3: Empresas */}
          {activeTab === 'empresas' && (
            <SuperAdminEmpresas />
          )}

          {/* Módulo 4: Filiais */}
          {activeTab === 'filiais' && (
            <SuperAdminPlanosAssinaturas viewMode="filiais" />
          )}

          {/* Módulo 5: Planos */}
          {activeTab === 'planos' && (
            <SuperAdminPlanosAssinaturas viewMode="planos" />
          )}

          {/* Módulo 6: Assinaturas */}
          {activeTab === 'assinaturas' && (
            <SuperAdminPlanosAssinaturas viewMode="assinaturas" />
          )}

          {/* Módulo 7: Suporte */}
          {activeTab === 'suporte' && (
            <SuperAdminSuporteTecnico viewMode="suporte" />
          )}

          {/* Módulo 8: Chamados */}
          {activeTab === 'chamados' && (
            <SuperAdminSuporteTecnico viewMode="chamados" />
          )}

          {/* Módulo 9: Suporte Técnico */}
          {activeTab === 'suporte_tecnico' && (
            <SuperAdminSuporteTecnico viewMode="suporte_tecnico" />
          )}

          {/* Módulo 10: Suporte Operacional */}
          {activeTab === 'suporte_operacional' && (
            <SuperAdminSuporteTecnico viewMode="suporte_operacional" />
          )}

          {/* Módulo 11: Manutenção */}
          {activeTab === 'manutencao' && (
            <SuperAdminSistemaManutencao viewMode="manutencao" />
          )}

          {/* Módulo 12: Sistema */}
          {activeTab === 'sistema' && (
            <SuperAdminSistemaManutencao viewMode="sistema" />
          )}

          {/* Módulo 13: Integrações */}
          {activeTab === 'integracoes' && (
            <SuperAdminSistemaManutencao viewMode="integracoes" />
          )}

          {/* Módulo 14: Segurança */}
          {activeTab === 'seguranca' && (
            <SuperAdminSistemaManutencao viewMode="seguranca" />
          )}

          {/* Módulo 15: Auditoria */}
          {activeTab === 'auditoria' && (
            <SuperAdminSistemaManutencao viewMode="auditoria" />
          )}

          {/* Módulo 16: Comunicações */}
          {activeTab === 'comunicacoes' && (
            <SuperAdminSistemaManutencao viewMode="comunicacoes" />
          )}

          {/* Módulo 17: Configurações */}
          {activeTab === 'configuracoes' && (
            <SuperAdminConfiguracoesMaster />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
