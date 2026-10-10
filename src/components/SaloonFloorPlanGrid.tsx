import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  UtensilsCrossed, 
  Users, 
  Clock, 
  DollarSign, 
  Move, 
  Lock, 
  Unlock, 
  RotateCcw, 
  DoorOpen, 
  Receipt, 
  Plus, 
  Calendar, 
  Layers, 
  Grid,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Trash2,
  Edit2,
  QrCode
} from 'lucide-react';
import { TableItem } from '../types';
import { formatBRL } from '../utils/formatters';
import { playBeep } from '../utils/audio';

interface SaloonFloorPlanGridProps {
  tables: TableItem[];
  onTableClick: (table: TableItem) => void;
  onOpenTable: (tableNumber: number) => void;
  onAddItems: (table: TableItem) => void;
  onRequestBill: (tableNumber: number) => void;
  onSettleBill: (table: TableItem) => void;
  onUpdateTablePosition?: (tableNumber: number, x: number, y: number) => void;
  onResetPositions?: () => void;
  onRemoveTable?: (tableNumber: number) => void;
  onEditTable?: (table: TableItem) => void;
  onShowTableQrCode?: (table: TableItem) => void;
  filter: 'all' | 'free' | 'occupied' | 'bill_requested' | 'reserved' | 'cleaning';
  onFilterChange: (filter: 'all' | 'free' | 'occupied' | 'bill_requested' | 'reserved' | 'cleaning') => void;
  searchTerm: string;
}

const STORAGE_KEY = 'neon_food_tables_positions_v1';

// Calculate realistic occupancy time and alert status
export function calculateOccupancyTime(table: TableItem): {
  text: string;
  subtext: string;
  isOvertime: boolean;
  minutes: number;
  color: string;
} {
  if (table.status === 'free') {
    return {
      text: 'Livre',
      subtext: 'Higienizada',
      isOvertime: false,
      minutes: 0,
      color: '#00D26A',
    };
  }

  if (table.status === 'cleaning') {
    return {
      text: 'Aguardando Limpeza',
      subtext: 'Notificado aos garçons',
      isOvertime: false,
      minutes: 0,
      color: '#F59E0B',
    };
  }

  if (table.status === 'reserved') {
    return {
      text: table.reservationTime ? `Reserva: ${table.reservationTime}` : 'Reservada',
      subtext: table.reservationName || 'Aguardando chegada',
      isOvertime: false,
      minutes: 0,
      color: '#A855F7',
    };
  }

  if (table.status === 'bill_requested') {
    return {
      text: 'Pediu Conta',
      subtext: 'Aguardando pagamento',
      isOvertime: false,
      minutes: 45,
      color: '#FFC72C',
    };
  }

  if (!table.openedAt) {
    return {
      text: 'Recém-aberta',
      subtext: 'Agora',
      isOvertime: false,
      minutes: 0,
      color: '#00B8FF',
    };
  }

  // Parse time "HH:MM"
  let minutes = 0;
  if (table.openedAt.includes(':')) {
    const [h, m] = table.openedAt.split(':').map(Number);
    const now = new Date();
    const openDate = new Date();
    openDate.setHours(h, m, 0, 0);

    let diffMs = now.getTime() - openDate.getTime();
    if (diffMs < 0) {
      diffMs += 24 * 3600 * 1000;
    }
    minutes = Math.max(0, Math.floor(diffMs / 60000));
  } else {
    minutes = 0;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const timeFormatted = minutes === 0 ? '< 1 min' : (hours > 0 ? `${hours}h ${mins}m` : `${mins} min`);
  const isOvertime = minutes > 60;

  return {
    text: timeFormatted,
    subtext: isOvertime ? 'Permanência alta (>60m)' : 'Tempo de salão',
    isOvertime,
    minutes,
    color: isOvertime ? '#FF2B4E' : '#FF7A00',
  };
}

export const SaloonFloorPlanGrid: React.FC<SaloonFloorPlanGridProps> = ({
  tables,
  onTableClick,
  onOpenTable,
  onAddItems,
  onRequestBill,
  onSettleBill,
  onUpdateTablePosition,
  onResetPositions,
  onRemoveTable,
  onEditTable,
  onShowTableQrCode,
  filter,
  onFilterChange,
  searchTerm,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [positions, setPositions] = useState<Record<number, { x: number; y: number }>>({});
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [hoveredTableId, setHoveredTableId] = useState<number | null>(null);

  // Initialize and load saved positions from localStorage or table defaults
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) {
          setPositions(parsed);
          return;
        }
      }
    } catch {
      // ignore JSON parse error
    }

    // Default fallback coordinates if not saved
    const initialPos: Record<number, { x: number; y: number }> = {};
    tables.forEach(t => {
      initialPos[t.number] = {
        x: t.x ?? ((t.number - 1) % 4) * 200 + 40,
        y: t.y ?? Math.floor((t.number - 1) / 4) * 170 + 60,
      };
    });
    setPositions(initialPos);
  }, [tables]);

  // Save positions helper
  const handleSavePosition = (tableNumber: number, x: number, y: number) => {
    const finalX = snapToGrid ? Math.round(x / 20) * 20 : Math.round(x);
    const finalY = snapToGrid ? Math.round(y / 20) * 20 : Math.round(y);

    setPositions(prev => {
      const updated = {
        ...prev,
        [tableNumber]: { x: finalX, y: finalY },
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    if (onUpdateTablePosition) {
      onUpdateTablePosition(tableNumber, finalX, finalY);
    }
  };

  // Reset to default floorplan layout
  const handleResetLayout = () => {
    playBeep(600, 0.05);
    localStorage.removeItem(STORAGE_KEY);
    const initialPos: Record<number, { x: number; y: number }> = {
      1: { x: 40, y: 70 },
      2: { x: 210, y: 70 },
      3: { x: 380, y: 70 },
      4: { x: 550, y: 70 },
      5: { x: 730, y: 70 },
      6: { x: 730, y: 260 },
      7: { x: 40, y: 260 },
      8: { x: 210, y: 260 },
      9: { x: 380, y: 260 },
      10: { x: 550, y: 260 },
      11: { x: 210, y: 440 },
      12: { x: 380, y: 440 },
    };
    setPositions(initialPos);
    if (onResetPositions) {
      onResetPositions();
    }
  };

  // Stats for the legend
  const stats = useMemo(() => {
    const free = tables.filter(t => t.status === 'free').length;
    const occupied = tables.filter(t => t.status === 'occupied').length;
    const bill = tables.filter(t => t.status === 'bill_requested').length;
    const reserved = tables.filter(t => t.status === 'reserved').length;
    const cleaning = tables.filter(t => t.status === 'cleaning').length;
    return { free, occupied, bill, reserved, cleaning, total: tables.length };
  }, [tables]);

  return (
    <div className="space-y-4">
      {/* Top Controls Bar & Neon Legend */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 rounded-2xl bg-[#111119] border border-[#232336] shadow-xl">
        {/* Neon Status Legend / Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase text-[#71717A] mr-1 hidden sm:inline">
            Status:
          </span>

          <button
            onClick={() => onFilterChange('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filter === 'all'
                ? 'bg-[#2A2A3E] text-white border border-[#444460]'
                : 'text-[#A1A1AA] hover:text-white bg-[#161622]'
            }`}
          >
            <span>Todas</span>
            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full font-mono">
              {stats.total}
            </span>
          </button>

          {/* Livre - Neon Green */}
          <button
            onClick={() => onFilterChange('free')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filter === 'free'
                ? 'bg-[#00D26A]/20 text-[#00D26A] border border-[#00D26A] shadow-[0_0_15px_rgba(0,210,106,0.35)]'
                : 'text-[#00D26A]/80 hover:text-[#00D26A] bg-[#00D26A]/5 border border-[#00D26A]/20'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#00D26A] animate-pulse" />
            <span>Livres</span>
            <span className="text-[10px] bg-[#00D26A]/20 px-1.5 py-0.5 rounded-full font-mono text-[#00D26A]">
              {stats.free}
            </span>
          </button>

          {/* Ocupada - Neon Red */}
          <button
            onClick={() => onFilterChange('occupied')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filter === 'occupied'
                ? 'bg-[#FF2B4E]/20 text-[#FF4D6D] border border-[#FF2B4E] shadow-[0_0_15px_rgba(255,43,78,0.4)]'
                : 'text-[#FF4D6D]/80 hover:text-[#FF4D6D] bg-[#FF2B4E]/5 border border-[#FF2B4E]/20'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#FF2B4E]" />
            <span>Ocupadas</span>
            <span className="text-[10px] bg-[#FF2B4E]/20 px-1.5 py-0.5 rounded-full font-mono text-[#FF4D6D]">
              {stats.occupied}
            </span>
          </button>

          {/* Pediu Conta - Neon Amber */}
          <button
            onClick={() => onFilterChange('bill_requested')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filter === 'bill_requested'
                ? 'bg-[#FFC72C]/20 text-[#FFC72C] border border-[#FFC72C] shadow-[0_0_15px_rgba(255,199,44,0.4)]'
                : 'text-[#FFC72C]/80 hover:text-[#FFC72C] bg-[#FFC72C]/5 border border-[#FFC72C]/20'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#FFC72C] animate-ping" />
            <span>Pediu Conta</span>
            <span className="text-[10px] bg-[#FFC72C]/20 px-1.5 py-0.5 rounded-full font-mono text-[#FFC72C]">
              {stats.bill}
            </span>
          </button>

          {/* Reservada - Neon Purple */}
          <button
            onClick={() => onFilterChange('reserved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filter === 'reserved'
                ? 'bg-[#A855F7]/20 text-[#C084FC] border border-[#A855F7] shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                : 'text-[#C084FC]/80 hover:text-[#C084FC] bg-[#A855F7]/5 border border-[#A855F7]/20'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#A855F7]" />
            <span>Reservadas</span>
            <span className="text-[10px] bg-[#A855F7]/20 px-1.5 py-0.5 rounded-full font-mono text-[#C084FC]">
              {stats.reserved}
            </span>
          </button>

          {/* Aguardando Limpeza - Amarelado / Amber */}
          <button
            onClick={() => onFilterChange('cleaning')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filter === 'cleaning'
                ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'text-[#F59E0B]/80 hover:text-[#F59E0B] bg-[#F59E0B]/5 border border-[#F59E0B]/20'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
            <span>Limpeza</span>
            <span className="text-[10px] bg-[#F59E0B]/20 px-1.5 py-0.5 rounded-full font-mono text-[#F59E0B]">
              {stats.cleaning}
            </span>
          </button>
        </div>

        {/* Layout & Drag Controls */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
          {/* Snap to grid toggle */}
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            title={snapToGrid ? 'Grade alinhada ativa (Snap 20px)' : 'Alinhamento livre'}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              snapToGrid
                ? 'bg-[#1F1F30] text-[#00B8FF] border-[#00B8FF]/40'
                : 'bg-[#14141E] text-[#71717A] border-[#252538]'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Grade 20px</span>
          </button>

          {/* Toggle Edit / Drag Mode */}
          <button
            onClick={() => {
              setIsEditMode(!isEditMode);
              playBeep(isEditMode ? 500 : 750, 0.04);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer border shadow-md ${
              isEditMode
                ? 'bg-[#FF7A00] text-black border-[#FFA149] shadow-[0_0_15px_rgba(255,122,0,0.4)]'
                : 'bg-[#1C1C2A] text-white hover:bg-[#28283C] border-[#32324A]'
            }`}
          >
            {isEditMode ? (
              <>
                <Unlock className="w-3.5 h-3.5" />
                <span>Salvar Posições</span>
              </>
            ) : (
              <>
                <Move className="w-3.5 h-3.5 text-[#FF7A00]" />
                <span>Reorganizar Salão</span>
              </>
            )}
          </button>

          {/* Reset positions */}
          <button
            onClick={handleResetLayout}
            title="Resetar para a planta baixa padrão"
            className="p-2 rounded-xl bg-[#181824] hover:bg-[#252538] text-[#A1A1AA] hover:text-white border border-[#2B2B3C] transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive Salon Canvas */}
      <div className="relative overflow-hidden rounded-3xl border border-[#242438] bg-[#0A0A0F] shadow-2xl">
        {/* Architectural Canvas Background with Neon Blueprint Grid */}
        <div
          ref={containerRef}
          className="relative w-full min-h-[660px] sm:min-h-[720px] overflow-auto select-none p-6"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 50%, rgba(255, 122, 0, 0.03) 0%, transparent 60%),
              linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '100% 100%, 32px 32px, 32px 32px',
          }}
        >
          {/* Architectural Salon Landmarks */}
          
          {/* Top: Entrada Principal */}
          <div className="absolute top-2 left-8 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00B8FF]/10 border border-[#00B8FF]/30 text-[#00B8FF] text-[10px] font-black uppercase tracking-wider backdrop-blur-sm z-0">
            <DoorOpen className="w-3.5 h-3.5" />
            <span>Porta de Entrada Principal</span>
          </div>

          {/* Left: Bar & Chopp / Bebidas */}
          <div className="absolute top-28 left-2 -rotate-90 origin-top-left flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFC72C]/10 border border-[#FFC72C]/30 text-[#FFC72C] text-[9px] font-black uppercase tracking-wider z-0">
            <span>Bar & Bebidas</span>
          </div>

          {/* Right: Pass & Cozinha */}
          <div className="absolute top-28 right-2 rotate-90 origin-top-right flex items-center gap-2 px-3 py-1 rounded-full bg-[#E31837]/10 border border-[#E31837]/30 text-[#FF2B4E] text-[9px] font-black uppercase tracking-wider z-0">
            <UtensilsCrossed className="w-3 h-3" />
            <span>Pass da Cozinha</span>
          </div>

          {/* Bottom Right: Caixa & Balcão */}
          <div className="absolute bottom-3 right-6 flex items-center gap-2 px-3 py-1 rounded-full bg-[#00D26A]/10 border border-[#00D26A]/30 text-[#00D26A] text-[10px] font-black uppercase tracking-wider z-0">
            <Receipt className="w-3.5 h-3.5" />
            <span>Caixa & Balcão</span>
          </div>

          {/* Bottom Left: Varanda / Deck */}
          <div className="absolute bottom-3 left-6 flex items-center gap-2 px-3 py-1 rounded-full bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-[#C084FC] text-[10px] font-black uppercase tracking-wider z-0">
            <Layers className="w-3.5 h-3.5" />
            <span>Deck / Varanda Externa</span>
          </div>

          {/* Mode Banner notification if editing */}
          {isEditMode && (
            <div className="sticky top-2 z-30 mx-auto max-w-md bg-[#FF7A00]/95 text-black px-4 py-2 rounded-2xl font-black text-xs flex items-center justify-between shadow-2xl border border-white/20 animate-bounce">
              <div className="flex items-center gap-2">
                <Move className="w-4 h-4" />
                <span>Modo Reorganizar: Arraste as mesas para reposicionar no grid</span>
              </div>
              <button
                onClick={() => setIsEditMode(false)}
                className="px-2.5 py-0.5 rounded-lg bg-black text-white text-[11px] font-bold"
              >
                Pronto
              </button>
            </div>
          )}

          {/* Table Elements in the Salon */}
          <div className="relative w-full h-[620px] min-w-[880px]">
            {tables.map(table => {
              const isFree = table.status === 'free';
              const isOccupied = table.status === 'occupied';
              const isBillRequested = table.status === 'bill_requested';
              const isReserved = table.status === 'reserved';
              const isCleaning = table.status === 'cleaning';

              // Filter match check
              const matchFilter =
                filter === 'all' ? true :
                filter === 'free' ? isFree :
                filter === 'occupied' ? isOccupied :
                filter === 'bill_requested' ? isBillRequested :
                filter === 'reserved' ? isReserved :
                filter === 'cleaning' ? isCleaning : true;

              const matchSearch = searchTerm === '' ||
                table.number.toString().includes(searchTerm) ||
                (table.waiterName && table.waiterName.toLowerCase().includes(searchTerm.toLowerCase()));

              const isDimmed = !(matchFilter && matchSearch);

              const pos = positions[table.number] || {
                x: ((table.number - 1) % 4) * 210 + 40,
                y: Math.floor((table.number - 1) / 4) * 180 + 70,
              };

              const occupancyInfo = calculateOccupancyTime(table);
              const isDragging = activeDragId === table.number;
              const isHovered = hoveredTableId === table.number;

              // Shape styling: width and height
              const isLarge = table.seats >= 6;
              const isRound = table.shape === 'round';
              const tableWidth = isLarge ? 175 : 145;
              const tableHeight = isLarge ? 140 : 130;

              // Neon States definition
              let neonBorderClass = 'border-[#00D26A] shadow-[0_0_16px_rgba(0,210,106,0.3)]';
              let neonBgClass = 'bg-[#0E1712]/95';
              let neonBadgeClass = 'bg-[#00D26A]/20 text-[#00D26A] border-[#00D26A]/40';
              let statusLabel = 'Livre';

              if (isCleaning) {
                neonBorderClass = 'border-[#F59E0B] shadow-[0_0_20px_rgba(245,158,11,0.45)]';
                neonBgClass = 'bg-[#221808]/95';
                neonBadgeClass = 'bg-[#F59E0B]/25 text-[#F59E0B] border-[#F59E0B]/50 shadow-[0_0_8px_rgba(245,158,11,0.3)]';
                statusLabel = 'Aguardando Limpeza';
              } else if (isOccupied) {
                neonBorderClass = 'border-[#FF2B4E] shadow-[0_0_20px_rgba(255,43,78,0.45)]';
                neonBgClass = 'bg-[#200F14]/95';
                neonBadgeClass = 'bg-[#FF2B4E]/20 text-[#FF4D6D] border-[#FF2B4E]/40';
                statusLabel = 'Ocupada';
              } else if (isBillRequested) {
                neonBorderClass = 'border-[#FFC72C] shadow-[0_0_24px_rgba(255,199,44,0.55)] animate-pulse';
                neonBgClass = 'bg-[#221B0A]/95';
                neonBadgeClass = 'bg-[#FFC72C]/25 text-[#FFC72C] border-[#FFC72C]/50';
                statusLabel = 'Pediu Conta';
              } else if (isReserved) {
                neonBorderClass = 'border-[#A855F7] shadow-[0_0_18px_rgba(168,85,247,0.4)]';
                neonBgClass = 'bg-[#180E28]/95';
                neonBadgeClass = 'bg-[#A855F7]/20 text-[#C084FC] border-[#A855F7]/40';
                statusLabel = 'Reservada';
              }

              return (
                <motion.div
                  key={table.number}
                  drag
                  dragMomentum={false}
                  dragElastic={0.05}
                  dragConstraints={containerRef}
                  onDragStart={() => {
                    setActiveDragId(table.number);
                    playBeep(700, 0.02);
                  }}
                  onDragEnd={(_, info) => {
                    setActiveDragId(null);
                    const newX = Math.max(10, Math.min(800, pos.x + info.offset.x));
                    const newY = Math.max(20, Math.min(520, pos.y + info.offset.y));
                    handleSavePosition(table.number, newX, newY);
                    playBeep(850, 0.03);
                  }}
                  onMouseEnter={() => setHoveredTableId(table.number)}
                  onMouseLeave={() => setHoveredTableId(null)}
                  style={{
                    position: 'absolute',
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    width: `${tableWidth}px`,
                    height: `${tableHeight}px`,
                  }}
                  animate={{
                    opacity: isDimmed ? 0.25 : 1,
                    scale: isDragging ? 1.08 : isHovered ? 1.03 : 1,
                    zIndex: isDragging ? 40 : isHovered ? 30 : 10,
                  }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  className={`group select-none cursor-grab active:cursor-grabbing rounded-2xl border-2 transition-shadow ${neonBorderClass} ${neonBgClass} backdrop-blur-md flex flex-col justify-between p-2.5 relative`}
                  onClick={(e) => {
                    // Prevent modal opening when dragging
                    if (!isDragging && !isEditMode) {
                      e.stopPropagation();
                      onTableClick(table);
                    }
                  }}
                >
                  {/* Visual Chairs Representation on Table Perimeters */}
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 flex gap-3 pointer-events-none">
                    <span className={`w-3.5 h-1.5 rounded-full ${isFree ? 'bg-[#00D26A]/50' : isOccupied ? 'bg-[#FF2B4E]/60' : isReserved ? 'bg-[#A855F7]/60' : 'bg-[#FFC72C]/60'}`} />
                    {table.seats >= 4 && (
                      <span className={`w-3.5 h-1.5 rounded-full ${isFree ? 'bg-[#00D26A]/50' : isOccupied ? 'bg-[#FF2B4E]/60' : isReserved ? 'bg-[#A855F7]/60' : 'bg-[#FFC72C]/60'}`} />
                    )}
                  </div>
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex gap-3 pointer-events-none">
                    <span className={`w-3.5 h-1.5 rounded-full ${isFree ? 'bg-[#00D26A]/50' : isOccupied ? 'bg-[#FF2B4E]/60' : isReserved ? 'bg-[#A855F7]/60' : 'bg-[#FFC72C]/60'}`} />
                    {table.seats >= 4 && (
                      <span className={`w-3.5 h-1.5 rounded-full ${isFree ? 'bg-[#00D26A]/50' : isOccupied ? 'bg-[#FF2B4E]/60' : isReserved ? 'bg-[#A855F7]/60' : 'bg-[#FFC72C]/60'}`} />
                    )}
                  </div>

                  {/* Top Bar: Table Number & Status Badge */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-wider">
                        MESA
                      </span>
                      <span className="text-xl font-black font-mono text-white leading-none">
                        {table.number.toString().padStart(2, '0')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${neonBadgeClass}`}
                      >
                        {statusLabel}
                      </span>
                      {onShowTableQrCode && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onShowTableQrCode(table);
                          }}
                          className="p-1 rounded-md bg-[#FFC72C]/20 hover:bg-[#FFC72C] text-[#FFC72C] hover:text-black transition-all border border-[#FFC72C]/40 cursor-pointer"
                          title={`Gerar QR Code do Cardápio para Mesa ${table.number}`}
                        >
                          <QrCode className="w-2.5 h-2.5" />
                        </button>
                      )}
                      {onEditTable && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTable(table);
                          }}
                          className="p-1 rounded-md bg-[#00B8FF]/20 hover:bg-[#00B8FF] text-[#00B8FF] hover:text-white transition-all border border-[#00B8FF]/40 cursor-pointer"
                          title={`Editar Mesa ${table.number} (Nome e Lugares)`}
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                      {isEditMode && onRemoveTable && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveTable(table.number);
                          }}
                          className="p-1 rounded-md bg-[#FF2B4E]/20 hover:bg-[#FF2B4E] text-[#FF4D6D] hover:text-white transition-all border border-[#FF2B4E]/40 cursor-pointer"
                          title={`Remover Mesa ${table.number} do salão`}
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Center Content: Occupancy Time & Details */}
                  <div className="my-1 space-y-1">
                    {/* Time of Occupancy Display */}
                    <div className="flex items-center justify-between">
                      <div
                        className={`flex items-center gap-1 text-[11px] font-mono font-bold ${
                          isFree
                            ? 'text-[#00D26A]'
                            : isOccupied
                            ? occupancyInfo.isOvertime
                              ? 'text-[#FF4D6D] animate-pulse'
                              : 'text-zinc-200'
                            : isBillRequested
                            ? 'text-[#FFC72C]'
                            : 'text-[#C084FC]'
                        }`}
                      >
                        {isFree ? (
                          <CheckCircle2 className="w-3 h-3 text-[#00D26A]" />
                        ) : isReserved ? (
                          <Calendar className="w-3 h-3 text-[#A855F7]" />
                        ) : (
                          <Clock className="w-3 h-3 text-[#FFC72C]" />
                        )}
                        <span>{occupancyInfo.text}</span>
                      </div>

                      {/* Seats count */}
                      <span className="text-[10px] text-[#71717A] flex items-center gap-0.5">
                        <Users className="w-2.5 h-2.5" />
                        {table.seats}L
                      </span>
                    </div>

                    {/* Monetary value or subtitle */}
                    {isOccupied || isBillRequested ? (
                      <div className="flex items-center justify-between pt-0.5 border-t border-white/10">
                        <span className="text-[10px] text-[#A1A1AA] truncate max-w-[65px]">
                          {table.waiterName ? table.waiterName.split(' ')[0] : 'Atendente'}
                        </span>
                        <span className="text-xs font-black font-mono text-[#00D26A]">
                          {formatBRL(table.currentTotal || 0)}
                        </span>
                      </div>
                    ) : isReserved ? (
                      <div className="text-[10px] text-[#A1A1AA] truncate">
                        {table.reservationName || 'Reserva Confirmada'}
                      </div>
                    ) : (
                      <div className="text-[10px] text-[#71717A] italic">
                        Pronta para abertura
                      </div>
                    )}
                  </div>

                  {/* Bottom Quick Action Bar on Card */}
                  <div className="pt-1.5 border-t border-white/10 flex items-center justify-between gap-1">
                    {isFree ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenTable(table.number);
                        }}
                        className="w-full py-1 rounded-lg bg-[#00D26A]/20 hover:bg-[#00D26A] text-[#00D26A] hover:text-black text-[10px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer border border-[#00D26A]/40"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Abrir</span>
                      </button>
                    ) : isBillRequested ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSettleBill(table);
                        }}
                        className="w-full py-1 rounded-lg bg-[#00D26A] hover:bg-[#00E575] text-black text-[10px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer shadow-[0_0_10px_rgba(0,210,106,0.4)]"
                      >
                        <Receipt className="w-3 h-3" />
                        <span>Cobrar</span>
                      </button>
                    ) : isOccupied ? (
                      <div className="w-full flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddItems(table);
                          }}
                          className="flex-1 py-1 rounded-lg bg-[#1C1C2A] hover:bg-[#2A2A3E] text-white text-[10px] font-bold border border-[#2E2E42] text-center"
                        >
                          + Itens
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRequestBill(table.number);
                          }}
                          className="flex-1 py-1 rounded-lg bg-[#FFC72C]/20 hover:bg-[#FFC72C] text-[#FFC72C] hover:text-black text-[10px] font-bold border border-[#FFC72C]/40 text-center transition-colors"
                        >
                          Conta
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenTable(table.number);
                        }}
                        className="w-full py-1 rounded-lg bg-[#A855F7]/20 hover:bg-[#A855F7] text-[#C084FC] hover:text-white text-[10px] font-bold border border-[#A855F7]/40 text-center transition-colors"
                      >
                        Check-in
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Floor Plan Footer Info Bar */}
        <div className="p-3 bg-[#0D0D14] border-t border-[#20202E] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#71717A] gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-[#FF7A00]" />
              <span>Arraste qualquer mesa para posicionar fisicamente no salão</span>
            </span>
            <span className="hidden md:inline text-zinc-600">•</span>
            <span className="hidden md:inline">
              Layout sincronizado em tempo real
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Salão Principal:</span>
            <span className="text-white font-mono font-bold">
              {tables.length} {tables.length === 1 ? 'Mesa cadastrada' : 'Mesas no mapa'} ({stats.free} livres, {stats.occupied} ocupadas)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
