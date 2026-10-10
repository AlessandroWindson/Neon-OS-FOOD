import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UtensilsCrossed, 
  Users, 
  Clock, 
  DollarSign, 
  Plus, 
  Search, 
  Printer, 
  CheckCircle2, 
  X, 
  RotateCcw, 
  ArrowRightLeft, 
  CreditCard, 
  QrCode, 
  Banknote, 
  Receipt, 
  AlertCircle,
  Sparkles,
  Bell,
  Flame,
  Layers,
  FileText,
  UserCheck,
  LayoutGrid,
  Calendar,
  CookingPot,
  Trash2,
  AlertTriangle,
  MapPin,
  SlidersHorizontal,
  Edit2,
  Check,
  Minus,
  GripVertical,
  Move,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { TableItem, Product, OrderItem, PaymentMethod } from '../types';
import { formatBRL } from '../utils/formatters';
import { playBeep, playCashRegister, playKitchenBell } from '../utils/audio';
import { SaloonFloorPlanGrid, calculateOccupancyTime } from './SaloonFloorPlanGrid';
import { SmartPOSPaymentModal, SmartPOSPaymentTarget } from './SmartPOSPaymentModal';
import { ThermalPrinterSettingsModal } from './ThermalPrinterSettingsModal';
import { TableQrCodeModal } from './TableQrCodeModal';
import { thermalPrinterService } from '../services/escposService';

type TableFilter = 'all' | 'free' | 'occupied' | 'bill_requested' | 'reserved' | 'cleaning';

interface ComandaItem {
  id: string;
  code: string;
  customerName: string;
  phone?: string;
  tableNumber?: number;
  items: OrderItem[];
  total: number;
  openedAt: string;
  waiter: string;
  status: 'open' | 'closed';
}

export const MapaMesasComandas: React.FC = () => {
  const { 
    tables, 
    setTables, 
    comandas,
    setComandas,
    products, 
    createOrder, 
    setPrintOrder, 
    activeCashSession,
    currentUser,
    orders,
    sendSilentWaiterNotification
  } = useApp();

  const [kitchenPrintToast, setKitchenPrintToast] = useState<{
    message: string;
    printerName: string;
    hexPreview?: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'mesas' | 'comandas'>('mesas');
  const [mesasViewMode, setMesasViewMode] = useState<'floorplan' | 'cards'>('floorplan');
  const [filter, setFilter] = useState<TableFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [zoneFilter, setZoneFilter] = useState<'all' | 'salao_principal' | 'varanda' | 'bar_lounge' | 'mezanino'>('all');

  // Friendly zone labels
  const ZONE_LABELS: Record<string, string> = {
    salao_principal: 'Salão Principal',
    varanda: 'Varanda / Deck',
    bar_lounge: 'Bar & Balcão',
    mezanino: 'Mezanino',
  };

  // Toast notifications for table actions
  const [tableToast, setTableToast] = useState<{ message: string; type: 'success' | 'warning' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setTableToast({ message, type });
    setTimeout(() => setTableToast(null), 3800);
  };

  // New Table Modal State
  const [isNewTableModalOpen, setIsNewTableModalOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState<number>(() => (tables.length > 0 ? Math.max(...tables.map(t => t.number)) + 1 : 1));
  const [newTableSeats, setNewTableSeats] = useState<number>(4);
  const [newTableShape, setNewTableShape] = useState<'square' | 'round' | 'rectangle'>('square');
  const [newTableZone, setNewTableZone] = useState<'salao_principal' | 'varanda' | 'bar_lounge' | 'mezanino'>('salao_principal');
  const [newTableError, setNewTableError] = useState<string | null>(null);

  // Remove Table Modal State
  const [isRemoveTableModalOpen, setIsRemoveTableModalOpen] = useState(false);
  const [removeSearchTerm, setRemoveSearchTerm] = useState('');
  const [tablePendingRemoval, setTablePendingRemoval] = useState<TableItem | null>(null);
  const [isForceRemove, setIsForceRemove] = useState(false);

  // Quick Edit Table Modal State (Renomear, Lugares, Setor e Status)
  const [isQuickEditModalOpen, setIsQuickEditModalOpen] = useState(false);
  const [quickEditTable, setQuickEditTable] = useState<TableItem | null>(null);
  const [editTableName, setEditTableName] = useState<string>('');
  const [editTableNumber, setEditTableNumber] = useState<number>(1);
  const [editTableSeats, setEditTableSeats] = useState<number>(4);
  const [editTableStatus, setEditTableStatus] = useState<TableItem['status']>('free');
  const [sendSilentWaiterNotifOnCleaning, setSendSilentWaiterNotifOnCleaning] = useState<boolean>(true);
  const [editTableZone, setEditTableZone] = useState<'salao_principal' | 'varanda' | 'bar_lounge' | 'mezanino'>('salao_principal');
  const [editTableShape, setEditTableShape] = useState<'square' | 'round' | 'rectangle'>('square');
  const [editReservationName, setEditReservationName] = useState<string>('');
  const [editReservationTime, setEditReservationTime] = useState<string>('');
  const [quickEditError, setQuickEditError] = useState<string | null>(null);

  // Dynamic QR Code Modal State
  const [isQrCodeModalOpen, setIsQrCodeModalOpen] = useState<boolean>(false);
  const [selectedTableForQr, setSelectedTableForQr] = useState<TableItem | null>(null);

  const openTableQrCodeModal = (table: TableItem) => {
    playBeep(750, 0.04);
    setSelectedTableForQr(table);
    setIsQrCodeModalOpen(true);
  };

  // Drag-and-Drop Grid Layout State & Handlers
  const [isReorderMode, setIsReorderMode] = useState<boolean>(false);
  const [draggedTableNumber, setDraggedTableNumber] = useState<number | null>(null);
  const [dragOverTableNumber, setDragOverTableNumber] = useState<number | null>(null);

  const handleTableDragStart = (e: React.DragEvent, tableNumber: number) => {
    e.dataTransfer.setData('text/plain', String(tableNumber));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTableNumber(tableNumber);
    playBeep(700, 0.03);
  };

  const handleTableDragOver = (e: React.DragEvent, targetTableNumber: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTableNumber !== targetTableNumber) {
      setDragOverTableNumber(targetTableNumber);
    }
  };

  const handleTableDrop = (e: React.DragEvent, targetTableNumber: number) => {
    e.preventDefault();
    if (!draggedTableNumber || draggedTableNumber === targetTableNumber) {
      setDraggedTableNumber(null);
      setDragOverTableNumber(null);
      return;
    }

    setTables(prev => {
      const fromIdx = prev.findIndex(t => t.number === draggedTableNumber);
      const toIdx = prev.findIndex(t => t.number === targetTableNumber);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });

    playBeep(880, 0.04);
    showToast(`Layout atualizado: Mesa ${draggedTableNumber} reposicionada na posição da Mesa ${targetTableNumber}!`, 'info');
    setDraggedTableNumber(null);
    setDragOverTableNumber(null);
  };

  const handleTableDragEnd = () => {
    setDraggedTableNumber(null);
    setDragOverTableNumber(null);
  };

  const handleResetTableOrder = () => {
    playBeep(650, 0.04);
    setTables(prev => [...prev].sort((a, b) => a.number - b.number));
    showToast('Ordem numérica padrão das mesas restaurada!', 'success');
  };

  const handleMoveTableStep = (tableNumber: number, direction: 'left' | 'right') => {
    setTables(prev => {
      const idx = prev.findIndex(t => t.number === tableNumber);
      if (idx === -1) return prev;
      const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
    playBeep(750, 0.02);
  };

  // Open Quick Edit Modal for table
  const openQuickEditModal = (table: TableItem) => {
    playBeep(750, 0.04);
    setQuickEditTable(table);
    setEditTableName(table.name || table.label || '');
    setEditTableNumber(table.number);
    setEditTableSeats(table.seats || 4);
    setEditTableStatus(table.status);
    setEditTableZone(table.zone || 'salao_principal');
    setEditTableShape(table.shape || 'square');
    setEditReservationName(table.reservationName || '');
    setEditReservationTime(table.reservationTime || '');
    setSendSilentWaiterNotifOnCleaning(true);
    setQuickEditError(null);
    setIsQuickEditModalOpen(true);
  };

  // Save Quick Edit Table
  const handleSaveQuickEdit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickEditTable) return;
    setQuickEditError(null);

    const num = Number(editTableNumber);
    if (!num || num <= 0) {
      setQuickEditError('Informe um número válido para a mesa.');
      return;
    }

    if (num !== quickEditTable.number && tables.some(t => t.number === num)) {
      setQuickEditError(`A Mesa ${num} já existe no salão. Escolha outro número.`);
      playBeep(350, 0.08);
      return;
    }

    const seats = Math.max(1, Math.min(30, Number(editTableSeats) || 4));
    const isNowCleaning = editTableStatus === 'cleaning';

    setTables(prev => prev.map(t => {
      if (t.number === quickEditTable.number) {
        return {
          ...t,
          number: num,
          name: editTableName.trim() ? editTableName.trim() : undefined,
          label: editTableName.trim() ? editTableName.trim() : undefined,
          seats,
          status: editTableStatus,
          zone: editTableZone,
          shape: editTableShape,
          reservationName: editTableStatus === 'reserved' ? editReservationName.trim() : undefined,
          reservationTime: editTableStatus === 'reserved' ? editReservationTime.trim() : undefined,
          cleaningRequestedAt: isNowCleaning ? (t.cleaningRequestedAt || new Date().toISOString()) : undefined,
        };
      }
      return t;
    }));

    if (selectedTable?.number === quickEditTable.number) {
      setSelectedTable(prev => prev ? {
        ...prev,
        number: num,
        name: editTableName.trim() ? editTableName.trim() : undefined,
        label: editTableName.trim() ? editTableName.trim() : undefined,
        seats,
        status: editTableStatus,
        zone: editTableZone,
        shape: editTableShape,
        reservationName: editTableStatus === 'reserved' ? editReservationName.trim() : undefined,
        reservationTime: editTableStatus === 'reserved' ? editReservationTime.trim() : undefined,
        cleaningRequestedAt: isNowCleaning ? (prev.cleaningRequestedAt || new Date().toISOString()) : undefined,
      } : null);
    }

    if (isNowCleaning && sendSilentWaiterNotifOnCleaning) {
      sendSilentWaiterNotification(
        `Aguardando Limpeza: Mesa ${num}`,
        `Mesa ${num} (${editTableName.trim() || `Mesa ${num}`}) desocupada e aguardando higienização. Equipe de garçons notificada silenciosamente.`,
        num
      );
      showToast(`Mesa ${num} marcada como Aguardando Limpeza! Notificação silenciosa enviada para a equipe de garçons.`, 'warning');
    } else {
      showToast(`Mesa ${num} atualizada com sucesso! (${seats} lugares)`, 'success');
    }

    playBeep(920, 0.05);
    setIsQuickEditModalOpen(false);
  };

  // Quick 1-click Add Table
  const handleAddNewTable = () => {
    playBeep(900, 0.05);
    const nextNumber = tables.length > 0 ? Math.max(...tables.map(t => t.number)) + 1 : 1;
    const newTable: TableItem = {
      number: nextNumber,
      seats: 4,
      status: 'free',
      currentTotal: 0,
      shape: 'square',
      zone: 'salao_principal',
      x: 380,
      y: 440,
    };
    setTables(prev => [...prev, newTable]);
    showToast(`Mesa ${nextNumber} adicionada com sucesso ao Salão!`, 'success');
  };

  // Create Table with custom configuration
  const handleCreateCustomTable = (e: React.FormEvent) => {
    e.preventDefault();
    setNewTableError(null);

    const num = Number(newTableNumber);
    if (!num || num <= 0) {
      setNewTableError('Informe um número válido para a mesa (maior que 0).');
      return;
    }

    // Check if table already exists
    if (tables.some(t => t.number === num)) {
      setNewTableError(`A Mesa ${num} já existe no salão. Escolha outro número.`);
      playBeep(350, 0.08);
      return;
    }

    playBeep(950, 0.05);
    const newTable: TableItem = {
      number: num,
      seats: Math.max(1, Math.min(20, newTableSeats)),
      status: 'free',
      currentTotal: 0,
      shape: newTableShape,
      zone: newTableZone,
      x: 380,
      y: 440,
    };

    setTables(prev => [...prev, newTable]);
    setIsNewTableModalOpen(false);
    showToast(`Mesa ${num} (${newTableSeats} lugares • ${ZONE_LABELS[newTableZone]}) cadastrada!`, 'success');
  };

  // Prompt Remove Table
  const promptRemoveTable = (table: TableItem) => {
    playBeep(500, 0.04);
    setTablePendingRemoval(table);
    setIsForceRemove(table.status === 'occupied' || table.status === 'bill_requested' || (table.currentTotal || 0) > 0);
  };

  // Confirm Table Removal
  const handleConfirmRemoveTable = (tableNumber: number) => {
    playBeep(400, 0.07);

    // Remove from state
    setTables(prev => prev.filter(t => t.number !== tableNumber));

    // Remove coordinates from localStorage
    try {
      const saved = localStorage.getItem('neon_food_tables_positions_v1');
      if (saved) {
        const pos = JSON.parse(saved);
        if (pos && typeof pos === 'object') {
          delete pos[tableNumber];
          localStorage.setItem('neon_food_tables_positions_v1', JSON.stringify(pos));
        }
      }
    } catch {
      // ignore
    }

    // Reset selection if active
    if (selectedTable?.number === tableNumber) {
      setSelectedTable(null);
    }

    setTablePendingRemoval(null);
    showToast(`Mesa ${tableNumber} removida do salão com sucesso.`, 'info');
  };

  // Clean and free table (reset status to free)
  const handleCleanAndFreeTable = (tableNumber: number) => {
    playBeep(700, 0.05);
    setTables(prev => prev.map(t => {
      if (t.number === tableNumber) {
        return {
          ...t,
          status: 'free',
          currentTotal: 0,
          waiterName: undefined,
          openedAt: undefined,
          reservationName: undefined,
          reservationTime: undefined,
          cleaningRequestedAt: undefined,
        };
      }
      return t;
    }));
    if (selectedTable?.number === tableNumber) {
      setSelectedTable(null);
    }
    showToast(`Mesa ${tableNumber} liberada e pronta para atendimento!`, 'success');
  };

  // Clear all empty free tables
  const handleClearAllFreeTables = () => {
    const freeTables = tables.filter(t => t.status === 'free');
    if (freeTables.length === 0) {
      showToast('Não há mesas livres vazias para remover.', 'info');
      return;
    }
    const confirm = window.confirm(`Deseja remover todas as ${freeTables.length} mesas livres do salão?`);
    if (!confirm) return;

    setTables(prev => prev.filter(t => t.status !== 'free'));
    setIsRemoveTableModalOpen(false);
    showToast(`${freeTables.length} mesas livres foram removidas do salão.`, 'info');
  };

  // Quick seats updater (+ or - chairs)
  const handleUpdateTableSeats = (tableNumber: number, delta: number) => {
    setTables(prev => prev.map(t => {
      if (t.number === tableNumber) {
        const updatedSeats = Math.max(1, Math.min(20, (t.seats || 4) + delta));
        return { ...t, seats: updatedSeats };
      }
      return t;
    }));
    setSelectedTable(prev => prev && prev.number === tableNumber ? { ...prev, seats: Math.max(1, Math.min(20, (prev.seats || 4) + delta)) } : prev);
    playBeep(700, 0.02);
  };

  // Quick zone updater
  const handleUpdateTableZone = (tableNumber: number, zone: TableItem['zone']) => {
    setTables(prev => prev.map(t => t.number === tableNumber ? { ...t, zone } : t));
    setSelectedTable(prev => prev && prev.number === tableNumber ? { ...prev, zone } : prev);
    playBeep(700, 0.02);
    showToast(`Setor da Mesa ${tableNumber} atualizado para ${ZONE_LABELS[zone || 'salao_principal']}!`, 'info');
  };

  // Free table / Cancel accidental occupation
  const handleReleaseTable = (tableNumber: number) => {
    playBeep(650, 0.04);
    setTables(prev => prev.map(t => {
      if (t.number === tableNumber) {
        return {
          ...t,
          status: 'free',
          currentTotal: 0,
          currentOrderId: undefined,
          openedAt: undefined,
          customersCount: undefined,
          waiterName: undefined,
        };
      }
      return t;
    }));
    if (selectedTable?.number === tableNumber) {
      setSelectedTable(prev => prev ? {
        ...prev,
        status: 'free',
        currentTotal: 0,
        currentOrderId: undefined,
        openedAt: undefined,
        customersCount: undefined,
        waiterName: undefined,
      } : null);
    }
    showToast(`Mesa ${tableNumber} liberada e higienizada!`, 'success');
  };

  // Delete / cancel comanda
  const handleDeleteComanda = (comandaId: string) => {
    const target = comandas.find(c => c.id === comandaId);
    if (!target) return;
    if (target.items.length > 0 && target.total > 0) {
      const confirm = window.confirm(`A comanda ${target.code} (${target.customerName}) possui itens no valor de ${formatBRL(target.total)}. Deseja realmente cancelá-la?`);
      if (!confirm) return;
    }
    setComandas(prev => prev.filter(c => c.id !== comandaId));
    playBeep(500, 0.05);
    showToast(`Comanda ${target.code} cancelada com sucesso.`, 'info');
  };

  // Comanda filters
  const [comandaFilter, setComandaFilter] = useState<'all' | 'table' | 'counter'>('all');
  const [comandaSearch, setComandaSearch] = useState('');

  // Selected table for detailed modal
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null);
  const [selectedTableInGrid, setSelectedTableInGrid] = useState<number | null>(null);
  const [isAddItemsModalOpen, setIsAddItemsModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [targetTableNumber, setTargetTableNumber] = useState<number | ''>('');

  // Item picker state
  const [itemSearch, setItemSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [temporaryItems, setTemporaryItems] = useState<OrderItem[]>([]);

  // Payment state for table
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [splitCount, setSplitCount] = useState<number>(1);
  const [includeService, setIncludeService] = useState<boolean>(true);

  // Comanda and Items state
  const [selectedComandaForItems, setSelectedComandaForItems] = useState<ComandaItem | null>(null);
  const [isNewComandaModalOpen, setIsNewComandaModalOpen] = useState(false);
  const [newComandaName, setNewComandaName] = useState('');
  const [newComandaTable, setNewComandaTable] = useState<number | ''>('');

  // Stats calculation
  const totalTables = tables.length;
  const occupiedTables = tables.filter(t => t.status === 'occupied' || t.status === 'bill_requested').length;
  const occupancyRate = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;
  const totalOpenRevenue = tables.reduce((acc, t) => acc + (t.currentTotal || 0), 0) + 
                           comandas.filter(c => c.status === 'open' && !c.tableNumber).reduce((acc, c) => acc + (c.total || 0), 0);

  // Real Average Dwell Time (Giro Médio)
  const avgDwellMinutes = useMemo(() => {
    const activeTables = tables.filter(t => (t.status === 'occupied' || t.status === 'bill_requested') && t.openedAt);
    if (activeTables.length === 0) return null;
    let sum = 0;
    let count = 0;
    activeTables.forEach(t => {
      if (t.openedAt && t.openedAt.includes(':')) {
        const [h, m] = t.openedAt.split(':').map(Number);
        const now = new Date();
        const openDate = new Date();
        openDate.setHours(h, m, 0, 0);
        let diffMs = now.getTime() - openDate.getTime();
        if (diffMs < 0) diffMs += 24 * 3600 * 1000;
        const mins = Math.max(1, Math.floor(diffMs / 60000));
        sum += mins;
        count++;
      }
    });
    return count > 0 ? Math.round(sum / count) : null;
  }, [tables]);

  // Filtered tables
  const filteredTables = useMemo(() => {
    return tables.filter(t => {
      const matchFilter = 
        filter === 'all' ? true :
        filter === 'free' ? t.status === 'free' :
        filter === 'occupied' ? t.status === 'occupied' :
        filter === 'bill_requested' ? t.status === 'bill_requested' :
        filter === 'reserved' ? t.status === 'reserved' :
        filter === 'cleaning' ? t.status === 'cleaning' : true;

      const matchSearch = searchTerm === '' || 
        t.number.toString().includes(searchTerm) ||
        (t.waiterName && t.waiterName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchZone = zoneFilter === 'all' || (t.zone || 'salao_principal') === zoneFilter;

      return matchFilter && matchSearch && matchZone;
    });
  }, [tables, filter, searchTerm, zoneFilter]);

  // Product categories for item picker
  const categories = useMemo(() => {
    return ['all', ...Array.from(new Set(products.map(p => p.category)))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(itemSearch.toLowerCase());
      return matchCat && matchSearch && p.available;
    });
  }, [products, selectedCategory, itemSearch]);

  // Handle open / click table
  const handleTableClick = (table: TableItem) => {
    playBeep(700, 0.04);
    setSelectedTable(table);
  };

  // Quick Open Table
  const handleOpenTable = (tableNumber: number) => {
    playBeep(850, 0.05);
    setTables(prev => prev.map(t => {
      if (t.number === tableNumber) {
        return {
          ...t,
          status: 'occupied',
          currentTotal: 0,
          waiterName: currentUser.name || 'Atendente Salão',
          openedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          customersCount: 2,
        };
      }
      return t;
    }));
    setSelectedTable(prev => prev && prev.number === tableNumber ? {
      ...prev,
      status: 'occupied',
      currentTotal: 0,
      waiterName: currentUser.name || 'Atendente Salão',
      openedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      customersCount: 2,
    } : prev);
  };

  // Add Item to Table in progress
  const handleAddItemToTable = (product: Product) => {
    playBeep(900, 0.03);
    const newItem: OrderItem = {
      id: `item_tbl_${Date.now()}_${Math.random()}`,
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: product.price,
      totalPrice: product.price,
      station: product.station,
      status: 'pending',
    };
    setTemporaryItems(prev => [...prev, newItem]);
  };

  // Confirm adding items to table
  const handleConfirmAddItems = () => {
    if (!selectedTable || temporaryItems.length === 0) return;

    const itemsTotal = temporaryItems.reduce((acc, i) => acc + i.totalPrice, 0);

    // Create a real order in the system linked to table
    createOrder({
      channel: 'mesa',
      tableNumber: selectedTable.number,
      customerName: `Mesa ${selectedTable.number}`,
      items: temporaryItems,
      subtotal: itemsTotal,
      total: itemsTotal,
      status: 'recebido',
      paymentStatus: 'pending',
    });

    setTables(prev => prev.map(t => {
      if (t.number === selectedTable.number) {
        return {
          ...t,
          status: 'occupied',
          currentTotal: Number((t.currentTotal + itemsTotal).toFixed(2)),
          openedAt: t.openedAt || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        };
      }
      return t;
    }));

    playKitchenBell();
    setTemporaryItems([]);
    setIsAddItemsModalOpen(false);

    // Refresh selected table state
    setSelectedTable(prev => prev ? {
      ...prev,
      status: 'occupied',
      currentTotal: Number((prev.currentTotal + itemsTotal).toFixed(2)),
    } : null);
  };

  // Confirm adding items to comanda
  const handleConfirmAddItemsToComanda = () => {
    if (!selectedComandaForItems || temporaryItems.length === 0) return;

    const itemsTotal = temporaryItems.reduce((acc, i) => acc + i.totalPrice, 0);

    // Create a real order in the system linked to comanda
    createOrder({
      channel: 'comanda',
      tableNumber: selectedComandaForItems.tableNumber,
      customerName: selectedComandaForItems.customerName,
      items: temporaryItems,
      subtotal: itemsTotal,
      total: itemsTotal,
      status: 'recebido',
      paymentStatus: 'pending',
    });

    setComandas(prev => prev.map(c => {
      if (c.id === selectedComandaForItems.id) {
        return {
          ...c,
          items: [...c.items, ...temporaryItems],
          total: Number((c.total + itemsTotal).toFixed(2)),
        };
      }
      return c;
    }));

    playKitchenBell();
    setTemporaryItems([]);
    setSelectedComandaForItems(null);
  };

  // Request partial bill (Conta / Conferência)
  const handleRequestBill = (tableNumber: number) => {
    playBeep(650, 0.05);
    setTables(prev => prev.map(t => t.number === tableNumber ? { ...t, status: 'bill_requested' } : t));
    setSelectedTable(prev => prev ? { ...prev, status: 'bill_requested' } : null);
    
    // Simulate printing conferência de mesa
    const tableData = tables.find(t => t.number === tableNumber);
    if (tableData) {
      setPrintOrder({
        id: `conf_mesa_${tableNumber}`,
        orderNumber: tableNumber,
        displayCode: `MESA #${tableNumber}`,
        tenantId: 'tenant_01',
        branchId: 'branch_01',
        channel: 'mesa',
        status: 'pending',
        customerName: `Conferência Mesa ${tableNumber}`,
        tableNumber: tableNumber,
        items: [
          { id: '1', productId: 'p1', productName: 'Consumo Parcial Acumulado na Mesa', quantity: 1, unitPrice: tableData.currentTotal, totalPrice: tableData.currentTotal, station: 'assembly', status: 'ready' }
        ],
        subtotal: tableData.currentTotal,
        discount: 0,
        deliveryFee: 0,
        serviceFee: tableData.currentTotal * 0.1,
        total: tableData.currentTotal * 1.1,
        paymentMethod: 'pix',
        paymentStatus: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // Transfer Table
  const handleTransferTable = () => {
    if (!selectedTable || targetTableNumber === '') return;
    const targetNum = Number(targetTableNumber);

    const targetTable = tables.find(t => t.number === targetNum);
    if (!targetTable || targetTable.status !== 'free') {
      alert('A mesa de destino deve estar livre!');
      return;
    }

    setTables(prev => prev.map(t => {
      if (t.number === selectedTable.number) {
        return { ...t, status: 'free', currentTotal: 0, currentOrderId: undefined, openedAt: undefined, customersCount: undefined };
      }
      if (t.number === targetNum) {
        return {
          ...t,
          status: selectedTable.status,
          currentTotal: selectedTable.currentTotal,
          waiterName: selectedTable.waiterName,
          openedAt: selectedTable.openedAt,
          customersCount: selectedTable.customersCount,
        };
      }
      return t;
    }));

    playBeep(900, 0.05);
    setIsTransferModalOpen(false);
    setSelectedTable(null);
    setTargetTableNumber('');
  };

  // Settle Table / Close bill
  const handleSettleTable = () => {
    if (!selectedTable) return;

    const baseAmount = selectedTable.currentTotal;
    const serviceVal = includeService ? baseAmount * 0.1 : 0;
    const finalAmount = Number((baseAmount + serviceVal).toFixed(2));

    // Register closed order in the central system
    createOrder({
      channel: 'mesa',
      tableNumber: selectedTable.number,
      customerName: `Mesa ${selectedTable.number} (Fechamento)`,
      items: [
        { id: 'settle_1', productId: 'p_mesa', productName: `Fechamento Salão Mesa ${selectedTable.number}`, quantity: 1, unitPrice: baseAmount, totalPrice: baseAmount, station: 'assembly', status: 'ready' }
      ],
      subtotal: baseAmount,
      serviceFee: serviceVal,
      total: finalAmount,
      paymentMethod,
      paymentStatus: 'paid',
      status: 'completed',
    });

    // Reset table to free
    setTables(prev => prev.map(t => {
      if (t.number === selectedTable.number) {
        return {
          ...t,
          status: 'free',
          currentTotal: 0,
          currentOrderId: undefined,
          openedAt: undefined,
          customersCount: undefined,
        };
      }
      return t;
    }));

    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#00D26A', '#FFC72C', '#FF7A00']
      });
    } catch (e) {}

    playCashRegister();
    setIsPaymentModalOpen(false);
    setSelectedTable(null);
  };

  // Create new Comanda
  const handleCreateComanda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComandaName.trim()) return;

    const nextCode = `CMD #${100 + comandas.length + 1}`;
    const newCmd: ComandaItem = {
      id: `cmd_${Date.now()}`,
      code: nextCode,
      customerName: newComandaName,
      tableNumber: newComandaTable !== '' ? Number(newComandaTable) : undefined,
      items: [],
      total: 0,
      openedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      waiter: currentUser.name || 'Atendente Salão',
      status: 'open',
    };

    setComandas(prev => [newCmd, ...prev]);
    setNewComandaName('');
    setNewComandaTable('');
    setIsNewComandaModalOpen(false);
    playBeep(880, 0.05);
  };

  // Smart POS & Terminal State
  const [isPOSModalOpen, setIsPOSModalOpen] = useState(false);
  const [posModalTarget, setPosModalTarget] = useState<SmartPOSPaymentTarget | null>(null);
  const [isPrinterSettingsOpen, setIsPrinterSettingsOpen] = useState(false);

  // Open Smart POS charging for a Table or Comanda
  const handleOpenTableSmartPOS = (tableNumber: number) => {
    const tableData = tables.find(t => t.number === tableNumber);
    if (!tableData || tableData.currentTotal <= 0) return;

    setPosModalTarget({
      type: 'mesa',
      id: tableNumber,
      title: `Mesa ${tableNumber.toString().padStart(2, '0')}`,
      amount: tableData.currentTotal,
      customerName: `Mesa ${tableNumber}`,
      waiterName: tableData.waiterName || currentUser.name || 'Atendente Salão',
    });
    setIsPOSModalOpen(true);
  };

  const handleOpenComandaSmartPOS = (cmd: ComandaItem) => {
    if (cmd.total <= 0) return;

    setPosModalTarget({
      type: 'comanda',
      id: cmd.id,
      title: `${cmd.code} - ${cmd.customerName}`,
      amount: cmd.total,
      customerName: cmd.customerName,
      waiterName: cmd.waiter || currentUser.name || 'Atendente Salão',
    });
    setIsPOSModalOpen(true);
  };

  // Process approved payment from Smart POS
  const handlePOSPaymentApproved = (result: {
    method: 'credit' | 'debit' | 'pix' | 'voucher';
    brand: string;
    nsu: string;
    tid: string;
    authCode: string;
    terminalName: string;
    amount: number;
  }) => {
    if (!posModalTarget) return;

    if (posModalTarget.type === 'mesa') {
      const tableNum = Number(posModalTarget.id);

      createOrder({
        channel: 'mesa',
        tableNumber: tableNum,
        customerName: `Mesa ${tableNum} (${result.brand})`,
        items: [
          {
            id: `settle_pos_${Date.now()}`,
            productId: 'p_mesa',
            productName: `Fechamento Salão Mesa ${tableNum} (${result.brand} - TEF ${result.authCode})`,
            quantity: 1,
            unitPrice: posModalTarget.amount,
            totalPrice: posModalTarget.amount,
            station: 'assembly',
            status: 'ready'
          }
        ],
        subtotal: posModalTarget.amount,
        serviceFee: Number((result.amount - posModalTarget.amount).toFixed(2)),
        total: result.amount,
        paymentMethod: result.method === 'pix' ? 'pix' : result.method === 'debit' ? 'debit_card' : 'credit_card',
        paymentStatus: 'paid',
        status: 'completed',
      });

      // Free table
      setTables(prev => prev.map(t => t.number === tableNum ? {
        ...t,
        status: 'free',
        currentTotal: 0,
        currentOrderId: undefined,
        openedAt: undefined,
        customersCount: undefined
      } : t));

      setSelectedTable(null);
    } else if (posModalTarget.type === 'comanda') {
      const cmdId = String(posModalTarget.id);

      createOrder({
        channel: 'comanda',
        customerName: posModalTarget.title,
        items: [
          {
            id: `cmd_settle_${Date.now()}`,
            productId: 'p_cmd',
            productName: `Liquidação ${posModalTarget.title} (${result.brand} - TEF ${result.authCode})`,
            quantity: 1,
            unitPrice: posModalTarget.amount,
            totalPrice: posModalTarget.amount,
            station: 'assembly',
            status: 'ready'
          }
        ],
        subtotal: posModalTarget.amount,
        total: result.amount,
        paymentMethod: result.method === 'pix' ? 'pix' : result.method === 'debit' ? 'debit_card' : 'credit_card',
        paymentStatus: 'paid',
        status: 'completed',
      });

      setComandas(prev => prev.filter(c => c.id !== cmdId));
    }

    setIsPOSModalOpen(false);
    setPosModalTarget(null);
  };

  const handlePrintTableToKitchen = async (tableNumber: number) => {
    playKitchenBell();
    const tableOrders = orders.filter(
      (o) => o.tableNumber === tableNumber && o.status !== 'completed' && o.status !== 'cancelled'
    );
    const targetTable = tables.find((t) => t.number === tableNumber);

    if (tableOrders.length > 0) {
      const res = await thermalPrinterService.dispatchKitchenOrder(tableOrders[0], undefined, {
        isReprint: true,
      });
      setKitchenPrintToast({
        message: res.message,
        printerName: res.targetPrinter,
        hexPreview: res.hexPreview,
      });
    } else {
      const res = await thermalPrinterService.dispatchKitchenComanda({
        code: `MESA #${tableNumber.toString().padStart(2, '0')}`,
        customerName: targetTable?.waiterName ? `Atendente ${targetTable.waiterName}` : `Mesa ${tableNumber}`,
        tableNumber,
        waiter: targetTable?.waiterName || 'Atendente Salão',
        items: [
          {
            id: `tbl_item_${Date.now()}`,
            productId: 'p_mesa',
            productName: 'Consumo da Mesa em Aberto',
            quantity: 1,
            unitPrice: targetTable?.currentTotal || 0,
            totalPrice: targetTable?.currentTotal || 0,
            station: 'grill',
            status: 'ready',
          },
        ],
        openedAt: targetTable?.openedAt || new Date().toLocaleTimeString('pt-BR'),
      });
      setKitchenPrintToast({
        message: res.message,
        printerName: res.targetPrinter,
        hexPreview: res.hexPreview,
      });
    }
    setTimeout(() => setKitchenPrintToast(null), 4500);
  };

  const handlePrintComandaToKitchen = async (cmd: ComandaItem) => {
    playKitchenBell();
    const res = await thermalPrinterService.dispatchKitchenComanda({
      code: cmd.code,
      customerName: cmd.customerName,
      tableNumber: cmd.tableNumber,
      waiter: cmd.waiter,
      items: cmd.items,
      openedAt: cmd.openedAt,
    });
    setKitchenPrintToast({
      message: res.message,
      printerName: res.targetPrinter,
      hexPreview: res.hexPreview,
    });
    setTimeout(() => setKitchenPrintToast(null), 4500);
  };

  return (
    <div className="space-y-6 pb-20 select-none">
      {/* Header & Stats Banner */}
      <motion.div 
        layout
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-3xl bg-gradient-to-r from-[#14141E] via-[#1A1A28] to-[#12121A] border border-[#2B2B3C] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#FFC72C] px-3 py-1 rounded-full bg-[#FFC72C]/15 border border-[#FFC72C]/30 flex items-center gap-1.5">
              <UtensilsCrossed className="w-3.5 h-3.5" /> Salão em Tempo Real
            </span>
            <span className="text-xs text-[#71717A]">•</span>
            <span className="text-xs font-bold text-[#A1A1AA]">SCREEN_94 • Mapa de Mesas & Comandas</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight pt-1">
            Gestão do Salão, Mesas e Comandas
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-xl">
            Acompanhe ocupação, pedidos em aberto, comandas individuais, transferência e fechamento com divisão de conta.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
          <button
            onClick={() => setIsPrinterSettingsOpen(true)}
            className="px-3.5 py-2.5 rounded-2xl bg-[#1C1C2A] hover:bg-[#28283C] border border-[#32324A] text-zinc-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            title="Configurar impressoras térmicas de recibo e comanda"
          >
            <Printer className="w-4 h-4 text-[#FFC72C]" />
            <span>Impressoras Térmicas</span>
          </button>

          <button
            onClick={() => {
              // Open POS with first occupied table or sample
              const firstOccupied = tables.find(t => t.status === 'occupied' || t.status === 'bill_requested');
              if (firstOccupied) {
                handleOpenTableSmartPOS(firstOccupied.number);
              } else if (comandas.length > 0) {
                handleOpenComandaSmartPOS(comandas[0]);
              } else {
                handleOpenTableSmartPOS(tables[0]?.number || 1);
              }
            }}
            className="px-3.5 py-2.5 rounded-2xl bg-[#1C1C2A] hover:bg-[#28283C] border border-[#32324A] text-zinc-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            title="Cobrar mesa ou comanda no terminal Smart POS"
          >
            <CreditCard className="w-4 h-4 text-[#00D26A]" />
            <span>Maquininha (Smart POS)</span>
          </button>

          <button
            onClick={() => setIsNewComandaModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-[#FF7A00] hover:bg-[#FF8C1A] text-white text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Comanda</span>
          </button>
        </div>
      </motion.div>

      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl shadow-lg">
          <div className="text-xs text-[#A1A1AA] uppercase font-bold tracking-wider flex items-center gap-1.5">
            <UtensilsCrossed className="w-3.5 h-3.5 text-[#E31837]" />
            <span>Mesas Ocupadas</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-2">
            {occupiedTables} <span className="text-sm font-normal text-[#71717A]">/ {totalTables}</span>
          </div>
          <div className="text-xs text-[#E31837] font-bold mt-1">
            {totalTables === 0 
              ? 'Nenhuma mesa cadastrada' 
              : occupiedTables === 0 
                ? `Todas as ${totalTables} mesas livres` 
                : `${totalTables - occupiedTables} mesas livres agora`}
          </div>
        </div>

        <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl shadow-lg">
          <div className="text-xs text-[#A1A1AA] uppercase font-bold tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#FFC72C]" />
            <span>Taxa de Ocupação</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-[#FFC72C] mt-2">
            {occupancyRate}%
          </div>
          <div className="w-full bg-[#1F1F2E] h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-[#FFC72C] h-full rounded-full transition-all duration-500" style={{ width: `${occupancyRate}%` }} />
          </div>
        </div>

        <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl shadow-lg">
          <div className="text-xs text-[#A1A1AA] uppercase font-bold tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-[#00D26A]" />
            <span>Consumo Aberto</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-[#00D26A] mt-2">
            {formatBRL(totalOpenRevenue)}
          </div>
          <div className="text-xs text-[#A1A1AA] font-semibold mt-1">
            {totalOpenRevenue > 0 ? 'Acumulado no salão' : 'Sem consumo aberto'}
          </div>
        </div>

        <div className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl shadow-lg">
          <div className="text-xs text-[#A1A1AA] uppercase font-bold tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#00B8FF]" />
            <span>Giro Médio</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-[#00B8FF] mt-2">
            {avgDwellMinutes !== null ? `${avgDwellMinutes} min` : '0 min'}
          </div>
          <div className="text-xs text-[#71717A] font-semibold mt-1">
            {avgDwellMinutes !== null ? 'Tempo médio de salão' : 'Nenhuma mesa em atendimento'}
          </div>
        </div>
      </div>

      {/* Main Tabs: Mesas vs Comandas */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[#20202E] pb-4">
        <div className="flex items-center gap-2 bg-[#12121A] p-1.5 rounded-2xl border border-[#242438]">
          <button
            onClick={() => { setActiveTab('mesas'); playBeep(600, 0.04); }}
            className={`px-5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'mesas'
                ? 'bg-[#E31837] text-white shadow-[0_0_15px_rgba(227,24,55,0.4)]'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Mapa do Salão (Mesas)</span>
            <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full">{totalTables}</span>
          </button>

          <button
            onClick={() => { setActiveTab('comandas'); playBeep(600, 0.04); }}
            className={`px-5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'comandas'
                ? 'bg-[#FF7A00] text-white shadow-[0_0_15px_rgba(255,122,0,0.4)]'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Comandas Individuais</span>
            <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full">{comandas.length}</span>
          </button>
        </div>

        {activeTab === 'mesas' && (
          <div className="flex items-center gap-3 flex-wrap">
            {/* View Mode Toggle: Grid Gráfico Arrastável vs Cards */}
            <div className="flex items-center gap-1 bg-[#101016] p-1 rounded-xl border border-[#252538]">
              <button
                onClick={() => { setMesasViewMode('floorplan'); playBeep(650, 0.03); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  mesasViewMode === 'floorplan'
                    ? 'bg-[#E31837] text-white shadow-[0_0_12px_rgba(227,24,55,0.4)]'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
                title="Visualização gráfica do salão com grid arrastável"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-white" />
                <span>Salão Interativo</span>
              </button>
              <button
                onClick={() => { setMesasViewMode('cards'); playBeep(550, 0.03); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  mesasViewMode === 'cards'
                    ? 'bg-[#2E2E42] text-white border border-[#4B4B66]'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
                title="Visualização em cards tradicionais"
              >
                <Layers className="w-3.5 h-3.5 text-[#A1A1AA]" />
                <span>Cards</span>
              </button>
            </div>

            {/* Table Management Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedTableForQr(tables[0] || null);
                  setIsQrCodeModalOpen(true);
                  playBeep(750, 0.04);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#FFC72C]/15 hover:bg-[#FFC72C]/25 text-[#FFC72C] text-xs font-bold border border-[#FFC72C]/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                title="Gerar e imprimir QR Codes de Cardápio Digital das Mesas"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Codes</span>
              </button>

              <button
                onClick={() => {
                  setNewTableNumber(tables.length > 0 ? Math.max(...tables.map(t => t.number)) + 1 : 1);
                  setNewTableError(null);
                  setIsNewTableModalOpen(true);
                  playBeep(750, 0.04);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#00D26A]/15 hover:bg-[#00D26A]/25 text-[#00D26A] text-xs font-bold border border-[#00D26A]/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                title="Adicionar nova mesa ao salão"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Mesa</span>
              </button>

              <button
                onClick={() => {
                  setIsRemoveTableModalOpen(true);
                  playBeep(600, 0.04);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#FF2B4E]/15 hover:bg-[#FF2B4E]/25 text-[#FF4D6D] hover:text-[#FF2B4E] text-xs font-bold border border-[#FF2B4E]/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                title="Remover ou gerenciar exclusão de mesas do salão"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remover Mesa</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: MESAS MAP */}
      {activeTab === 'mesas' && (
        mesasViewMode === 'floorplan' ? (
          <SaloonFloorPlanGrid
            tables={tables}
            onTableClick={handleTableClick}
            onOpenTable={handleOpenTable}
            onAddItems={(table) => {
              setSelectedTable(table);
              setIsAddItemsModalOpen(true);
            }}
            onRequestBill={handleRequestBill}
            onSettleBill={(table) => {
              setSelectedTable(table);
              setIsPaymentModalOpen(true);
            }}
            onUpdateTablePosition={(tableNumber, x, y) => {
              setTables(prev => prev.map(t => t.number === tableNumber ? { ...t, x, y } : t));
            }}
            onRemoveTable={(tableNumber) => {
              const tbl = tables.find(t => t.number === tableNumber);
              if (tbl) promptRemoveTable(tbl);
            }}
            onEditTable={openQuickEditModal}
            onShowTableQrCode={openTableQrCodeModal}
            filter={filter}
            onFilterChange={setFilter}
            searchTerm={searchTerm}
          />
        ) : (
          <div className="space-y-4">
            {/* Filter bar for cards mode */}
            <div className="flex items-center justify-between gap-3 flex-wrap bg-[#101018] p-3 rounded-2xl border border-[#222232]">
              <div className="flex items-center gap-2 flex-wrap">
                {(['all', 'free', 'occupied', 'bill_requested', 'reserved', 'cleaning'] as TableFilter[]).map(f => {
                  const count = f === 'all' ? tables.length : tables.filter(t => t.status === f).length;
                  return (
                    <button
                      key={f}
                      onClick={() => { setFilter(f); playBeep(550, 0.03); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize cursor-pointer flex items-center gap-1.5 ${
                        filter === f
                          ? f === 'cleaning'
                            ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B] shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                            : 'bg-[#2E2E42] text-white border border-[#4B4B66]'
                          : f === 'cleaning'
                          ? 'text-[#F59E0B]/80 hover:text-[#F59E0B] bg-[#F59E0B]/5 border border-[#F59E0B]/20'
                          : 'text-[#71717A] hover:text-white'
                      }`}
                    >
                      {f === 'all' && 'Todas'}
                      {f === 'free' && '🟢 Livres'}
                      {f === 'occupied' && '🔴 Ocupadas'}
                      {f === 'bill_requested' && '🟡 Conta Pedida'}
                      {f === 'reserved' && '🟣 Reservadas'}
                      {f === 'cleaning' && (
                        <>
                          <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
                          <span>Aguardando Limpeza</span>
                        </>
                      )}
                      <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full font-mono">
                        {count}
                      </span>
                    </button>
                  );
                })}

                {/* Sector Selector Filter */}
                <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-[#242438]">
                  <MapPin className="w-3.5 h-3.5 text-[#FF7A00]" />
                  <select
                    value={zoneFilter}
                    onChange={(e) => setZoneFilter(e.target.value as any)}
                    className="bg-[#181824] border border-[#2B2B3C] text-xs text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#00D26A] cursor-pointer"
                  >
                    <option value="all">Todos os Setores</option>
                    <option value="salao_principal">Salão Principal</option>
                    <option value="varanda">Varanda / Deck</option>
                    <option value="bar_lounge">Bar & Balcão</option>
                    <option value="mezanino">Mezanino</option>
                  </select>
                </div>

                {/* Drag-and-Drop Reorganize Grid Mode Toggle */}
                <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-[#242438]">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isReorderMode;
                      setIsReorderMode(next);
                      playBeep(next ? 750 : 550, 0.03);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      isReorderMode
                        ? 'bg-[#00D26A] text-black border-[#00D26A] shadow-[0_0_15px_rgba(0,210,106,0.35)]'
                        : 'bg-[#181824] hover:bg-[#252538] text-zinc-300 hover:text-white border-[#2E2E42]'
                    }`}
                    title="Ativar modo de reorganização livre da grid via arrastar e soltar (Drag and Drop)"
                  >
                    <Move className="w-3.5 h-3.5" />
                    <span>{isReorderMode ? 'Reorganizando Grid' : 'Reorganizar Layout'}</span>
                    {isReorderMode && (
                      <span className="w-2 h-2 rounded-full bg-black animate-ping" />
                    )}
                  </button>

                  {isReorderMode && (
                    <button
                      type="button"
                      onClick={handleResetTableOrder}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#181824] hover:bg-[#252538] text-zinc-300 hover:text-white border border-[#2E2E42] transition-all flex items-center gap-1 cursor-pointer"
                      title="Restaurar ordenação numérica padrão (1, 2, 3...)"
                    >
                      <RotateCcw className="w-3 h-3 text-[#FFC72C]" />
                      <span className="hidden sm:inline">Ordem Padrão</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar mesa ou atendente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-[#14141E] border border-[#28283C] rounded-xl text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#00D26A]"
                />
              </div>
            </div>

            {/* Reorder Mode Helper Banner */}
            <AnimatePresence>
              {isReorderMode && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-3.5 rounded-2xl bg-gradient-to-r from-[#00D26A]/20 via-[#00B8FF]/10 to-[#12121A] border border-[#00D26A]/40 flex items-center justify-between gap-3 text-xs shadow-[0_0_20px_rgba(0,210,106,0.15)] flex-wrap"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#00D26A]/20 text-[#00D26A] flex items-center justify-center border border-[#00D26A]/40">
                      <GripVertical className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                      <p className="font-black text-white flex items-center gap-2">
                        <span>Reorganização Livre da Grid Ativa</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00D26A] text-black font-extrabold uppercase tracking-wide">
                          Drag & Drop
                        </span>
                      </p>
                      <p className="text-zinc-300 text-[11px] mt-0.5">
                        Arraste e solte qualquer mesa para reposicioná-la livremente na grid, ou utilize as setas ◀ ▶ nos cards. O novo layout fica salvo automaticamente.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetTableOrder}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white font-bold border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer text-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#FFC72C]" />
                      <span>Restaurar 1, 2, 3...</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsReorderMode(false);
                        playBeep(650, 0.03);
                        showToast('Layout das mesas salvo com sucesso!', 'success');
                      }}
                      className="px-4 py-1.5 rounded-xl bg-[#00D26A] hover:bg-[#00E575] text-black font-black transition-all shadow-[0_0_12px_rgba(0,210,106,0.4)] cursor-pointer text-xs active:scale-95"
                    >
                      Concluir
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Cards Grid */}
            <div className="mesas-comandas-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {filteredTables.map((table, tableIndex) => {
                const isFree = table.status === 'free';
                const isOccupied = table.status === 'occupied';
                const isBillRequested = table.status === 'bill_requested';
                const isReserved = table.status === 'reserved';
                const isCleaning = table.status === 'cleaning';
                const occInfo = calculateOccupancyTime(table);

                const isBeingDragged = draggedTableNumber === table.number;
                const isDragTarget = dragOverTableNumber === table.number && !isBeingDragged;
                const isSelected = selectedTableInGrid === table.number || selectedTable?.number === table.number;

                return (
                  <motion.div
                    key={table.number}
                    layout
                    draggable
                    tabIndex={0}
                    role="button"
                    aria-selected={isSelected}
                    data-selected={isSelected}
                    onFocus={() => setSelectedTableInGrid(table.number)}
                    onDragStart={(e) => handleTableDragStart(e as any, table.number)}
                    onDragOver={(e) => handleTableDragOver(e as any, table.number)}
                    onDrop={(e) => handleTableDrop(e as any, table.number)}
                    onDragEnd={handleTableDragEnd}
                    animate={{
                      scale: isBeingDragged ? 0.95 : isDragTarget ? 1.03 : isSelected ? 1.02 : 1,
                    }}
                    whileHover={{ scale: isBeingDragged ? 1 : 1.02, y: isBeingDragged ? 0 : -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (isReorderMode) return;
                      setSelectedTableInGrid(prev => prev === table.number ? null : table.number);
                      openQuickEditModal(table);
                    }}
                    className={`mesa-card-item status-${table.status} p-5 rounded-3xl border transition-all duration-200 relative overflow-hidden flex flex-col justify-between min-h-[195px] select-none cursor-pointer ${
                      isBeingDragged
                        ? 'opacity-30 scale-95 border-dashed border-[#00D26A] bg-[#00D26A]/5 cursor-grabbing z-10'
                        : isDragTarget
                        ? 'ring-4 ring-[#00D26A] shadow-[0_0_35px_rgba(0,210,106,0.45)] scale-[1.03] border-[#00D26A] z-30 bg-[#00D26A]/15 cursor-copy'
                        : isSelected
                        ? 'is-selected scale-[1.02] ring-2 ring-offset-2 ring-offset-[#09090D] z-20 ' + (
                            isCleaning
                              ? 'bg-gradient-to-br from-[#2D1F08] to-[#16131D] border-[#F59E0B] ring-[#F59E0B] shadow-[0_0_26px_rgba(245,158,11,0.5),0_10px_25px_rgba(0,0,0,0.6)]'
                              : isFree
                              ? 'bg-gradient-to-br from-[#12241C] to-[#0E151A] border-[#00D26A] ring-[#00D26A] shadow-[0_0_26px_rgba(0,210,106,0.5),0_10px_25px_rgba(0,0,0,0.6)]'
                              : isOccupied
                              ? 'bg-gradient-to-br from-[#2B121A] to-[#16131D] border-[#FF2B4E] ring-[#FF2B4E] shadow-[0_0_26px_rgba(255,43,78,0.5),0_10px_25px_rgba(0,0,0,0.6)]'
                              : isBillRequested
                              ? 'bg-gradient-to-br from-[#2E2410] to-[#181622] border-[#FFC72C] ring-[#FFC72C] shadow-[0_0_30px_rgba(255,199,44,0.55),0_10px_25px_rgba(0,0,0,0.6)]'
                              : 'bg-gradient-to-br from-[#241533] to-[#15131F] border-[#A855F7] ring-[#A855F7] shadow-[0_0_26px_rgba(168,85,247,0.5),0_10px_25px_rgba(0,0,0,0.6)]'
                          )
                        : isCleaning
                        ? 'bg-gradient-to-br from-[#261C08] to-[#14121A] border-[#F59E0B]/80 shadow-[0_0_16px_rgba(245,158,11,0.22)] hover:border-[#F59E0B] hover:shadow-[0_0_24px_rgba(245,158,11,0.42),0_10px_25px_rgba(0,0,0,0.5)] hover:scale-[1.02]'
                        : isFree
                        ? 'bg-gradient-to-br from-[#0F1C16] to-[#0D0D14] border-[#00D26A]/40 hover:border-[#00D26A] shadow-[0_0_15px_rgba(0,210,106,0.12)] hover:shadow-[0_0_24px_rgba(0,210,106,0.4),0_10px_25px_rgba(0,0,0,0.5)] hover:scale-[1.02]'
                        : isOccupied
                        ? 'bg-gradient-to-br from-[#221016] to-[#12121A] border-[#FF2B4E]/80 shadow-[0_0_16px_rgba(255,43,78,0.22)] hover:border-[#FF2B4E] hover:shadow-[0_0_24px_rgba(255,43,78,0.42),0_10px_25px_rgba(0,0,0,0.5)] hover:scale-[1.02]'
                        : isBillRequested
                        ? 'bg-gradient-to-br from-[#221C0E] to-[#14141E] border-[#FFC72C] shadow-[0_0_22px_rgba(255,199,44,0.32)] hover:shadow-[0_0_28px_rgba(255,199,44,0.52),0_10px_25px_rgba(0,0,0,0.5)] hover:scale-[1.02]'
                        : 'bg-gradient-to-br from-[#1B1226] to-[#12121A] border-[#A855F7]/70 shadow-[0_0_16px_rgba(168,85,247,0.22)] hover:border-[#A855F7] hover:shadow-[0_0_24px_rgba(168,85,247,0.42),0_10px_25px_rgba(0,0,0,0.5)] hover:scale-[1.02]'
                    }`}
                  >
                    {/* Drop Target Visual Overlay */}
                    {isDragTarget && (
                      <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-3 z-40 border-2 border-[#00D26A] rounded-3xl animate-pulse text-center pointer-events-none">
                        <div className="w-10 h-10 rounded-full bg-[#00D26A]/20 border border-[#00D26A] flex items-center justify-center text-[#00D26A] mb-1 shadow-[0_0_15px_rgba(0,210,106,0.4)]">
                          <ArrowRightLeft className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-black text-white">Soltar para posicionar aqui</span>
                        <span className="text-[11px] text-[#00D26A] font-bold mt-0.5">
                          Mover Mesa {draggedTableNumber} → Posição #{tableIndex + 1}
                        </span>
                      </div>
                    )}

                    {/* Top Bar: Table Number, Custom Name, Sector & Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Dedicated Grip Drag Handle */}
                          <div
                            className={`p-1 rounded-lg border transition-all flex items-center justify-center cursor-grab active:cursor-grabbing ${
                              isReorderMode
                                ? 'bg-[#00D26A]/25 text-[#00D26A] border-[#00D26A]/50 shadow-[0_0_10px_rgba(0,210,106,0.3)]'
                                : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border-white/10'
                            }`}
                            title="Segure e arraste para reorganizar livremente esta mesa na grid"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <GripVertical className="w-3 h-3" />
                          </div>

                          <span className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-wider">MESA</span>
                          {table.zone && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/5 text-zinc-300 font-medium">
                              {ZONE_LABELS[table.zone] || table.zone}
                            </span>
                          )}
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/5 text-zinc-400 font-medium flex items-center gap-1">
                            <Users className="w-2.5 h-2.5" />
                            {table.seats || 4}L
                          </span>

                          {isReorderMode && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#00D26A]/20 text-[#00D26A] font-mono font-bold border border-[#00D26A]/30">
                              #{tableIndex + 1}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-3xl font-black text-white font-mono leading-none">
                            {table.number.toString().padStart(2, '0')}
                          </span>
                          {(table.name || table.label) && (
                            <span className="text-xs font-bold text-zinc-300 truncate max-w-[130px]" title={table.name || table.label}>
                              {table.name || table.label}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Badge & Direct Table Actions */}
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-1.5">
                          {/* Quick Nudge Arrows in Reorder Mode */}
                          {isReorderMode && (
                            <div
                              className="flex items-center gap-0.5 bg-black/50 p-0.5 rounded-lg border border-white/15 mr-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => handleMoveTableStep(table.number, 'left')}
                                className="p-1 rounded bg-white/5 hover:bg-white/25 text-zinc-300 hover:text-white transition-all cursor-pointer"
                                title="Mover mesa para a esquerda"
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveTableStep(table.number, 'right')}
                                className="p-1 rounded bg-white/5 hover:bg-white/25 text-zinc-300 hover:text-white transition-all cursor-pointer"
                                title="Mover mesa para a direita"
                              >
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {/* Distinct Neon Status Badges */}
                          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                            isCleaning
                              ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/50 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                              : isFree
                              ? 'bg-[#00D26A]/15 text-[#00D26A] border-[#00D26A]/40 shadow-[0_0_8px_rgba(0,210,106,0.25)]'
                              : isOccupied
                              ? 'bg-[#FF2B4E]/20 text-[#FF2B4E] border-[#FF2B4E]/50 shadow-[0_0_8px_rgba(255,43,78,0.25)]'
                              : isBillRequested
                              ? 'bg-[#FFC72C]/25 text-[#FFC72C] border-[#FFC72C]/60 shadow-[0_0_8px_rgba(255,199,44,0.35)]'
                              : 'bg-[#A855F7]/20 text-[#A855F7] border-[#A855F7]/50 shadow-[0_0_8px_rgba(168,85,247,0.25)]'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isCleaning
                                ? 'bg-[#F59E0B] animate-pulse'
                                : isFree
                                ? 'bg-[#00D26A]'
                                : isOccupied
                                ? 'bg-[#FF2B4E] animate-ping'
                                : isBillRequested
                                ? 'bg-[#FFC72C] animate-pulse'
                                : 'bg-[#A855F7]'
                            }`} />
                            {isCleaning && 'Aguardando Limpeza'}
                            {isFree && 'Livre'}
                            {isOccupied && 'Ocupada'}
                            {isBillRequested && 'Pediu Conta'}
                            {isReserved && 'Reservada'}
                          </span>

                          {/* QR Code Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openTableQrCodeModal(table);
                            }}
                            className="p-1.5 rounded-xl bg-[#FFC72C]/15 hover:bg-[#FFC72C] text-[#FFC72C] hover:text-black transition-all border border-[#FFC72C]/30 cursor-pointer active:scale-95"
                            title={`Gerar QR Code do Cardápio para Mesa ${table.number}`}
                          >
                            <QrCode className="w-3 h-3" />
                          </button>

                          {/* Quick Edit Pencil Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openQuickEditModal(table);
                            }}
                            className="p-1.5 rounded-xl bg-[#00B8FF]/15 hover:bg-[#00B8FF] text-[#00B8FF] hover:text-black transition-all border border-[#00B8FF]/30 cursor-pointer active:scale-95"
                            title={`Edição Rápida da Mesa ${table.number} (Renomear e Lugares)`}
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>

                          {/* Remove Table Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              promptRemoveTable(table);
                            }}
                            className="p-1.5 rounded-xl bg-[#FF2B4E]/10 hover:bg-[#FF2B4E] text-[#FF4D6D] hover:text-white transition-all border border-[#FF2B4E]/30 cursor-pointer active:scale-95"
                            title={`Remover Mesa ${table.number} do salão`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Occupancy Time Alert Pill */}
                        {(isOccupied || isBillRequested) && (
                          <span
                            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border"
                            style={{
                              color: occInfo.color,
                              borderColor: `${occInfo.color}40`,
                              backgroundColor: `${occInfo.color}15`,
                              boxShadow: `0 0 8px ${occInfo.color}30`
                            }}
                          >
                            <Clock className="w-2.5 h-2.5" />
                            {occInfo.text}
                          </span>
                        )}

                        {/* Reservation Details Badge */}
                        {isReserved && table.reservationTime && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1 text-[#A855F7] bg-[#A855F7]/15 border border-[#A855F7]/40">
                            <Calendar className="w-2.5 h-2.5" />
                            {table.reservationTime}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Details */}
                    <div className="my-2.5 space-y-1">
                      {isCleaning ? (
                        <div className="py-2.5 px-3 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[#F59E0B] font-bold">
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />
                              Higienização Pendente
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F59E0B]/20 font-mono text-[#F59E0B]">
                              Garçons Notificados
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-300 flex items-center justify-between">
                            <span>Mesa desocupada</span>
                            {table.cleaningRequestedAt && (
                              <span className="font-mono text-[10px] text-zinc-400">
                                Desde {new Date(table.cleaningRequestedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : isFree ? (
                        <div className="py-2 px-3 rounded-2xl bg-black/20 border border-[#00D26A]/15 text-xs text-zinc-400 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-[#00D26A] font-medium">
                            <Users className="w-3.5 h-3.5" />
                            {table.seats || 4} Lugares
                          </span>
                          <span className="text-[11px] text-zinc-500 font-mono">Higienizada</span>
                        </div>
                      ) : isReserved ? (
                        <div className="py-2 px-3 rounded-2xl bg-black/30 border border-[#A855F7]/25 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[#E9D5FF] font-medium">
                            <span className="truncate">Cliente: {table.reservationName || 'Reserva Salão'}</span>
                            <span className="font-mono text-[11px] text-[#A855F7]">{table.reservationTime || 'Hoje'}</span>
                          </div>
                          <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                            <Users className="w-3 h-3 text-[#A855F7]" />
                            {table.seats || 4} Lugares reservados
                          </div>
                        </div>
                      ) : (
                        <div className="py-2 px-3 rounded-2xl bg-black/30 border border-white/5 space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-[#D4D4D8]">
                            <span className="flex items-center gap-1 text-[#A1A1AA] truncate">
                              <UserCheck className="w-3 h-3 text-[#FF7A00]" />
                              {table.waiterName || 'Atendente'}
                            </span>
                            {table.openedAt && (
                              <span className="flex items-center gap-1 text-[#71717A] font-mono text-[11px]">
                                Início: {table.openedAt}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between pt-0.5 border-t border-white/5">
                            <span className="text-[11px] text-[#A1A1AA]">Consumo da Mesa:</span>
                            <span className="text-base font-black text-[#00D26A] font-mono">
                              {formatBRL(table.currentTotal || 0)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-2.5 border-t border-[#1E1E2C] flex items-center justify-between gap-2">
                      {isCleaning ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCleanAndFreeTable(table.number);
                            }}
                            className="flex-1 py-2 rounded-xl bg-[#F59E0B]/20 hover:bg-[#F59E0B] text-[#F59E0B] hover:text-black text-xs font-black border border-[#F59E0B]/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                            title="Marcar como higienizada e pronta para novos clientes"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Liberar (Mesa Limpa)</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openQuickEditModal(table);
                            }}
                            className="px-3 py-2 rounded-xl bg-[#1C1C28] hover:bg-[#28283C] text-zinc-300 hover:text-white text-xs font-bold border border-[#2B2B3C] transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3 text-[#00B8FF]" />
                            <span>Editar</span>
                          </button>
                        </>
                      ) : isFree ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenTable(table.number);
                            }}
                            className="flex-1 py-2 rounded-xl bg-[#00D26A]/20 hover:bg-[#00D26A] text-[#00D26A] hover:text-black text-xs font-black border border-[#00D26A]/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Abrir Mesa</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openQuickEditModal(table);
                            }}
                            className="px-3 py-2 rounded-xl bg-[#1C1C28] hover:bg-[#28283C] text-zinc-300 hover:text-white text-xs font-bold border border-[#2B2B3C] transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3 text-[#00B8FF]" />
                            <span>Editar</span>
                          </button>
                        </>
                      ) : isReserved ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenTable(table.number);
                            }}
                            className="flex-1 py-2 rounded-xl bg-[#A855F7]/20 hover:bg-[#A855F7] text-[#A855F7] hover:text-white text-xs font-black border border-[#A855F7]/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Check-in / Ocupar</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCleanAndFreeTable(table.number);
                            }}
                            className="px-3 py-2 rounded-xl bg-[#1C1C28] hover:bg-[#28283C] text-zinc-300 hover:text-white text-xs font-bold border border-[#2B2B3C] transition-all flex items-center gap-1 cursor-pointer"
                          >
                            Liberar
                          </button>
                        </>
                      ) : (
                        <div className="w-full flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTable(table);
                              setIsAddItemsModalOpen(true);
                            }}
                            className="flex-1 py-2 rounded-xl bg-[#1C1C2A] hover:bg-[#28283C] text-white text-[11px] font-bold border border-[#2E2E42] transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3 text-[#FF7A00]" />
                            <span>+ Itens</span>
                          </button>

                          {isBillRequested ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTable(table);
                                setIsPaymentModalOpen(true);
                              }}
                              className="flex-1 py-2 rounded-xl bg-[#00D26A] hover:bg-[#00E575] text-black text-[11px] font-black transition-all text-center shadow-[0_0_12px_rgba(0,210,106,0.4)] cursor-pointer active:scale-95"
                            >
                              Cobrar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRequestBill(table.number);
                              }}
                              className="flex-1 py-2 rounded-xl bg-[#FFC72C]/20 hover:bg-[#FFC72C]/30 text-[#FFC72C] text-[11px] font-bold border border-[#FFC72C]/40 transition-all text-center cursor-pointer"
                            >
                              Pedir Conta
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openQuickEditModal(table);
                            }}
                            className="p-2 rounded-xl bg-[#1C1C28] hover:bg-[#28283C] text-zinc-300 hover:text-white border border-[#2B2B3C] transition-all cursor-pointer"
                            title="Editar nome e lugares da mesa"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-[#00B8FF]" />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* TAB 2: COMANDAS */}
      {activeTab === 'comandas' && (
        <div className="space-y-4">
          {comandas.length === 0 ? (
            <div className="py-16 px-6 rounded-3xl bg-[#12121A] border border-[#242438] text-center space-y-4 max-w-md mx-auto my-8">
              <div className="w-16 h-16 rounded-2xl bg-[#FF7A00]/10 border border-[#FF7A00]/25 flex items-center justify-center mx-auto text-[#FF7A00]">
                <Receipt className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-white">Nenhuma comanda aberta</h3>
                <p className="text-xs text-[#71717A]">
                  Abra comandas para clientes ou vincule a mesas para registrar consumos em tempo real pelos atendentes.
                </p>
              </div>
              <button
                onClick={() => setIsNewComandaModalOpen(true)}
                className="px-5 py-2.5 rounded-2xl bg-[#FF7A00] hover:bg-[#FF8C1A] text-white text-xs font-black transition-all inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-[#FF7A00]/20"
              >
                <Plus className="w-4 h-4" />
                <span>Abrir Primeira Comanda</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {comandas.map(cmd => (
                <div
                  key={cmd.id}
                  className="bg-[#12121A] border border-[#242438] p-5 rounded-3xl shadow-xl flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-[#FF7A00] font-mono bg-[#FF7A00]/15 px-2.5 py-1 rounded-full border border-[#FF7A00]/30">
                        {cmd.code}
                      </span>
                      <span className="text-xs text-[#A1A1AA] flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" /> {cmd.openedAt}
                      </span>
                    </div>

                    <div className="mt-3">
                      <h4 className="text-base font-black text-white">{cmd.customerName}</h4>
                      {cmd.tableNumber && (
                        <div className="text-xs text-[#A1A1AA] mt-0.5">
                          Vinculada à <span className="text-[#FFC72C] font-bold">Mesa {cmd.tableNumber}</span>
                        </div>
                      )}
                    </div>

                    {/* Items list */}
                    <div className="mt-4 space-y-1.5 text-xs">
                      {cmd.items.length === 0 ? (
                        <div className="text-xs text-[#71717A] italic py-2">Nenhum item lançado ainda.</div>
                      ) : (
                        cmd.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-[#D4D4D8]">
                            <span>{it.quantity}x {it.productName}</span>
                            <span className="font-mono text-[#A1A1AA]">{formatBRL(it.totalPrice)}</span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Button to add items */}
                    <button
                      onClick={() => {
                        setSelectedComandaForItems(cmd);
                        setTemporaryItems([]);
                        setItemSearch('');
                      }}
                      className="w-full mt-3 py-2 px-3 rounded-xl bg-[#1A1A26] hover:bg-[#252536] text-[#FFC72C] hover:text-white border border-[#2F2F44] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#FF7A00]" />
                      <span>Adicionar Itens / Pedido</span>
                    </button>
                  </div>

                  <div className="pt-4 border-t border-[#1F1F2E] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-[#A1A1AA] uppercase">Total da Comanda</div>
                      <div className="text-lg font-black text-[#00D26A] font-mono">
                        {formatBRL(cmd.total)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePrintComandaToKitchen(cmd)}
                        className="px-2.5 py-2 rounded-xl bg-[#1C1C2A] hover:bg-[#28283C] text-[#FFC72C] hover:text-white border border-[#323246] transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                        title="Enviar comanda de produção para a cozinha via ESC/POS"
                      >
                        <Printer className="w-3.5 h-3.5 text-[#FFC72C]" />
                        <span>Cozinha</span>
                      </button>

                      <button
                        onClick={() => handleOpenComandaSmartPOS(cmd)}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#DA291C] to-[#FF7A00] text-white text-xs font-black transition-all cursor-pointer shadow-[0_0_10px_rgba(218,41,28,0.3)] flex items-center gap-1.5 active:scale-95"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-[#FFC72C]" />
                        <span>Maquininha (TEF)</span>
                      </button>

                      <button
                        onClick={() => {
                          playCashRegister();
                          setComandas(prev => prev.filter(c => c.id !== cmd.id));
                          createOrder({
                            channel: 'comanda',
                            customerName: cmd.customerName,
                            items: cmd.items,
                            subtotal: cmd.total,
                            total: cmd.total,
                            paymentMethod: 'cash',
                            paymentStatus: 'paid',
                            status: 'completed',
                          });
                        }}
                        className="px-3 py-2 rounded-xl bg-[#222232] hover:bg-[#2C2C40] text-zinc-300 hover:text-white text-xs font-bold border border-[#323246] transition-all cursor-pointer"
                      >
                        Dinheiro
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: TABLE DETAILS & ACTIONS */}
      <AnimatePresence>
        {selectedTable && !isAddItemsModalOpen && !isTransferModalOpen && !isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#14141E] border border-[#2B2B3C] rounded-3xl p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-[#222230] pb-4">
                <div>
                  <span className="text-[10px] font-bold text-[#A1A1AA] uppercase">Detalhes da Ocupação</span>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5 text-[#E31837]" />
                    <span>MESA {selectedTable.number.toString().padStart(2, '0')}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                      selectedTable.status === 'free'
                        ? 'bg-[#00D26A]/20 text-[#00D26A]'
                        : selectedTable.status === 'cleaning'
                        ? 'bg-[#F59E0B]/20 text-[#F59E0B]'
                        : selectedTable.status === 'reserved'
                        ? 'bg-[#A855F7]/20 text-[#A855F7]'
                        : selectedTable.status === 'bill_requested'
                        ? 'bg-[#FFC72C]/20 text-[#FFC72C]'
                        : 'bg-[#E31837]/20 text-[#FF2B4E]'
                    }`}>
                      {selectedTable.status === 'free' && 'Livre'}
                      {selectedTable.status === 'cleaning' && 'Aguardando Limpeza'}
                      {selectedTable.status === 'reserved' && 'Reservada'}
                      {selectedTable.status === 'bill_requested' && 'Pediu Conta'}
                      {selectedTable.status === 'occupied' && 'Ocupada'}
                    </span>
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedTable(null)}
                  className="w-8 h-8 rounded-full bg-[#1F1F2E] hover:bg-[#2A2A3E] text-[#A1A1AA] hover:text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Table Body Information */}
              {selectedTable.status === 'cleaning' ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-14 h-14 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/40 flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">Mesa Aguardando Higienização</h4>
                    <p className="text-xs text-[#A1A1AA] max-w-xs mx-auto">
                      A equipe de garçons e salão foi notificada silenciosamente. Conclua a limpeza para disponibilizar a mesa para novos atendimentos.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      onClick={() => handleCleanAndFreeTable(selectedTable.number)}
                      className="px-6 py-3 rounded-xl bg-[#F59E0B] hover:bg-[#FBBF24] text-black text-xs font-black shadow-[0_0_20px_rgba(245,158,11,0.4)] cursor-pointer flex items-center gap-2 transition-all active:scale-95"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Concluir Limpeza & Liberar Mesa</span>
                    </button>
                  </div>
                </div>
              ) : selectedTable.status !== 'free' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 bg-[#0E0E14] p-3.5 rounded-2xl border border-[#20202E] text-xs">
                    <div>
                      <span className="text-[#71717A]">Atendente:</span>
                      <div className="font-bold text-white mt-0.5">{selectedTable.waiterName || 'Atendente Responsável'}</div>
                    </div>
                    <div>
                      <span className="text-[#71717A]">Horário de Abertura:</span>
                      <div className="font-bold text-white mt-0.5">{selectedTable.openedAt || '19:30'}</div>
                    </div>
                    <div>
                      <span className="text-[#71717A]">Pessoas na Mesa:</span>
                      <div className="font-bold text-white mt-0.5">{selectedTable.customersCount || 2} clientes</div>
                    </div>
                    <div>
                      <span className="text-[#71717A]">Total em Aberto:</span>
                      <div className="font-black text-[#00D26A] font-mono text-sm mt-0.5">
                        {formatBRL(selectedTable.currentTotal)}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="space-y-2.5 pt-2">
                    {/* Primary Action: Direct Smart POS Charge */}
                    <button
                      onClick={() => handleOpenTableSmartPOS(selectedTable.number)}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#DA291C] to-[#FF7A00] hover:brightness-110 text-white text-xs font-black shadow-[0_0_15px_rgba(218,41,28,0.4)] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                    >
                      <CreditCard className="w-4 h-4 text-[#FFC72C]" />
                      <span>Cobrar na Maquininha (Smart POS • TEF)</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() => setIsAddItemsModalOpen(true)}
                        className="py-2.5 rounded-xl bg-[#1C1C2A] hover:bg-[#28283C] text-white text-xs font-bold border border-[#323246] flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-[#FF7A00]" />
                        <span>Lançar Novos Itens</span>
                      </button>

                      <button
                        onClick={() => setIsTransferModalOpen(true)}
                        className="py-2.5 rounded-xl bg-[#1C1C2A] hover:bg-[#28283C] text-white text-xs font-bold border border-[#323246] flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ArrowRightLeft className="w-4 h-4 text-[#00B8FF]" />
                        <span>Transferir Mesa</span>
                      </button>

                      <button
                        onClick={() => handleRequestBill(selectedTable.number)}
                        className="py-2.5 rounded-xl bg-[#FFC72C]/15 hover:bg-[#FFC72C]/25 text-[#FFC72C] text-xs font-bold border border-[#FFC72C]/30 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Imprimir Conferência</span>
                      </button>

                      <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="py-2.5 rounded-xl bg-[#00D26A]/20 hover:bg-[#00D26A]/30 text-[#00D26A] text-xs font-black border border-[#00D26A]/30 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Receipt className="w-4 h-4" />
                        <span>Fechar em Dinheiro</span>
                      </button>

                      <button
                        onClick={() => handlePrintTableToKitchen(selectedTable.number)}
                        className="col-span-2 py-2.5 rounded-xl bg-[#1E1B2A] hover:bg-[#29243A] text-white text-xs font-black border border-[#FFC72C]/40 flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.99]"
                        title="Enviar comanda de produção para a impressora de cozinha via protocolo ESC/POS"
                      >
                        <CookingPot className="w-4 h-4 text-[#FFC72C]" />
                        <span>Enviar / Reenviar para Cozinha (ESC/POS)</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="w-14 h-14 rounded-full bg-[#00D26A]/10 text-[#00D26A] flex items-center justify-center mx-auto">
                    <UtensilsCrossed className="w-7 h-7" />
                  </div>
                  <p className="text-xs text-[#A1A1AA] max-w-xs mx-auto">
                    Esta mesa está atualmente livre e higienizada pronta para receber novos clientes.
                  </p>
                  <button
                    onClick={() => handleOpenTable(selectedTable.number)}
                    className="px-6 py-3 rounded-xl bg-[#00D26A] hover:bg-[#00E575] text-black text-xs font-black shadow-[0_0_20px_rgba(0,210,106,0.4)] cursor-pointer"
                  >
                    ABRIR MESA AGORA
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: ADD ITEMS TO TABLE */}
      <AnimatePresence>
        {isAddItemsModalOpen && selectedTable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#14141E] border border-[#2B2B3C] rounded-3xl p-6 shadow-2xl space-y-4 flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-[#222230] pb-3">
                <div>
                  <span className="text-[10px] text-[#A1A1AA] uppercase font-bold">Lançamento de Pedido</span>
                  <h3 className="text-lg font-black text-white">
                    Adicionar Itens na MESA {selectedTable.number}
                  </h3>
                </div>
                <button
                  onClick={() => setIsAddItemsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#1F1F2E] text-[#A1A1AA] hover:text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search & Category Filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar produto para lançar..."
                    value={itemSearch}
                    onChange={e => setItemSearch(e.target.value)}
                    className="w-full bg-[#181824] border border-[#282838] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-[#52525B] focus:border-[#E31837] focus:outline-none"
                  />
                </div>
              </div>

              {/* Products Grid */}
              <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-[200px]">
                {filteredProducts.slice(0, 10).map(prod => (
                  <div
                    key={prod.id}
                    onClick={() => handleAddItemToTable(prod)}
                    className="p-3 rounded-2xl bg-[#101016] border border-[#20202E] hover:border-[#E31837] transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-black text-white group-hover:text-[#FF2B4E] transition-colors">
                        {prod.name}
                      </div>
                      <div className="text-xs font-bold text-[#00D26A] font-mono mt-0.5">
                        {formatBRL(prod.price)}
                      </div>
                    </div>
                    <button className="w-7 h-7 rounded-lg bg-[#E31837]/15 group-hover:bg-[#E31837] text-[#FF2B4E] group-hover:text-white flex items-center justify-center transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Temporary Items Tray */}
              {temporaryItems.length > 0 && (
                <div className="p-3 bg-[#0E0E14] border border-[#222230] rounded-2xl space-y-2">
                  <div className="text-[11px] font-bold text-[#A1A1AA] uppercase">Itens a Lançar:</div>
                  <div className="max-h-24 overflow-y-auto space-y-1 text-xs">
                    {temporaryItems.map((item, i) => (
                      <div key={i} className="flex justify-between text-white">
                        <span>{item.quantity}x {item.productName}</span>
                        <span className="font-mono text-[#00D26A]">{formatBRL(item.totalPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Confirmation */}
              <div className="pt-3 border-t border-[#222230] flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-[#A1A1AA]">Subtotal dos Itens:</div>
                  <div className="text-lg font-black text-[#00D26A] font-mono">
                    {formatBRL(temporaryItems.reduce((acc, i) => acc + i.totalPrice, 0))}
                  </div>
                </div>

                <button
                  disabled={temporaryItems.length === 0}
                  onClick={handleConfirmAddItems}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#E31837] to-[#FF7A00] text-white text-xs font-black shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  ENVIAR DIRETO PARA COZINHA (KDS)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: TRANSFER TABLE */}
      <AnimatePresence>
        {isTransferModalOpen && selectedTable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#14141E] border border-[#2B2B3C] rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#222230] pb-3">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-[#00B8FF]" />
                  <span>Transferir MESA {selectedTable.number}</span>
                </h3>
                <button
                  onClick={() => setIsTransferModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#1F1F2E] text-[#A1A1AA] hover:text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[#A1A1AA]">
                Selecione a mesa de destino livre para onde os pedidos e consumo acumulados serão movidos.
              </p>

              <div>
                <label className="block text-[11px] font-bold text-[#A1A1AA] uppercase mb-1">Mesa Livre de Destino</label>
                <select
                  value={targetTableNumber}
                  onChange={e => setTargetTableNumber(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-[#181824] border border-[#2B2B3C] rounded-xl px-4 py-2.5 text-xs text-white focus:border-[#00B8FF] focus:outline-none"
                >
                  <option value="">Selecione a mesa livre...</option>
                  {tables.filter(t => t.status === 'free').map(t => (
                    <option key={t.number} value={t.number}>
                      Mesa {t.number} ({t.seats} lugares)
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-[#222230] flex justify-end gap-2">
                <button
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#A1A1AA] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  disabled={targetTableNumber === ''}
                  onClick={handleTransferTable}
                  className="px-5 py-2.5 rounded-xl bg-[#00B8FF] hover:bg-[#22C5FF] text-black text-xs font-black shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  CONFIRMAR TRANSFERÊNCIA
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: SETTLE TABLE BILL & PAYMENT */}
      <AnimatePresence>
        {isPaymentModalOpen && selectedTable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#14141E] border border-[#2B2B3C] rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#222230] pb-3">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#00D26A]" />
                  <span>Fechamento da MESA {selectedTable.number}</span>
                </h3>
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#1F1F2E] text-[#A1A1AA] hover:text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-[#0E0E14] p-4 rounded-2xl border border-[#20202E] space-y-2 text-xs">
                <div className="flex justify-between text-[#A1A1AA]">
                  <span>Consumo da Mesa:</span>
                  <span className="font-mono text-white font-bold">{formatBRL(selectedTable.currentTotal)}</span>
                </div>
                <div className="flex justify-between items-center text-[#A1A1AA]">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeService}
                      onChange={e => setIncludeService(e.target.checked)}
                      className="rounded text-[#00D26A]"
                    />
                    <span>Taxa de Atendimento (10%)</span>
                  </label>
                  <span className="font-mono text-white font-bold">
                    {formatBRL(includeService ? selectedTable.currentTotal * 0.1 : 0)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-black text-[#00D26A] pt-2 border-t border-[#1C1C28]">
                  <span>Total Final:</span>
                  <span className="font-mono">
                    {formatBRL(selectedTable.currentTotal * (includeService ? 1.1 : 1.0))}
                  </span>
                </div>
              </div>

              {/* Dividir conta por pessoas */}
              <div>
                <div className="flex justify-between text-[11px] font-bold text-[#A1A1AA] mb-1">
                  <span>Dividir Conta entre Pessoas:</span>
                  <span className="text-[#FFC72C]">{splitCount} pessoas ({formatBRL((selectedTable.currentTotal * (includeService ? 1.1 : 1.0)) / splitCount)} cada)</span>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSplitCount(n)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        splitCount === n ? 'bg-[#FFC72C] text-black border-[#FFC72C]' : 'bg-[#181824] border-[#2A2A3A] text-white'
                      }`}
                    >
                      {n}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-[11px] font-bold text-[#A1A1AA] uppercase mb-1.5">Forma de Pagamento</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all ${
                      paymentMethod === 'pix' ? 'bg-[#00D26A]/20 border-[#00D26A] text-[#00D26A]' : 'bg-[#181824] border-[#262636] text-[#A1A1AA]'
                    }`}
                  >
                    <QrCode className="w-4 h-4 mx-auto mb-1" />
                    <span>Pix</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credit_card')}
                    className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all ${
                      paymentMethod === 'credit_card' ? 'bg-[#00B8FF]/20 border-[#00B8FF] text-[#00B8FF]' : 'bg-[#181824] border-[#262636] text-[#A1A1AA]'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mx-auto mb-1" />
                    <span>Cartão</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all ${
                      paymentMethod === 'cash' ? 'bg-[#FFC72C]/20 border-[#FFC72C] text-[#FFC72C]' : 'bg-[#181824] border-[#262636] text-[#A1A1AA]'
                    }`}
                  >
                    <Banknote className="w-4 h-4 mx-auto mb-1" />
                    <span>Dinheiro</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-[#222230]">
                <button
                  onClick={handleSettleTable}
                  className="w-full py-3.5 rounded-xl bg-[#00D26A] hover:bg-[#00E575] text-black font-black text-xs shadow-[0_0_20px_rgba(0,210,106,0.4)] cursor-pointer"
                >
                  CONFIRMAR PAGAMENTO & LIBERAR MESA
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: NEW COMANDA */}
      <AnimatePresence>
        {isNewComandaModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#14141E] border border-[#2B2B3C] rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#222230] pb-3">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#FF7A00]" />
                  <span>Abrir Nova Comanda Individual</span>
                </h3>
                <button
                  onClick={() => setIsNewComandaModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#1F1F2E] text-[#A1A1AA] hover:text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateComanda} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#A1A1AA] uppercase mb-1">Nome do Cliente</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo"
                    value={newComandaName}
                    onChange={e => setNewComandaName(e.target.value)}
                    className="w-full bg-[#181824] border border-[#282838] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#52525B] focus:border-[#FF7A00] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#A1A1AA] uppercase mb-1">Vincular a uma Mesa (Opcional)</label>
                  <select
                    value={newComandaTable}
                    onChange={e => setNewComandaTable(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-[#181824] border border-[#282838] rounded-xl px-4 py-2.5 text-xs text-white focus:border-[#FF7A00] focus:outline-none"
                  >
                    <option value="">Nenhuma (Comanda de Balcão / Bar)</option>
                    {tables.map(t => (
                      <option key={t.number} value={t.number}>
                        Mesa {t.number} ({t.status === 'free' ? 'Livre' : 'Ocupada'})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#FF7A00] hover:bg-[#FF8C1A] text-white font-black text-xs shadow-lg transition-all cursor-pointer"
                >
                  CRIAR COMANDA
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD ITEMS TO COMANDA */}
      <AnimatePresence>
        {selectedComandaForItems && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-[#14141E] border border-[#2B2B3C] rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-[#222230] pb-3">
                <div>
                  <span className="text-[10px] text-[#FF7A00] uppercase font-bold">Lançamento de Pedido</span>
                  <h3 className="text-lg font-black text-white">
                    Adicionar Itens na Comanda {selectedComandaForItems.code} ({selectedComandaForItems.customerName})
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setSelectedComandaForItems(null);
                    setTemporaryItems([]);
                  }}
                  className="w-8 h-8 rounded-full bg-[#1F1F2E] text-[#A1A1AA] hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar produto para lançar..."
                    value={itemSearch}
                    onChange={e => setItemSearch(e.target.value)}
                    className="w-full bg-[#181824] border border-[#282838] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-[#52525B] focus:border-[#FF7A00] focus:outline-none"
                  />
                </div>
              </div>

              {/* Products Grid */}
              <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-[200px]">
                {filteredProducts.slice(0, 10).map(prod => (
                  <div
                    key={prod.id}
                    onClick={() => handleAddItemToTable(prod)}
                    className="p-3 rounded-2xl bg-[#101016] border border-[#20202E] hover:border-[#FF7A00] transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-black text-white group-hover:text-[#FF7A00] transition-colors">
                        {prod.name}
                      </div>
                      <div className="text-xs font-bold text-[#00D26A] font-mono mt-0.5">
                        {formatBRL(prod.price)}
                      </div>
                    </div>
                    <button className="w-7 h-7 rounded-lg bg-[#FF7A00]/15 group-hover:bg-[#FF7A00] text-[#FF7A00] group-hover:text-white flex items-center justify-center transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Temporary Items Tray */}
              {temporaryItems.length > 0 && (
                <div className="p-3 bg-[#0E0E14] border border-[#222230] rounded-2xl space-y-2">
                  <div className="text-[11px] font-bold text-[#A1A1AA] uppercase">Itens a Lançar:</div>
                  <div className="max-h-24 overflow-y-auto space-y-1 text-xs">
                    {temporaryItems.map((item, i) => (
                      <div key={i} className="flex justify-between text-white">
                        <span>{item.quantity}x {item.productName}</span>
                        <span className="font-mono text-[#00D26A]">{formatBRL(item.totalPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Confirmation */}
              <div className="pt-3 border-t border-[#222230] flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-[#A1A1AA]">Subtotal dos Itens:</div>
                  <div className="text-lg font-black text-[#00D26A] font-mono">
                    {formatBRL(temporaryItems.reduce((acc, i) => acc + i.totalPrice, 0))}
                  </div>
                </div>

                <button
                  disabled={temporaryItems.length === 0}
                  onClick={handleConfirmAddItemsToComanda}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#E31837] text-white text-xs font-black shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  ENVIAR DIRETO PARA COZINHA (KDS)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: SMART POS & TEF MAQUININHA DE CARTÃO E PIX */}
      <SmartPOSPaymentModal
        isOpen={isPOSModalOpen}
        onClose={() => {
          setIsPOSModalOpen(false);
          setPosModalTarget(null);
        }}
        target={posModalTarget}
        onPaymentApproved={handlePOSPaymentApproved}
      />

      {/* MODAL 6: CONFIGURAÇÃO DE IMPRESSORAS TÉRMICAS ESC/POS */}
      <ThermalPrinterSettingsModal
        isOpen={isPrinterSettingsOpen}
        onClose={() => setIsPrinterSettingsOpen(false)}
      />

      {/* FLOATING TOAST: ESC/POS KITCHEN DISPATCH */}
      <AnimatePresence>
        {kitchenPrintToast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm bg-[#161628] border-2 border-[#FFC72C] rounded-3xl p-4 shadow-[0_10px_35px_rgba(0,0,0,0.8)] text-white space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-xs text-[#FFC72C]">
                <CookingPot className="w-4 h-4 text-[#FFC72C]" />
                <span>Comanda Despachada para Cozinha!</span>
              </div>
              <button
                onClick={() => setKitchenPrintToast(null)}
                className="text-zinc-400 hover:text-white text-xs px-2 py-1"
              >
                ✕
              </button>
            </div>
            <div className="text-xs text-zinc-300">
              <p>{kitchenPrintToast.message}</p>
              <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                Destino: {kitchenPrintToast.printerName} • ESC/POS Ativo
              </p>
            </div>
            {kitchenPrintToast.hexPreview && (
              <details className="text-[10px] text-zinc-400 bg-black/40 p-2 rounded-xl border border-zinc-800 font-mono">
                <summary className="cursor-pointer text-[#FFC72C] font-bold">Hex Dump ESC/POS</summary>
                <div className="mt-1 break-all select-all text-zinc-400">{kitchenPrintToast.hexPreview}</div>
              </details>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* MODAL 7: EDIÇÃO RÁPIDA DE MESA (Renomear, Lugares, Setor e Status) */}
      <AnimatePresence>
        {isQuickEditModalOpen && quickEditTable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-[#14141E] border border-[#2B2B3C] rounded-3xl p-6 shadow-2xl space-y-5 my-8 text-white relative"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-[#222230] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#00B8FF]/15 border border-[#00B8FF]/40 flex items-center justify-center text-[#00B8FF] shadow-[0_0_15px_rgba(0,184,255,0.2)]">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#00B8FF] uppercase font-bold tracking-wider">Edição Rápida</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 font-mono">
                        Mesa {quickEditTable.number.toString().padStart(2, '0')}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-white">
                      {quickEditTable.name || quickEditTable.label || `Mesa ${quickEditTable.number}`}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsQuickEditModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#1F1F2E] text-[#A1A1AA] hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveQuickEdit} className="space-y-4">
                {quickEditError && (
                  <div className="p-3 rounded-xl bg-[#FF2B4E]/15 border border-[#FF2B4E]/40 text-[#FF4D6D] text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{quickEditError}</span>
                  </div>
                )}

                {/* Status Selector Tabs */}
                <div>
                  <label className="block text-[11px] font-bold text-[#A1A1AA] uppercase mb-1.5">
                    Status da Mesa
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { id: 'free', label: 'Livre', color: '#00D26A' },
                      { id: 'occupied', label: 'Ocupada', color: '#FF2B4E' },
                      { id: 'bill_requested', label: 'Pediu Conta', color: '#FFC72C' },
                      { id: 'reserved', label: 'Reservada', color: '#A855F7' },
                      { id: 'cleaning', label: 'Aguardando Limpeza', color: '#F59E0B' },
                    ].map(st => {
                      const isSelected = editTableStatus === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setEditTableStatus(st.id as any)}
                          className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-white/10 text-white shadow-md'
                              : 'bg-[#101016] text-zinc-400 border-[#222232] hover:border-white/20'
                          }`}
                          style={{
                            borderColor: isSelected ? st.color : undefined,
                            boxShadow: isSelected ? `0 0 10px ${st.color}40` : undefined,
                          }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: st.color }} />
                          <span className="truncate">{st.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Box de Notificação Silenciosa para Garçons ao Aguardar Limpeza */}
                {editTableStatus === 'cleaning' && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#F59E0B]">
                        <Sparkles className="w-4 h-4 text-[#F59E0B]" />
                        <span>Status: Aguardando Limpeza & Higienização</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-mono font-bold">
                        Status Amarelado
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      A mesa ficará destacada com status amarelado visual na grid e mapa de mesas, informando que está desocupada e aguarda limpeza para receber novos clientes.
                    </p>

                    <label className="flex items-start gap-2.5 pt-2 border-t border-[#F59E0B]/20 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={sendSilentWaiterNotifOnCleaning}
                        onChange={(e) => setSendSilentWaiterNotifOnCleaning(e.target.checked)}
                        className="mt-0.5 rounded border-[#F59E0B]/50 text-[#F59E0B] focus:ring-[#F59E0B] bg-[#121118]"
                      />
                      <div className="text-xs">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-[#F59E0B]" />
                          Enviar notificação silenciosa para a equipe de garçons
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          Dispara alerta silencioso nos dispositivos dos garçons/atendentes e na central de avisos sem alarmes sonoros estridentes.
                        </div>
                      </div>
                    </label>
                  </motion.div>
                )}

                {/* Table Name and Number */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-[#A1A1AA] uppercase mb-1">
                      Nome / Apelido da Mesa
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Mesa VIP, Varanda 02, Deck Vista..."
                      value={editTableName}
                      onChange={(e) => setEditTableName(e.target.value)}
                      className="w-full bg-[#101018] border border-[#2B2B3C] focus:border-[#00B8FF] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                    />
                    <span className="text-[10px] text-zinc-500 mt-1 block">
                      Nome descritivo exibido nos cards e no salão.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#A1A1AA] uppercase mb-1">
                      Número
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={editTableNumber}
                      onChange={(e) => setEditTableNumber(Number(e.target.value))}
                      className="w-full bg-[#101018] border border-[#2B2B3C] focus:border-[#00B8FF] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-white focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Capacity Adjuster (Seats) */}
                <div className="p-3.5 rounded-2xl bg-[#0E0E16] border border-[#222232] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-[#A1A1AA] uppercase flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#00B8FF]" />
                      <span>Capacidade de Lugares (Assentos)</span>
                    </label>
                    <span className="text-xs font-mono font-black text-[#00D26A]">
                      {editTableSeats} {editTableSeats === 1 ? 'lugar' : 'lugares'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEditTableSeats(prev => Math.max(1, prev - 1))}
                      className="w-10 h-10 rounded-xl bg-[#1C1C28] hover:bg-[#28283C] text-white border border-[#2B2B3C] flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                      title="Diminuir 1 lugar"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <div className="flex-1 bg-[#101018] border border-[#2B2B3C] rounded-xl py-2 px-3 flex items-center justify-center">
                      <span className="text-xl font-black font-mono text-white">
                        {editTableSeats}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditTableSeats(prev => Math.min(30, prev + 1))}
                      className="w-10 h-10 rounded-xl bg-[#1C1C28] hover:bg-[#28283C] text-white border border-[#2B2B3C] flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                      title="Aumentar 1 lugar"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Preset quick pills */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase mr-1">Rápido:</span>
                    {[2, 4, 6, 8, 10, 12].map(seatCount => (
                      <button
                        key={seatCount}
                        type="button"
                        onClick={() => setEditTableSeats(seatCount)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                          editTableSeats === seatCount
                            ? 'bg-[#00B8FF] text-black shadow-sm font-black'
                            : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                        }`}
                      >
                        {seatCount}L
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sector / Zone Selection */}
                <div>
                  <label className="block text-[11px] font-bold text-[#A1A1AA] uppercase mb-1.5">
                    Setor do Salão
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'salao_principal', label: 'Salão Principal' },
                      { id: 'varanda', label: 'Varanda / Deck' },
                      { id: 'bar_lounge', label: 'Bar & Balcão' },
                      { id: 'mezanino', label: 'Mezanino' },
                    ].map(zone => (
                      <button
                        key={zone.id}
                        type="button"
                        onClick={() => setEditTableZone(zone.id as any)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                          editTableZone === zone.id
                            ? 'bg-[#00B8FF]/15 border-[#00B8FF] text-white shadow-sm'
                            : 'bg-[#101016] border-[#222230] text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <span>{zone.label}</span>
                        {editTableZone === zone.id && <Check className="w-3.5 h-3.5 text-[#00B8FF]" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reservation Details if Reserved */}
                {editTableStatus === 'reserved' && (
                  <div className="p-3.5 rounded-2xl bg-[#1B1226] border border-[#A855F7]/30 space-y-2.5">
                    <div className="text-xs font-black text-[#E9D5FF] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#A855F7]" />
                      <span>Detalhes da Reserva</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                          Nome do Cliente
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Família Silva"
                          value={editReservationName}
                          onChange={(e) => setEditReservationName(e.target.value)}
                          className="w-full bg-[#120C1C] border border-[#A855F7]/40 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#A855F7]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                          Horário da Reserva
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: 20:30"
                          value={editReservationTime}
                          onChange={(e) => setEditReservationTime(e.target.value)}
                          className="w-full bg-[#120C1C] border border-[#A855F7]/40 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#A855F7]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Active consumption box if table is occupied */}
                {(quickEditTable.status === 'occupied' || quickEditTable.status === 'bill_requested') && (
                  <div className="p-3 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-zinc-400 uppercase font-bold">Consumo Atual Aberto</div>
                      <div className="text-sm font-black text-[#00D26A] font-mono">
                        {formatBRL(quickEditTable.currentTotal || 0)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickEditModalOpen(false);
                        setSelectedTable(quickEditTable);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#1C1C28] hover:bg-[#28283C] text-xs font-bold text-zinc-200 hover:text-white border border-[#2E2E42] transition-colors"
                    >
                      Ver Detalhes da Comanda →
                    </button>
                  </div>
                )}

                {/* Modal Footer Actions */}
                <div className="pt-3 border-t border-[#222230] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickEditModalOpen(false);
                        promptRemoveTable(quickEditTable);
                      }}
                      className="px-3 py-2.5 rounded-xl bg-[#FF2B4E]/10 hover:bg-[#FF2B4E] text-[#FF4D6D] hover:text-white text-xs font-bold border border-[#FF2B4E]/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickEditModalOpen(false);
                        openTableQrCodeModal(quickEditTable);
                      }}
                      className="px-3 py-2.5 rounded-xl bg-[#FFC72C]/10 hover:bg-[#FFC72C] text-[#FFC72C] hover:text-black text-xs font-bold border border-[#FFC72C]/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      title="Gerar e imprimir QR Code desta mesa"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>QR Code</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsQuickEditModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00B8FF] to-[#0080FF] hover:from-[#22C5FF] hover:to-[#0090FF] text-black text-xs font-black shadow-[0_0_15px_rgba(0,184,255,0.3)] transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                    >
                      <Check className="w-4 h-4" />
                      <span>Salvar Alterações</span>
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 8: ADICIONAR NOVA MESA CUSTOMIZADA */}
      <AnimatePresence>
        {isNewTableModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#14141E] border border-[#2B2B3C] rounded-3xl p-6 shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center justify-between border-b border-[#222230] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#00D26A]/15 border border-[#00D26A]/30 flex items-center justify-center text-[#00D26A]">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Cadastrar Nova Mesa</h3>
                    <p className="text-[11px] text-zinc-400">Adicione uma nova mesa ao salão do restaurante</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewTableModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#1F1F2E] text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateCustomTable} className="space-y-4">
                {newTableError && (
                  <div className="p-3 rounded-xl bg-[#FF2B4E]/15 border border-[#FF2B4E]/40 text-[#FF4D6D] text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{newTableError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                      Número da Mesa
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={newTableNumber}
                      onChange={(e) => setNewTableNumber(Number(e.target.value))}
                      className="w-full bg-[#101018] border border-[#2B2B3C] rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-[#00D26A]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                      Capacidade (Lugares)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={newTableSeats}
                      onChange={(e) => setNewTableSeats(Number(e.target.value))}
                      className="w-full bg-[#101018] border border-[#2B2B3C] rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-[#00D26A]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                    Setor do Salão
                  </label>
                  <select
                    value={newTableZone}
                    onChange={(e) => setNewTableZone(e.target.value as any)}
                    className="w-full bg-[#101018] border border-[#2B2B3C] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#00D26A]"
                  >
                    <option value="salao_principal">Salão Principal</option>
                    <option value="varanda">Varanda / Deck Externo</option>
                    <option value="bar_lounge">Bar & Balcão Lounge</option>
                    <option value="mezanino">Mezanino Superior</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                    Formato da Mesa
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'square', label: 'Quadrada' },
                      { id: 'round', label: 'Redonda' },
                      { id: 'rectangle', label: 'Retangular' },
                    ].map(shape => (
                      <button
                        key={shape.id}
                        type="button"
                        onClick={() => setNewTableShape(shape.id as any)}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          newTableShape === shape.id
                            ? 'bg-[#00D26A]/20 border-[#00D26A] text-[#00D26A]'
                            : 'bg-[#101018] border-[#2B2B3C] text-zinc-400 hover:text-white'
                        }`}
                      >
                        {shape.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#222230] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewTableModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs text-zinc-400 hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#00D26A] hover:bg-[#00E575] text-black text-xs font-black shadow-[0_0_15px_rgba(0,210,106,0.3)] transition-all cursor-pointer"
                  >
                    Adicionar ao Salão
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 9: CONFIRMAÇÃO DE REMOÇÃO DE MESA */}
      <AnimatePresence>
        {tablePendingRemoval && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#14141E] border border-[#FF2B4E]/50 rounded-3xl p-6 shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FF2B4E]/15 border border-[#FF2B4E]/40 flex items-center justify-center text-[#FF2B4E] shadow-[0_0_15px_rgba(255,43,78,0.3)]">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Remover Mesa do Salão</h3>
                  <p className="text-xs text-zinc-400">
                    Você está prestes a excluir a Mesa {tablePendingRemoval.number}
                  </p>
                </div>
              </div>

              {isForceRemove ? (
                <div className="p-3.5 rounded-2xl bg-[#FF2B4E]/15 border border-[#FF2B4E]/40 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-[#FF4D6D]">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>ATENÇÃO: MESA COM ATIVIDADE!</span>
                  </div>
                  <p className="text-xs text-zinc-300">
                    Esta mesa está com status <strong>{tablePendingRemoval.status === 'occupied' ? 'OCUPADA' : 'PEDIU CONTA'}</strong> e consumo ativo de <strong>{formatBRL(tablePendingRemoval.currentTotal || 0)}</strong>.
                  </p>
                  <p className="text-[11px] text-[#FF9EAF]">
                    Ao remover, os pedidos pendentes associados serão excluídos ou desvinculados do salão.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-300">
                  Tem certeza que deseja remover a <strong>Mesa {tablePendingRemoval.number}</strong> ({tablePendingRemoval.seats} lugares) do salão? Esta ação reorganizará o mapa de mesas.
                </p>
              )}

              <div className="pt-3 border-t border-[#222230] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTablePendingRemoval(null)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmRemoveTable(tablePendingRemoval.number)}
                  className="px-5 py-2.5 rounded-xl bg-[#FF2B4E] hover:bg-[#FF4D6D] text-white text-xs font-black shadow-[0_0_15px_rgba(255,43,78,0.4)] transition-all cursor-pointer"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATING TABLE ACTIONS TOAST */}
      <AnimatePresence>
        {tableToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 left-6 z-50 max-w-sm rounded-2xl p-4 shadow-2xl text-white border flex items-center gap-3 ${
              tableToast.type === 'success'
                ? 'bg-[#101E16] border-[#00D26A] shadow-[0_0_25px_rgba(0,210,106,0.3)]'
                : tableToast.type === 'warning'
                ? 'bg-[#221B0E] border-[#FFC72C] shadow-[0_0_25px_rgba(255,199,44,0.3)]'
                : 'bg-[#121926] border-[#00B8FF] shadow-[0_0_25px_rgba(0,184,255,0.3)]'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              tableToast.type === 'success'
                ? 'bg-[#00D26A]/20 text-[#00D26A]'
                : tableToast.type === 'warning'
                ? 'bg-[#FFC72C]/20 text-[#FFC72C]'
                : 'bg-[#00B8FF]/20 text-[#00B8FF]'
            }`}>
              {tableToast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            </div>
            <div className="text-xs font-bold flex-1">{tableToast.message}</div>
            <button
              onClick={() => setTableToast(null)}
              className="text-zinc-400 hover:text-white text-xs px-1 cursor-pointer"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 11: GERADOR DE QR CODE DINÂMICO PARA MESAS */}
      <TableQrCodeModal
        isOpen={isQrCodeModalOpen}
        onClose={() => setIsQrCodeModalOpen(false)}
        table={selectedTableForQr}
        allTables={tables}
        onSelectTable={(table) => setSelectedTableForQr(table)}
      />
    </div>
  );
};
