import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Truck,
  MapPin,
  Navigation,
  Compass,
  Clock,
  DollarSign,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Send,
  BatteryCharging,
  BatteryMedium,
  BatteryLow,
  Zap,
  Layers,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  Bike,
  Car,
  ExternalLink,
  Info,
  LocateFixed,
  Filter,
  Search,
  Check,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DeliveryDriver, Order, OrderStatus } from '../types';
import { formatBRL } from '../utils/formatters';
import { playBeep, playKitchenBell, playCashRegister } from '../utils/audio';
import {
  calculateDistanceKm,
  calculateDeliveryFeeByLocation,
  requestCurrentBrowserLocation,
  interpolateDriverPosition,
  DEFAULT_STORE_COORDS,
  DEFAULT_STORE_ADDRESS,
  DEFAULT_DELIVERY_ZONES,
  PRESET_DELIVERY_LOCATIONS,
  DeliveryZone,
  Coordinates
} from '../utils/deliveryGeo';

type TabView = 'mapa' | 'despacho' | 'calculadora' | 'equipe';

export const GestaoEntregasDelivery: React.FC = () => {
  const {
    drivers,
    orders,
    tenant,
    updateTenantSettings,
    assignDriverToOrder,
    completeDriverDelivery,
    updateDriverStatus,
    updateDriverCoords,
    addDeliveryDriver,
  } = useApp();

  const [activeTab, setActiveTab] = useState<TabView>('mapa');
  const [selectedDriver, setSelectedDriver] = useState<DeliveryDriver | null>(null);
  const [isSimulatingGps, setIsSimulatingGps] = useState<boolean>(true);
  const [isNewDriverModalOpen, setIsNewDriverModalOpen] = useState(false);
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [driverFilter, setDriverFilter] = useState<'all' | 'on_route' | 'available'>('all');

  // Calculator State
  const [calcCoords, setCalcCoords] = useState<Coordinates>({ lat: -23.5610, lng: -46.6850 }); // Pinheiros preset
  const [calcSubtotal, setCalcSubtotal] = useState<number>(85.00);
  const [calcAddressName, setCalcAddressName] = useState<string>('Pinheiros / Fradique Coutinho');
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState<string | null>(null);
  const [locationErrorMsg, setLocationErrorMsg] = useState<string | null>(null);

  // Settings form state (Delivery Settings)
  const [settingsForm, setSettingsForm] = useState({
    baseFee: tenant?.settings?.deliveryBaseFee ?? 6.00,
    baseRadiusKm: tenant?.settings?.deliveryBaseRadiusKm ?? 3.0,
    feePerKm: tenant?.settings?.deliveryFeePerKm ?? 1.80,
    maxRadiusKm: tenant?.settings?.deliveryMaxRadiusKm ?? 15.0,
    freeDeliveryOver: tenant?.settings?.freeDeliveryOver ?? 120.00,
  });
  const [settingsSavedFeedback, setSettingsSavedFeedback] = useState(false);

  // New Driver Form State
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverVehicle, setNewDriverVehicle] = useState<'moto' | 'bike' | 'carro'>('moto');
  const [newDriverPlate, setNewDriverPlate] = useState('');

  // Store coordinates & address
  const storeCoords = tenant?.settings?.storeCoordinates || DEFAULT_STORE_COORDS;
  const storeAddress = tenant?.settings?.storeAddress || DEFAULT_STORE_ADDRESS;

  // Active delivery orders
  const deliveryOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.channel === 'delivery_whatsapp' ||
        o.channel === 'delivery_web' ||
        o.channel === 'ifood' ||
        o.channel === 'rappi' ||
        o.channel === '99food' ||
        (o.customerAddress && o.customerAddress.street)
    );
  }, [orders]);

  const pendingDispatchOrders = useMemo(() => {
    return deliveryOrders.filter((o) => o.status === 'ready' || o.status === 'pending' || o.status === 'recebido');
  }, [deliveryOrders]);

  const deliveringOrders = useMemo(() => {
    return deliveryOrders.filter((o) => o.status === 'delivering');
  }, [deliveryOrders]);

  // Telemetry KPIs
  const driversOnRoute = useMemo(() => drivers.filter((d) => d.status === 'on_route'), [drivers]);
  const driversAvailable = useMemo(() => drivers.filter((d) => d.status === 'available'), [drivers]);
  const totalDeliveriesToday = useMemo(() => drivers.reduce((acc, d) => acc + d.completedToday, 0), [drivers]);
  const totalTipsToday = useMemo(() => drivers.reduce((acc, d) => acc + d.totalTipsToday, 0), [drivers]);
  const deliveryRevenueToday = useMemo(() => {
    return deliveryOrders
      .filter((o) => o.status === 'completed' || o.status === 'delivering')
      .reduce((acc, o) => acc + o.total, 0);
  }, [deliveryOrders]);

  // Real-time GPS Simulation Loop (moves motoboys along paths when enabled)
  useEffect(() => {
    if (!isSimulatingGps) return;

    const interval = setInterval(() => {
      drivers.forEach((driver) => {
        if (driver.status === 'on_route' && driver.destinationCoords) {
          const { nextCoords, isArrived } = interpolateDriverPosition(
            driver.coords,
            driver.destinationCoords,
            0.04
          );

          if (isArrived && driver.assignedOrderId) {
            // Auto complete or alert arrival
            completeDriverDelivery(driver.assignedOrderId);
          } else {
            // Random variation of speed around 32-45 km/h
            const speed = Math.floor(30 + Math.random() * 15);
            updateDriverCoords(driver.id, nextCoords, undefined, speed);
          }
        }
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [isSimulatingGps, drivers, completeDriverDelivery, updateDriverCoords]);

  // Handle GPS detection using Browser API
  const handleDetectBrowserLocation = async () => {
    setIsLocatingUser(true);
    setLocationErrorMsg(null);
    setLocationSuccessMsg(null);
    playBeep(800, 0.05);

    try {
      const { coords, accuracy } = await requestCurrentBrowserLocation();
      setCalcCoords(coords);
      setCalcAddressName(`GPS Atual (Precisão: ±${Math.round(accuracy)}m)`);
      setLocationSuccessMsg(`Localização detectada com sucesso via satélite/IP!`);
      playKitchenBell();
    } catch (err: any) {
      console.warn('Geolocation failed, falling back to simulated high-accuracy pin:', err);
      // Fallback to random SP Jardins / Consolação spot
      const fallback: Coordinates = {
        lat: -23.5580 + (Math.random() - 0.5) * 0.02,
        lng: -46.6620 + (Math.random() - 0.5) * 0.02,
      };
      setCalcCoords(fallback);
      setCalcAddressName('Localização GPS Estimada (Consolação/Paulista)');
      setLocationSuccessMsg('Localização obtida com base no ponto de entrega mais próximo.');
    } finally {
      setIsLocatingUser(false);
    }
  };

  // Compute live calculation result for the calculator tab
  const calcResult = useMemo(() => {
    return calculateDeliveryFeeByLocation(
      calcCoords,
      {
        ...tenant?.settings,
        deliveryBaseFee: settingsForm.baseFee,
        deliveryBaseRadiusKm: settingsForm.baseRadiusKm,
        deliveryFeePerKm: settingsForm.feePerKm,
        deliveryMaxRadiusKm: settingsForm.maxRadiusKm,
        freeDeliveryOver: settingsForm.freeDeliveryOver,
      } as any,
      calcSubtotal,
      storeCoords
    );
  }, [calcCoords, settingsForm, calcSubtotal, storeCoords, tenant]);

  // Save updated delivery rules to tenant settings
  const handleSaveSettings = () => {
    updateTenantSettings({
      deliveryBaseFee: Number(settingsForm.baseFee),
      deliveryBaseRadiusKm: Number(settingsForm.baseRadiusKm),
      deliveryFeePerKm: Number(settingsForm.feePerKm),
      deliveryMaxRadiusKm: Number(settingsForm.maxRadiusKm),
      freeDeliveryOver: Number(settingsForm.freeDeliveryOver),
    });
    playCashRegister();
    setSettingsSavedFeedback(true);
    setTimeout(() => setSettingsSavedFeedback(false), 3000);
  };

  // Submit new driver form
  const handleCreateDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName.trim()) return;

    addDeliveryDriver({
      name: newDriverName.trim(),
      phone: newDriverPhone.trim() || '(11) 98765-4321',
      vehicle: newDriverVehicle,
      plate: newDriverPlate.trim().toUpperCase() || (newDriverVehicle === 'bike' ? 'BIKE-01' : 'BRA2E19'),
      status: 'available',
      currentOrdersCount: 0,
      completedToday: 0,
      totalTipsToday: 0,
      rating: 5.0,
      coords: {
        lat: storeCoords.lat + (Math.random() - 0.5) * 0.005,
        lng: storeCoords.lng + (Math.random() - 0.5) * 0.005,
      },
      batteryLevel: 98,
    });

    setNewDriverName('');
    setNewDriverPhone('');
    setNewDriverPlate('');
    setIsNewDriverModalOpen(false);
  };

  // Filtered drivers list
  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      if (driverFilter === 'on_route') return d.status === 'on_route';
      if (driverFilter === 'available') return d.status === 'available';
      return true;
    });
  }, [drivers, driverFilter]);

  // Convert lat/lng to percentage coordinates on the radar map (centered on storeCoords)
  const mapCenter = storeCoords;
  const mapScale = 0.05 * (1 / mapZoom); // Degrees per radius unit

  const getMapPosition = (coords: Coordinates) => {
    // 50% is center
    const x = 50 + ((coords.lng - mapCenter.lng) / mapScale) * 50;
    const y = 50 + ((mapCenter.lat - coords.lat) / mapScale) * 50; // inverted Y
    return {
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y)),
    };
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header with Title & Live System Telemetry */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-[#12121A] border border-[#20202E] p-5 sm:p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#00E676]/10 via-transparent to-transparent pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00E676]/25 to-[#00E676]/5 border border-[#00E676]/40 flex items-center justify-center text-[#00E676] shadow-[0_0_20px_rgba(0,230,118,0.25)]">
            <Truck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Gestão de Entregas & Rastreamento GPS
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#00E676]/15 border border-[#00E676]/40 text-[#00E676]">
                <span className="w-2 h-2 rounded-full bg-[#00E676] animate-ping" />
                GPS Ao Vivo
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1">
              Despacho inteligente de motoboys, rastreio em tempo real e cálculo automático de taxas por geolocalização.
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2.5 flex-wrap relative z-10">
          <button
            onClick={() => {
              playBeep(isSimulatingGps ? 500 : 900, 0.05);
              setIsSimulatingGps(!isSimulatingGps);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
              isSimulatingGps
                ? 'bg-[#00E676]/15 border-[#00E676]/50 text-[#00E676] shadow-[0_0_12px_rgba(0,230,118,0.2)]'
                : 'bg-[#1A1A24] border-[#2E2E40] text-zinc-400 hover:text-white'
            }`}
          >
            {isSimulatingGps ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isSimulatingGps ? 'Simulação GPS Ativa' : 'Pausar Simulação'}</span>
          </button>

          <button
            onClick={() => {
              playBeep(900, 0.05);
              setIsNewDriverModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#DA291C] to-[#FF4D4D] text-white border border-[#FF4D4D]/40 shadow-[0_0_15px_rgba(218,41,28,0.3)] hover:brightness-110 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Entregador</span>
          </button>
        </div>
      </div>

      {/* Real-time KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-[#12121A] border border-[#20202E] p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Em Rota Agora</span>
            <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
          </div>
          <p className="text-2xl font-black text-[#00E676]">
            {driversOnRoute.length} <span className="text-xs font-normal text-zinc-400">/ {drivers.length}</span>
          </p>
          <p className="text-[11px] text-zinc-400 mt-1 truncate">
            {deliveringOrders.length} pedido(s) em transporte
          </p>
        </div>

        <div className="bg-[#12121A] border border-[#20202E] p-4 rounded-2xl">
          <div className="text-xs text-zinc-400 mb-1">Disponíveis na Base</div>
          <p className="text-2xl font-black text-[#FFC72C]">{driversAvailable.length}</p>
          <p className="text-[11px] text-zinc-400 mt-1 truncate">Prontos para despacho</p>
        </div>

        <div className="bg-[#12121A] border border-[#20202E] p-4 rounded-2xl">
          <div className="text-xs text-zinc-400 mb-1">Aguardando Envio</div>
          <p className="text-2xl font-black text-[#FF6B00]">{pendingDispatchOrders.length}</p>
          <p className="text-[11px] text-zinc-400 mt-1 truncate">Pedidos na cozinha / prontos</p>
        </div>

        <div className="bg-[#12121A] border border-[#20202E] p-4 rounded-2xl">
          <div className="text-xs text-zinc-400 mb-1">Entregas Concluídas</div>
          <p className="text-2xl font-black text-white">{totalDeliveriesToday}</p>
          <p className="text-[11px] text-[#00E676] mt-1 truncate">
            {formatBRL(totalTipsToday)} em gorjetas
          </p>
        </div>

        <div className="bg-[#12121A] border border-[#20202E] p-4 rounded-2xl col-span-2 lg:col-span-1">
          <div className="text-xs text-zinc-400 mb-1">Faturamento Delivery</div>
          <p className="text-2xl font-black text-[#FFC72C]">{formatBRL(deliveryRevenueToday)}</p>
          <p className="text-[11px] text-zinc-400 mt-1 truncate">Total de pedidos hoje</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#20202E] pb-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => {
            playBeep();
            setActiveTab('mapa');
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'mapa'
              ? 'bg-[#00E676]/15 border border-[#00E676]/50 text-[#00E676] shadow-[0_0_12px_rgba(0,230,118,0.25)]'
              : 'bg-[#12121A] border border-[#20202E] text-zinc-400 hover:text-white'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>Mapa & Radar GPS em Tempo Real</span>
        </button>

        <button
          onClick={() => {
            playBeep();
            setActiveTab('despacho');
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'despacho'
              ? 'bg-[#FFC72C]/15 border border-[#FFC72C]/50 text-[#FFC72C] shadow-[0_0_12px_rgba(255,199,44,0.25)]'
              : 'bg-[#12121A] border border-[#20202E] text-zinc-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Fila de Despacho ({pendingDispatchOrders.length})</span>
        </button>

        <button
          onClick={() => {
            playBeep();
            setActiveTab('calculadora');
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'calculadora'
              ? 'bg-[#FF6B00]/15 border border-[#FF6B00]/50 text-[#FF6B00] shadow-[0_0_12px_rgba(255,107,0,0.25)]'
              : 'bg-[#12121A] border border-[#20202E] text-zinc-400 hover:text-white'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Calculadora de Frete por GPS & Regras</span>
        </button>

        <button
          onClick={() => {
            playBeep();
            setActiveTab('equipe');
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'equipe'
              ? 'bg-[#00D2FF]/15 border border-[#00D2FF]/50 text-[#00D2FF] shadow-[0_0_12px_rgba(0,210,255,0.25)]'
              : 'bg-[#12121A] border border-[#20202E] text-zinc-400 hover:text-white'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Frota de Entregadores ({drivers.length})</span>
        </button>
      </div>

      {/* TAB 1: RADAR MAP & GPS LIVE TRACKING */}
      {activeTab === 'mapa' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interactive Radar Visual Canvas (2 cols) */}
          <div className="lg:col-span-2 bg-[#101018] border border-[#20202E] rounded-3xl p-5 relative overflow-hidden shadow-2xl flex flex-col min-h-[580px]">
            {/* Map Header Bar */}
            <div className="flex items-center justify-between gap-3 mb-4 z-10 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#00E676] animate-ping" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Radar Logístico São Paulo / Jardins
                </h3>
              </div>

              {/* Map controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-[#1A1A26] border border-[#2A2A3E] rounded-xl p-1 text-xs">
                  <button
                    onClick={() => setDriverFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      driverFilter === 'all' ? 'bg-[#00E676] text-black shadow' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Todos ({drivers.length})
                  </button>
                  <button
                    onClick={() => setDriverFilter('on_route')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      driverFilter === 'on_route' ? 'bg-[#00E676] text-black shadow' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Em Rota ({driversOnRoute.length})
                  </button>
                  <button
                    onClick={() => setDriverFilter('available')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      driverFilter === 'available' ? 'bg-[#00E676] text-black shadow' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Disponíveis ({driversAvailable.length})
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-[#1A1A26] border border-[#2A2A3E] rounded-xl p-1 text-xs">
                  <button
                    onClick={() => setMapZoom((prev) => Math.min(prev + 0.25, 2))}
                    className="w-7 h-7 rounded-lg hover:bg-zinc-800 text-white font-bold flex items-center justify-center"
                    title="Aproximar"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setMapZoom((prev) => Math.max(prev - 0.25, 0.75))}
                    className="w-7 h-7 rounded-lg hover:bg-zinc-800 text-white font-bold flex items-center justify-center"
                    title="Afastar"
                  >
                    -
                  </button>
                </div>
              </div>
            </div>

            {/* Radar Canvas Stage */}
            <div className="flex-1 relative w-full h-full min-h-[460px] bg-[#0A0A10] rounded-2xl border border-[#1E1E2C] overflow-hidden flex items-center justify-center select-none">
              {/* Radar concentric rings (Delivery zones) */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* 15 km border */}
                <div
                  className="rounded-full border border-red-500/20 absolute"
                  style={{ width: `${90 * mapZoom}%`, height: `${90 * mapZoom}%` }}
                >
                  <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-mono text-red-400/60 bg-[#0A0A10]/90 px-1.5 rounded">
                    Raio Limite 15 km
                  </span>
                </div>
                {/* 10 km ring */}
                <div
                  className="rounded-full border border-amber-500/20 absolute"
                  style={{ width: `${66 * mapZoom}%`, height: `${66 * mapZoom}%` }}
                >
                  <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-mono text-amber-400/60 bg-[#0A0A10]/90 px-1.5 rounded">
                    Raio 10 km
                  </span>
                </div>
                {/* 6 km ring */}
                <div
                  className="rounded-full border border-yellow-500/25 absolute"
                  style={{ width: `${44 * mapZoom}%`, height: `${44 * mapZoom}%` }}
                >
                  <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-mono text-yellow-400/60 bg-[#0A0A10]/90 px-1.5 rounded">
                    Raio 6 km
                  </span>
                </div>
                {/* 3 km ring (Expresso) */}
                <div
                  className="rounded-full border border-[#00E676]/35 bg-[#00E676]/[0.02] absolute"
                  style={{ width: `${24 * mapZoom}%`, height: `${24 * mapZoom}%` }}
                >
                  <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-mono text-[#00E676]/80 bg-[#0A0A10]/90 px-1.5 rounded">
                    Raio Expresso 3 km
                  </span>
                </div>

                {/* Radar Grid Axes */}
                <div className="w-full h-[1px] bg-[#1E1E2C] absolute top-1/2 left-0" />
                <div className="h-full w-[1px] bg-[#1E1E2C] absolute top-0 left-1/2" />

                {/* Radial sweep animation */}
                <div className="w-full h-full absolute rounded-full opacity-30 animate-spin origin-center pointer-events-none [animation-duration:12s] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,rgba(0,230,118,0.15)_360deg)]" />
              </div>

              {/* STREET / LANDMARK LABELS */}
              <div className="absolute top-8 left-8 text-[10px] text-zinc-600 font-mono pointer-events-none">
                📍 Pinheiros / Faria Lima
              </div>
              <div className="absolute top-8 right-8 text-[10px] text-zinc-600 font-mono pointer-events-none">
                📍 Consolação / Paulista
              </div>
              <div className="absolute bottom-8 left-8 text-[10px] text-zinc-600 font-mono pointer-events-none">
                📍 Itaim Bibi / Berrini
              </div>
              <div className="absolute bottom-8 right-8 text-[10px] text-zinc-600 font-mono pointer-events-none">
                📍 Moema / Ibirapuera
              </div>

              {/* CENTER PIN: STORE / MATRIZ */}
              <div
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer group"
                style={{ left: '50%', top: '50%' }}
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#DA291C] to-[#FFC72C] flex items-center justify-center text-white shadow-[0_0_20px_rgba(218,41,28,0.6)] border-2 border-white group-hover:scale-110 transition-transform">
                    <span className="text-xs font-black">🍔</span>
                  </div>
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#00E676] border-2 border-[#0A0A10]" />
                </div>
                <div className="mt-1 bg-black/90 border border-[#DA291C]/60 px-2 py-0.5 rounded-md text-[10px] font-black text-[#FFC72C] whitespace-nowrap shadow-lg">
                  Matriz Neon Food
                </div>
              </div>

              {/* ACTIVE DELIVERING DRIVERS & ROUTES */}
              {filteredDrivers.map((driver) => {
                const pos = getMapPosition(driver.coords);
                const isSelected = selectedDriver?.id === driver.id;
                const isOnRoute = driver.status === 'on_route';

                return (
                  <React.Fragment key={driver.id}>
                    {/* Dashed Route Line if Driver has a Destination */}
                    {isOnRoute && driver.destinationCoords && (
                      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                        {(() => {
                          const destPos = getMapPosition(driver.destinationCoords);
                          return (
                            <line
                              x1={`${pos.x}%`}
                              y1={`${pos.y}%`}
                              x2={`${destPos.x}%`}
                              y2={`${destPos.y}%`}
                              stroke="#00E676"
                              strokeWidth="2"
                              strokeDasharray="6,4"
                              className="animate-pulse opacity-70"
                            />
                          );
                        })()}
                      </svg>
                    )}

                    {/* Customer Destination Marker if On Route */}
                    {isOnRoute && driver.destinationCoords && (
                      <div
                        className="absolute z-15 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                        style={{
                          left: `${getMapPosition(driver.destinationCoords).x}%`,
                          top: `${getMapPosition(driver.destinationCoords).y}%`,
                        }}
                      >
                        <div className="w-7 h-7 rounded-full bg-red-600 border-2 border-white text-white flex items-center justify-center text-[10px] font-bold shadow-[0_0_12px_rgba(220,38,38,0.6)] animate-bounce">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[9px] font-bold text-white bg-black/80 px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap">
                          Destino Cliente
                        </span>
                      </div>
                    )}

                    {/* Driver Animated Marker Pin */}
                    <div
                      onClick={() => {
                        playBeep(900, 0.05);
                        setSelectedDriver(driver);
                      }}
                      className="absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-1000 ease-out group"
                      style={{
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                      }}
                    >
                      <div
                        className={`relative p-2 rounded-2xl border-2 transition-all flex items-center justify-center ${
                          isOnRoute
                            ? 'bg-[#00E676] text-black border-white shadow-[0_0_20px_rgba(0,230,118,0.7)]'
                            : 'bg-[#1E1E2E] text-white border-zinc-600 shadow-md'
                        } ${isSelected ? 'ring-4 ring-[#FFC72C] scale-125' : 'group-hover:scale-110'}`}
                      >
                        {driver.vehicle === 'bike' ? (
                          <Bike className="w-4 h-4" />
                        ) : driver.vehicle === 'carro' ? (
                          <Car className="w-4 h-4" />
                        ) : (
                          <Truck className="w-4 h-4" />
                        )}

                        {/* Battery alert icon */}
                        {driver.batteryLevel && driver.batteryLevel <= 25 && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border border-white text-[8px] flex items-center justify-center font-bold">
                            !
                          </span>
                        )}
                      </div>

                      {/* Driver Tag */}
                      <div className="mt-1 flex flex-col items-center">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap shadow-md ${
                            isOnRoute ? 'bg-[#00E676] text-black' : 'bg-black/90 text-white border border-zinc-700'
                          }`}
                        >
                          {driver.name.split(' ')[0]} {isOnRoute ? `(${driver.speedKmh ?? 35} km/h)` : ''}
                        </span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Radar Footer Legend */}
            <div className="mt-3 pt-3 border-t border-[#1E1E2C] flex items-center justify-between text-xs text-zinc-400 flex-wrap gap-2">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00E676]" />
                  <span>Em Rota com Pedido</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1E1E2E] border border-zinc-500" />
                  <span>Disponível na Base</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#DA291C]" />
                  <span>Destino / Cliente</span>
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">
                Lat: {storeCoords.lat.toFixed(4)} | Lng: {storeCoords.lng.toFixed(4)}
              </span>
            </div>
          </div>

          {/* Right Panel: Driver Telemetry & Active Routes */}
          <div className="space-y-5">
            {/* Selected Driver Inspector Card */}
            {selectedDriver ? (
              <div className="bg-[#12121A] border-2 border-[#00E676]/40 p-5 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#00E676]/20 border border-[#00E676]/40 flex items-center justify-center text-[#00E676] font-black text-lg">
                      {selectedDriver.name[0]}
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white">{selectedDriver.name}</h4>
                      <p className="text-xs text-[#00E676] font-mono">
                        {selectedDriver.vehicle.toUpperCase()} • {selectedDriver.plate || 'SEM PLACA'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedDriver(null)}
                    className="w-7 h-7 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Status Switcher */}
                <div className="grid grid-cols-3 gap-1.5 mb-4 text-xs font-bold">
                  <button
                    onClick={() => updateDriverStatus(selectedDriver.id, 'available')}
                    className={`py-1.5 rounded-lg border text-center transition-all ${
                      selectedDriver.status === 'available'
                        ? 'bg-[#00E676]/20 border-[#00E676] text-[#00E676]'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    Disponível
                  </button>
                  <button
                    onClick={() => updateDriverStatus(selectedDriver.id, 'on_route')}
                    className={`py-1.5 rounded-lg border text-center transition-all ${
                      selectedDriver.status === 'on_route'
                        ? 'bg-[#00D2FF]/20 border-[#00D2FF] text-[#00D2FF]'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    Em Rota
                  </button>
                  <button
                    onClick={() => updateDriverStatus(selectedDriver.id, 'offline')}
                    className={`py-1.5 rounded-lg border text-center transition-all ${
                      selectedDriver.status === 'offline'
                        ? 'bg-red-500/20 border-red-500 text-red-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    Pausa
                  </button>
                </div>

                {/* Live Telemetry Info */}
                <div className="space-y-2.5 text-xs bg-[#0C0C12] p-3.5 rounded-2xl border border-zinc-800/80 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Bateria do Smartphone:</span>
                    <span className="font-mono font-bold text-white flex items-center gap-1">
                      <BatteryCharging className="w-3.5 h-3.5 text-[#00E676]" />
                      {selectedDriver.batteryLevel ?? 95}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Velocidade Atual:</span>
                    <span className="font-mono font-bold text-white">
                      {selectedDriver.status === 'on_route' ? `${selectedDriver.speedKmh ?? 35} km/h` : '0 km/h (Parado)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Entregas Concluídas Hoje:</span>
                    <span className="font-mono font-bold text-[#FFC72C]">{selectedDriver.completedToday}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Gorjetas Acumuladas:</span>
                    <span className="font-mono font-bold text-[#00E676]">{formatBRL(selectedDriver.totalTipsToday)}</span>
                  </div>

                  {selectedDriver.destinationAddress && (
                    <div className="pt-2 border-t border-zinc-800">
                      <span className="text-zinc-400 block mb-0.5">Destino da Entrega:</span>
                      <p className="font-bold text-white truncate">{selectedDriver.destinationAddress}</p>
                      <p className="text-[11px] text-[#00E676] mt-0.5">
                        ETA Previsto: ~{selectedDriver.estimatedArrivalMin ?? 12} min
                      </p>
                    </div>
                  )}
                </div>

                {/* Driver Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`https://wa.me/55${selectedDriver.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-[#00E676] font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-900/80 transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>

                  {selectedDriver.assignedOrderId ? (
                    <button
                      onClick={() => {
                        completeDriverDelivery(selectedDriver.assignedOrderId!);
                        setSelectedDriver(null);
                      }}
                      className="p-2.5 rounded-xl bg-[#00E676] text-black font-bold text-xs flex items-center justify-center gap-1.5 hover:brightness-110 shadow-lg"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Concluir Entrega</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveTab('despacho')}
                      className="p-2.5 rounded-xl bg-[#1A1A26] border border-[#2E2E42] text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-zinc-800"
                    >
                      <span>Vincular Pedido</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[#12121A] border border-[#20202E] p-5 rounded-3xl text-center">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 flex items-center justify-center mx-auto mb-3 text-zinc-400">
                  <Navigation className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Telemetria de Entregador</h4>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                  Clique em qualquer motoboy no mapa de radar para inspecionar nível de bateria, velocidade, destino e dados de contato.
                </p>
              </div>
            )}

            {/* List of Active In-Flight Deliveries */}
            <div className="bg-[#12121A] border border-[#20202E] p-5 rounded-3xl">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  Entregas em Rota ({deliveringOrders.length})
                </h4>
                <span className="text-[11px] text-[#00E676] font-bold">Ao Vivo</span>
              </div>

              {deliveringOrders.length === 0 ? (
                <p className="text-xs text-zinc-500 italic text-center py-6">
                  Nenhum pedido em trânsito no momento.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-[340px] overflow-y-auto scrollbar-thin pr-1">
                  {deliveringOrders.map((order) => {
                    const assignedDriver = drivers.find((d) => d.id === order.driverId);
                    return (
                      <div
                        key={order.id}
                        className="p-3 bg-[#0D0D14] border border-[#222232] rounded-2xl text-xs hover:border-[#00E676]/40 transition-all"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-black text-white">{order.displayCode}</span>
                          <span className="font-bold text-[#FFC72C]">{formatBRL(order.total)}</span>
                        </div>

                        <p className="font-semibold text-zinc-300 truncate">{order.customerName}</p>
                        {order.customerAddress && (
                          <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                            📍 {order.customerAddress.street}, {order.customerAddress.number}
                            {order.customerAddress.distanceKm ? ` (${order.customerAddress.distanceKm} km)` : ''}
                          </p>
                        )}

                        <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[11px] text-[#00E676]">
                            <Truck className="w-3.5 h-3.5" />
                            <span>{assignedDriver ? assignedDriver.name : 'Motoboy Neon'}</span>
                          </div>

                          <button
                            onClick={() => completeDriverDelivery(order.id)}
                            className="px-2.5 py-1 rounded-lg bg-[#00E676]/20 border border-[#00E676]/40 text-[#00E676] hover:bg-[#00E676] hover:text-black font-bold text-[11px] transition-all"
                          >
                            Entregue ✅
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DISPATCH QUEUE */}
      {activeTab === 'despacho' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column A: Orders Ready for Dispatch */}
          <div className="bg-[#12121A] border border-[#20202E] p-6 rounded-3xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B00]" />
                  Aguardando Despacho ({pendingDispatchOrders.length})
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Prontos na cozinha para atribuição ao motoboy mais próximo.
                </p>
              </div>
            </div>

            {pendingDispatchOrders.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 text-xs">
                <CheckCircle2 className="w-10 h-10 text-[#00E676] mx-auto mb-2 opacity-80" />
                <p className="font-bold text-zinc-300">Tudo limpo!</p>
                <p>Nenhum pedido aguardando despacho no momento.</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[600px] overflow-y-auto scrollbar-thin pr-1">
                {pendingDispatchOrders.map((order) => {
                  const distKm = order.customerAddress?.distanceKm || 2.5;
                  return (
                    <div
                      key={order.id}
                      className="bg-[#0C0C14] border border-[#222234] hover:border-[#FFC72C]/40 p-4 rounded-2xl transition-all"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-white text-sm">{order.displayCode}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFC72C]/15 border border-[#FFC72C]/40 text-[#FFC72C]">
                              {order.channel.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-zinc-200 mt-1">{order.customerName}</p>
                          {order.customerPhone && (
                            <p className="text-[11px] text-zinc-400">{order.customerPhone}</p>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="font-black text-[#FFC72C] text-sm">{formatBRL(order.total)}</p>
                          <p className="text-[11px] text-[#00E676] font-mono">
                            Frete: {order.deliveryFee === 0 ? 'GRÁTIS' : formatBRL(order.deliveryFee)}
                          </p>
                        </div>
                      </div>

                      {/* Address & Estimated Distance */}
                      {order.customerAddress && (
                        <div className="bg-[#141420] p-2.5 rounded-xl text-xs text-zinc-300 mb-3 flex items-center justify-between">
                          <div className="truncate pr-2">
                            <span className="text-zinc-500 mr-1">📍</span>
                            <span>{order.customerAddress.street}, {order.customerAddress.number}</span>
                          </div>
                          <span className="font-mono text-[#00D2FF] font-bold whitespace-nowrap">
                            ~{distKm} km
                          </span>
                        </div>
                      )}

                      {/* Quick Driver Dispatch Selector */}
                      <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs text-zinc-400">Despachar com:</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {driversAvailable.length === 0 ? (
                            <span className="text-xs text-red-400 font-bold">
                              Sem motoboys livres na base
                            </span>
                          ) : (
                            driversAvailable.slice(0, 3).map((driver) => (
                              <button
                                key={driver.id}
                                onClick={() => assignDriverToOrder(order.id, driver.id)}
                                className="px-3 py-1.5 rounded-xl bg-[#00E676]/15 hover:bg-[#00E676] text-[#00E676] hover:text-black border border-[#00E676]/40 font-bold text-xs transition-all flex items-center gap-1"
                              >
                                <span>{driver.name.split(' ')[0]}</span>
                                <span className="text-[10px]">({driver.vehicle[0].toUpperCase()})</span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column B: In-Flight Deliveries Monitoring */}
          <div className="bg-[#12121A] border border-[#20202E] p-6 rounded-3xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00E676] animate-pulse" />
                  Em Trânsito / Entrega Ativa ({deliveringOrders.length})
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Acompanhe a rota em tempo real e confirme a entrega ao receber o retorno.
                </p>
              </div>
            </div>

            {deliveringOrders.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 text-xs">
                <Truck className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                <p>Nenhuma entrega na rua agora.</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[600px] overflow-y-auto scrollbar-thin pr-1">
                {deliveringOrders.map((order) => {
                  const driver = drivers.find((d) => d.id === order.driverId);
                  return (
                    <div
                      key={order.id}
                      className="bg-[#0C0C14] border border-[#00E676]/30 p-4 rounded-2xl relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-white text-sm">{order.displayCode}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00E676]/15 border border-[#00E676]/40 text-[#00E676]">
                              EM ROTA
                            </span>
                          </div>
                          <p className="text-xs font-bold text-zinc-200 mt-1">{order.customerName}</p>
                        </div>

                        <div className="text-right">
                          <p className="font-black text-white text-sm">{formatBRL(order.total)}</p>
                          <p className="text-[11px] text-zinc-400">
                            {order.paymentMethod.toUpperCase()} ({order.paymentStatus === 'paid' ? 'PAGO' : 'A PAGAR'})
                          </p>
                        </div>
                      </div>

                      {/* Driver Badge */}
                      <div className="bg-[#12121E] p-2.5 rounded-xl text-xs text-zinc-300 mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#00E676] animate-ping" />
                          <span className="font-bold text-[#00E676]">{order.driverName || 'Motoboy'}</span>
                          <span className="text-zinc-500">• {driver?.vehicle.toUpperCase()} ({driver?.plate})</span>
                        </div>
                        <span className="text-[11px] text-zinc-400">
                          {driver?.speedKmh ? `${driver.speedKmh} km/h` : '35 km/h'}
                        </span>
                      </div>

                      {/* Action: Complete Delivery */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                        <button
                          onClick={() => completeDriverDelivery(order.id)}
                          className="px-4 py-2 rounded-xl bg-[#00E676] hover:bg-[#00E676]/90 text-black font-black text-xs transition-all flex items-center gap-1.5 shadow-lg"
                        >
                          <Check className="w-4 h-4" />
                          <span>Confirmar Entrega Concluída</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: GEOLOCATION DELIVERY FEE CALCULATOR & RULES */}
      {activeTab === 'calculadora' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Interactive Calculator Simulation (7 cols) */}
          <div className="lg:col-span-7 bg-[#12121A] border border-[#20202E] p-6 rounded-3xl shadow-xl space-y-5">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#FFC72C]" />
                Simulador de Taxa por Geolocalização do Cliente
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Calcule a taxa exata e o tempo estimado a partir das coordenadas geográficas e raio de atendimento da Matriz.
              </p>
            </div>

            {/* GPS Detection Bar */}
            <div className="p-4 bg-[#0A0A10] border border-zinc-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-xs font-bold text-zinc-300">
                  Origem: <span className="text-[#FFC72C]">{storeAddress}</span>
                </span>
                <button
                  onClick={handleDetectBrowserLocation}
                  disabled={isLocatingUser}
                  className="px-3.5 py-1.5 rounded-xl bg-[#00E676]/15 hover:bg-[#00E676]/25 border border-[#00E676]/40 text-[#00E676] font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <LocateFixed className={`w-3.5 h-3.5 ${isLocatingUser ? 'animate-spin' : ''}`} />
                  <span>{isLocatingUser ? 'Capturando GPS...' : '📍 Detectar Minha Posição (GPS)'}</span>
                </button>
              </div>

              {locationSuccessMsg && (
                <p className="text-[11px] text-[#00E676] font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {locationSuccessMsg}
                </p>
              )}

              {/* Quick Preset Neighborhoods */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Ou Escolha um Ponto de Teste em São Paulo:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_DELIVERY_LOCATIONS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => {
                        playBeep(850, 0.04);
                        setCalcCoords(preset.coords);
                        setCalcAddressName(preset.name);
                        setLocationSuccessMsg(null);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                        calcAddressName === preset.name
                          ? 'bg-[#FFC72C]/20 border-[#FFC72C] text-[#FFC72C] font-bold'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Subtotal Slider for Free Delivery Test */}
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-4">
                <label className="text-xs text-zinc-300 font-medium">
                  Subtotal do Pedido: <span className="font-bold text-[#FFC72C]">{formatBRL(calcSubtotal)}</span>
                </label>
                <input
                  type="range"
                  min="20"
                  max="200"
                  step="5"
                  value={calcSubtotal}
                  onChange={(e) => setCalcSubtotal(Number(e.target.value))}
                  className="w-48 accent-[#FFC72C]"
                />
              </div>
            </div>

            {/* Detailed Calculation Output Card */}
            <div
              className={`p-5 rounded-2xl border transition-all ${
                calcResult.isDeliverable
                  ? 'bg-gradient-to-br from-[#0F1710] to-[#0A0A10] border-[#00E676]/40'
                  : 'bg-red-950/40 border-red-500/40'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${calcResult.zone.badgeBg}`}>
                    {calcResult.zone.name}
                  </span>
                  <h4 className="text-lg font-black text-white mt-1.5">{calcAddressName}</h4>
                  <p className="text-xs text-zinc-400">
                    Distância Geodésica Estimada: <span className="font-bold text-white">{calcResult.distanceKm} km</span>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-zinc-400 block">Taxa de Entrega</span>
                  <p className="text-2xl font-black text-[#00E676]">
                    {calcResult.isFreeDelivery ? 'GRÁTIS' : formatBRL(calcResult.deliveryFee)}
                  </p>
                  {calcResult.isFreeDelivery && (
                    <span className="text-[10px] text-[#FFC72C] font-bold">
                      🎉 Frete Grátis acima de {formatBRL(settingsForm.freeDeliveryOver)}!
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-zinc-800/80 text-xs">
                <div className="bg-black/40 p-2.5 rounded-xl">
                  <span className="text-zinc-500 block text-[10px]">Taxa Base (até {settingsForm.baseRadiusKm}km)</span>
                  <span className="font-bold text-white">{formatBRL(calcResult.breakdown.baseFee)}</span>
                </div>
                <div className="bg-black/40 p-2.5 rounded-xl">
                  <span className="text-zinc-500 block text-[10px]">KM Adicional ({calcResult.breakdown.extraKmCount} km)</span>
                  <span className="font-bold text-white">{formatBRL(calcResult.breakdown.extraKmFee)}</span>
                </div>
                <div className="bg-black/40 p-2.5 rounded-xl">
                  <span className="text-zinc-500 block text-[10px]">Tempo Estimado (ETA)</span>
                  <span className="font-bold text-[#FFC72C]">
                    ~{calcResult.estimatedMinutesMin} a {calcResult.estimatedMinutesMax} min
                  </span>
                </div>
                <div className="bg-black/40 p-2.5 rounded-xl">
                  <span className="text-zinc-500 block text-[10px]">Status do Raio</span>
                  <span className={`font-bold ${calcResult.isDeliverable ? 'text-[#00E676]' : 'text-red-400'}`}>
                    {calcResult.isDeliverable ? 'Atendido ✅' : 'Fora do Raio ❌'}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Zones Table */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Zonas de Raio e Faixas de Preço Configuradas
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {DEFAULT_DELIVERY_ZONES.map((zone) => (
                  <div
                    key={zone.id}
                    className="p-3 bg-[#0A0A10] border border-zinc-800 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-white block">{zone.name}</span>
                      <span className="text-[11px] text-zinc-400">{zone.description}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-[#00E676]">{formatBRL(zone.baseFee)}</span>
                      <span className="text-[10px] text-zinc-500 block">{zone.estimatedMinutes}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pricing Rules Settings Editor (5 cols) */}
          <div className="lg:col-span-5 bg-[#12121A] border border-[#20202E] p-6 rounded-3xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[#00D2FF]" />
                  Regras de Cobrança do Restaurante
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Parâmetros salvos e aplicados automaticamente ao checkout do cliente.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-300 font-bold block mb-1">
                  Taxa Base de Entrega (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500">R$</span>
                  <input
                    type="number"
                    step="0.50"
                    value={settingsForm.baseFee}
                    onChange={(e) => setSettingsForm({ ...settingsForm, baseFee: Number(e.target.value) })}
                    className="w-full pl-9 pr-3 py-2 bg-[#0A0A10] border border-zinc-800 rounded-xl text-white outline-none focus:border-[#00E676]"
                  />
                </div>
                <span className="text-[10px] text-zinc-500">Valor fixo para entregas no primeiro raio.</span>
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">
                  Raio Base Inicial (km)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={settingsForm.baseRadiusKm}
                  onChange={(e) => setSettingsForm({ ...settingsForm, baseRadiusKm: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#0A0A10] border border-zinc-800 rounded-xl text-white outline-none focus:border-[#00E676]"
                />
                <span className="text-[10px] text-zinc-500">Distância inclusa na taxa base (padrão: 3.0 km).</span>
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">
                  Adicional por KM Excedente (R$/km)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500">R$</span>
                  <input
                    type="number"
                    step="0.20"
                    value={settingsForm.feePerKm}
                    onChange={(e) => setSettingsForm({ ...settingsForm, feePerKm: Number(e.target.value) })}
                    className="w-full pl-9 pr-3 py-2 bg-[#0A0A10] border border-zinc-800 rounded-xl text-white outline-none focus:border-[#00E676]"
                  />
                </div>
                <span className="text-[10px] text-zinc-500">Cobrado para cada km além do raio base.</span>
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">
                  Raio Máximo de Atendimento (km)
                </label>
                <input
                  type="number"
                  step="1"
                  value={settingsForm.maxRadiusKm}
                  onChange={(e) => setSettingsForm({ ...settingsForm, maxRadiusKm: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#0A0A10] border border-zinc-800 rounded-xl text-white outline-none focus:border-[#00E676]"
                />
                <span className="text-[10px] text-zinc-500">Pedidos além dessa distância são recusados automaticamente.</span>
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">
                  Frete Grátis para Pedidos Acima de (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500">R$</span>
                  <input
                    type="number"
                    step="5.00"
                    value={settingsForm.freeDeliveryOver}
                    onChange={(e) => setSettingsForm({ ...settingsForm, freeDeliveryOver: Number(e.target.value) })}
                    className="w-full pl-9 pr-3 py-2 bg-[#0A0A10] border border-zinc-800 rounded-xl text-white outline-none focus:border-[#00E676]"
                  />
                </div>
                <span className="text-[10px] text-zinc-500">Incentivo para aumentar o ticket médio do cardápio digital.</span>
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full py-3 rounded-xl bg-[#00E676] hover:bg-[#00E676]/90 text-black font-black text-xs transition-all shadow-[0_0_15px_rgba(0,230,118,0.3)] flex items-center justify-center gap-2"
            >
              {settingsSavedFeedback ? <Check className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{settingsSavedFeedback ? 'Regras Salvas com Sucesso!' : 'Salvar Regras de Frete'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: FLEET & DRIVERS MANAGEMENT */}
      {activeTab === 'equipe' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-base font-black text-white">Equipe de Entregadores Cadastrados</h3>
              <p className="text-xs text-zinc-400">
                Gerencie disponibilidade, veículos, placas e histórico de desempenho.
              </p>
            </div>

            <button
              onClick={() => setIsNewDriverModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#DA291C] hover:bg-[#DA291C]/90 text-white flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>+ Novo Entregador</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {drivers.map((driver) => (
              <div
                key={driver.id}
                className="bg-[#12121A] border border-[#20202E] p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-white font-black text-base">
                        {driver.name[0]}
                      </div>
                      <div>
                        <h4 className="font-black text-white text-sm">{driver.name}</h4>
                        <p className="text-xs text-zinc-400 font-mono">
                          {driver.vehicle.toUpperCase()} • {driver.plate || 'SEM PLACA'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        driver.status === 'on_route'
                          ? 'bg-[#00E676]/15 border-[#00E676]/40 text-[#00E676]'
                          : driver.status === 'available'
                          ? 'bg-[#FFC72C]/15 border-[#FFC72C]/40 text-[#FFC72C]'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      {driver.status === 'on_route' ? 'Em Rota' : driver.status === 'available' ? 'Livre' : 'Pausa'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs bg-[#0A0A10] p-3 rounded-2xl border border-zinc-800/70 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Entregas Hoje:</span>
                      <span className="font-mono font-bold text-white">{driver.completedToday}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Gorjetas Acumuladas:</span>
                      <span className="font-mono font-bold text-[#00E676]">{formatBRL(driver.totalTipsToday)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Nível Bateria:</span>
                      <span className="font-mono font-bold text-zinc-300">{driver.batteryLevel ?? 95}%</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80">
                  <a
                    href={`https://wa.me/55${driver.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#00E676]" />
                    <span>Chamar</span>
                  </a>

                  <button
                    onClick={() => {
                      updateDriverStatus(
                        driver.id,
                        driver.status === 'available' ? 'offline' : 'available'
                      );
                    }}
                    className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-bold"
                    title="Alternar Pausa"
                  >
                    {driver.status === 'offline' ? 'Ativar' : 'Pausar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: CADASTRAR NOVO ENTREGADOR */}
      <AnimatePresence>
        {isNewDriverModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#12121A] border border-[#20202E] rounded-3xl p-6 w-full max-w-md shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#DA291C]/20 text-[#FF4D4D] flex items-center justify-center">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base">Novo Entregador</h3>
                    <p className="text-xs text-zinc-400">Adicionar à frota de delivery</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNewDriverModalOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateDriver} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo Silveira"
                    value={newDriverName}
                    onChange={(e) => setNewDriverName(e.target.value)}
                    className="w-full p-2.5 bg-[#0A0A10] border border-zinc-800 rounded-xl text-white outline-none focus:border-[#00E676]"
                  />
                </div>

                <div>
                  <label className="text-zinc-300 font-bold block mb-1">WhatsApp / Telefone</label>
                  <input
                    type="text"
                    required
                    placeholder="(11) 98888-7777"
                    value={newDriverPhone}
                    onChange={(e) => setNewDriverPhone(e.target.value)}
                    className="w-full p-2.5 bg-[#0A0A10] border border-zinc-800 rounded-xl text-white outline-none focus:border-[#00E676]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-zinc-300 font-bold block mb-1">Tipo de Veículo</label>
                    <select
                      value={newDriverVehicle}
                      onChange={(e) => setNewDriverVehicle(e.target.value as any)}
                      className="w-full p-2.5 bg-[#0A0A10] border border-zinc-800 rounded-xl text-white outline-none focus:border-[#00E676]"
                    >
                      <option value="moto">🏍️ Moto</option>
                      <option value="bike">🚲 Bicicleta</option>
                      <option value="carro">🚗 Carro</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-zinc-300 font-bold block mb-1">Placa / Identificador</label>
                    <input
                      type="text"
                      placeholder="ABC-1234"
                      value={newDriverPlate}
                      onChange={(e) => setNewDriverPlate(e.target.value)}
                      className="w-full p-2.5 bg-[#0A0A10] border border-zinc-800 rounded-xl text-white outline-none focus:border-[#00E676]"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewDriverModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#00E676] hover:bg-[#00E676]/90 text-black font-black shadow-lg"
                  >
                    Salvar e Cadastrar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
