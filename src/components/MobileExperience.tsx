import React, { useState } from 'react';
import { 
  Smartphone, 
  Truck, 
  QrCode, 
  MapPin, 
  Phone, 
  CheckCircle2, 
  MessageSquare, 
  Battery, 
  Flame, 
  Clock, 
  Navigation,
  Sparkles,
  DollarSign,
  Plus,
  Minus,
  UtensilsCrossed,
  UserCheck,
  Share2,
  ExternalLink,
  Send
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatBRL } from '../utils/formatters';
import { playBeep, playCashRegister } from '../utils/audio';
import { CompartilharCardapioModal } from './CompartilharCardapioModal';

export const MobileExperience: React.FC = () => {
  const { drivers, orders, updateOrderStatus, tenant, products, addOrder, currentUser, currentBranch } = useApp();
  const [activeTab, setActiveTab] = useState<'driver_app' | 'attendant_app' | 'table_pwa'>('attendant_app');
  const [selectedDriverId, setSelectedDriverId] = useState(drivers[0]?.id || 'drv_1');

  // Attendant state
  const [selectedTable, setSelectedTable] = useState<number>(1);
  const [attendantName, setAttendantName] = useState<string>(currentUser?.name || 'Atendente');
  const [attendantCart, setAttendantCart] = useState<{ id: string; name: string; price: number; qty: number }[]>([]);
  const [orderSentToast, setOrderSentToast] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [modalInitialTable, setModalInitialTable] = useState<number | undefined>(undefined);

  const selectedDriver = drivers.find(d => d.id === selectedDriverId) || drivers[0];
  const driverOrders = orders.filter(o => o.driverId === selectedDriver?.id || o.status === 'delivering');

  const attendantSubtotal = attendantCart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handleAttendantSendToKitchen = () => {
    if (attendantCart.length === 0) return;
    playCashRegister();
    
    addOrder({
      branchId: currentBranch?.id || tenant?.id || 'matriz',
      tenantId: tenant?.id || 'tenant_lanchonete_dulci',
      channel: 'atendente_mesa',
      status: 'pending',
      customerName: `Mesa ${selectedTable} (${attendantName})`,
      tableNumber: selectedTable,
      items: attendantCart.map(item => ({
        productId: item.id,
        productName: item.name,
        quantity: item.qty,
        unitPrice: item.price,
        totalPrice: item.price * item.qty,
        station: 'grill',
        status: 'pending',
      })),
      subtotal: attendantSubtotal,
      discount: 0,
      deliveryFee: 0,
      serviceFee: attendantSubtotal * 0.10,
      total: attendantSubtotal * 1.10,
      paymentMethod: 'pix',
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setOrderSentToast(true);
    setTimeout(() => {
      setAttendantCart([]);
      setOrderSentToast(false);
    }, 2000);
  };

  return (
    <div className="space-y-6 pb-20 select-none">
      {/* Top Header */}
      <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-r from-[#141218] via-[#181522] to-[#12121A] border border-[#28283C] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#00D2FF] px-3 py-1 rounded-full bg-[#00D2FF]/15 border border-[#00D2FF]/30">Ecossistema Mobile & Tablet</span>
            <span className="text-xs text-[#71717A]">•</span>
            <span className="text-xs font-bold text-[#FFC72C]">Sincronização em Tempo Real com KDS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight pt-1">
            App dos Atendentes, Cardápio de Mesa & Entregadores
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-2xl leading-relaxed">
            Simulador das telas operacionais de atendimento presencial em celular/tablet pelos atendentes e do app de entregas dos motoboys.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#161624] p-1.5 rounded-2xl border border-[#262638] shrink-0 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => { setActiveTab('attendant_app'); playBeep(700, 0.04); }}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'attendant_app' ? 'bg-gradient-to-r from-[#FFC72C] to-[#FFA000] text-black shadow-lg font-black' : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>App Atendente (Tablet / Celular)</span>
          </button>
          <button
            onClick={() => { setActiveTab('driver_app'); playBeep(700, 0.04); }}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'driver_app' ? 'bg-gradient-to-r from-[#FF6B00] to-[#DA291C] text-white shadow-lg' : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4 text-[#FFC72C]" />
            <span>App Entregador (GPS)</span>
          </button>
          <button
            onClick={() => { setActiveTab('table_pwa'); playBeep(700, 0.04); }}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'table_pwa' ? 'bg-gradient-to-r from-[#DA291C] to-[#FF2B4E] text-white shadow-lg' : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4 text-[#FFC72C]" />
            <span>Mesa QR Code</span>
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Mobile Device Frame */}
        <div className="lg:col-span-1 mx-auto max-w-[350px] w-full bg-[#08080C] border-4 border-[#28283A] rounded-[42px] p-3.5 shadow-2xl relative overflow-hidden">
          {/* Top Speaker & Notch */}
          <div className="w-28 h-4 bg-[#1E1E2C] rounded-full mx-auto mb-3 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-black/60 mr-2" />
            <div className="w-10 h-1 bg-black/40 rounded" />
          </div>

          {/* SCREEN CONTENT: Attendant App (Tablet / Mobile) */}
          {activeTab === 'attendant_app' && (
            <div className="bg-[#12121A] rounded-[28px] p-3.5 text-white min-h-[520px] flex flex-col justify-between border border-[#222232]">
              <div>
                {/* Attendant Header */}
                <div className="flex items-center justify-between border-b border-[#20202E] pb-2.5 mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#FFC72C] text-black flex items-center justify-center font-black text-xs">
                      A
                    </div>
                    <div>
                      <div className="text-xs font-black">{attendantName}</div>
                      <div className="text-[10px] text-[#00D26A] flex items-center gap-1 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00D26A]" /> Atendimento Salão
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-[#1C1C28] px-2 py-1 rounded-lg border border-[#2A2A3E]">
                    <span className="text-[10px] text-[#A1A1AA]">Mesa:</span>
                    <select
                      value={selectedTable}
                      onChange={(e) => setSelectedTable(Number(e.target.value))}
                      className="bg-transparent text-xs font-black text-[#FFC72C] outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                        <option key={num} value={num} className="bg-[#12121A] text-white">#{num}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quick Share Bar for Attendants */}
                <div className="mb-2.5 p-2.5 bg-gradient-to-r from-[#14261B] to-[#121E17] border border-[#25D366]/50 rounded-2xl flex flex-col gap-2 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 rounded-md bg-[#25D366] text-black flex items-center justify-center font-bold">
                        <MessageSquare className="w-3 h-3" />
                      </div>
                      <span className="text-[11px] text-white font-black truncate">Cardápio Mesa #{selectedTable}</span>
                    </div>
                    <span className="text-[9px] font-mono font-bold bg-[#25D366]/20 text-[#25D366] px-1.5 py-0.5 rounded">
                      wa.me
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => {
                        playBeep(980, 0.05);
                        const domain = tenant?.settings?.menuCustomDomain || 'https://neonfood.app/cardapio';
                        const slug = tenant?.settings?.menuCustomSlug || 'lanchonete-dulci';
                        const link = `${domain}?loja=${slug}&mesa=${selectedTable}`;
                        const msg = encodeURIComponent(`🍔 *Cardápio Digital - ${tenant?.name || 'Lanchonete Dulci'}* (Mesa ${selectedTable})\n\nOlá! Acesse nosso cardápio completo e faça seus pedidos diretamente pelo celular:\n👉 ${link}\n\nBom apetite! 🍟🥤`);
                        window.open(`https://wa.me/?text=${msg}`, '_blank');
                      }}
                      className="py-1.5 px-2 bg-[#25D366] hover:bg-[#20bd5a] text-black font-black text-[10px] rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
                      title="Compartilhar via protocolo wa.me"
                    >
                      <Send className="w-3 h-3 text-black" />
                      <span>Enviar via wa.me</span>
                    </button>

                    <button
                      onClick={() => {
                        setModalInitialTable(selectedTable);
                        setIsShareModalOpen(true);
                        playBeep(800, 0.03);
                      }}
                      className="py-1.5 px-2 bg-[#1C2C22] hover:bg-[#253D2F] text-[#00E676] font-bold text-[10px] rounded-xl flex items-center justify-center gap-1 border border-[#00E676]/30 cursor-pointer transition-all"
                      title="Opções de compartilhamento"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>Personalizar</span>
                    </button>
                  </div>
                </div>

                {orderSentToast ? (
                  <div className="bg-emerald-950/80 border border-emerald-500/50 p-4 rounded-2xl text-center space-y-2 my-10 animate-bounce">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <div className="text-xs font-black text-white">Pedido Enviado p/ Cozinha!</div>
                    <div className="text-[10px] text-emerald-300">Ticket impresso no KDS da cozinha.</div>
                  </div>
                ) : (
                  <>
                    {/* Quick Items for Attendants */}
                    <div className="text-[10px] uppercase font-bold text-[#A1A1AA] mb-1.5 flex justify-between items-center">
                      <span>Adicionar Itens na Mesa #{selectedTable}</span>
                      <span className="text-[#FFC72C]">Toque rápido</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 mb-3">
                      {products.slice(0, 4).map(prod => (
                        <button
                          key={prod.id}
                          onClick={() => {
                            playBeep();
                            setAttendantCart(prev => {
                              const existing = prev.find(i => i.id === prod.id);
                              if (existing) {
                                return prev.map(i => i.id === prod.id ? { ...i, qty: i.qty + 1 } : i);
                              }
                              return [...prev, { id: prod.id, name: prod.name, price: prod.price, qty: 1 }];
                            });
                          }}
                          className="p-2 bg-[#181826] hover:bg-[#202032] border border-[#28283C] rounded-xl text-left transition-all active:scale-95 flex flex-col justify-between h-16"
                        >
                          <div className="text-[11px] font-bold text-white truncate leading-tight">{prod.name}</div>
                          <div className="flex justify-between items-center text-[10px] pt-1">
                            <span className="text-[#FFC72C] font-black">{formatBRL(prod.price)}</span>
                            <span className="px-1.5 py-0.5 rounded bg-[#FFC72C]/20 text-[#FFC72C] font-bold">+</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Current Table Cart */}
                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto scrollbar-thin">
                      <div className="text-[10px] uppercase font-bold text-[#71717A]">Itens da Comanda</div>
                      {attendantCart.length === 0 ? (
                        <div className="text-center py-4 text-[11px] text-[#71717A]">
                          Nenhum item selecionado. Toque nos pratos acima.
                        </div>
                      ) : (
                        attendantCart.map((item, idx) => (
                          <div key={idx} className="p-2 bg-[#161622] rounded-xl border border-[#242436] flex items-center justify-between text-xs">
                            <div className="truncate flex-1 pr-2">
                              <span className="font-bold text-white text-[11px]">{item.name}</span>
                              <div className="text-[10px] text-[#FFC72C]">{formatBRL(item.price * item.qty)}</div>
                            </div>
                            <div className="flex items-center gap-1.5 bg-[#0F0F16] p-1 rounded-lg border border-[#242434]">
                              <button
                                onClick={() => {
                                  playBeep();
                                  setAttendantCart(prev => prev.map((i, iIdx) => iIdx === idx ? { ...i, qty: Math.max(1, i.qty - 1) } : i).filter(i => i.qty > 0));
                                }}
                                className="w-5 h-5 rounded bg-[#20202E] flex items-center justify-center text-white"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <span className="font-mono font-bold text-[11px] px-1">{item.qty}</span>
                              <button
                                onClick={() => {
                                  playBeep();
                                  setAttendantCart(prev => prev.map((i, iIdx) => iIdx === idx ? { ...i, qty: i.qty + 1 } : i));
                                }}
                                className="w-5 h-5 rounded bg-[#20202E] flex items-center justify-center text-white"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>

              {!orderSentToast && (
                <div className="pt-2 border-t border-[#1C1C28] space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-black">
                    <span className="text-[#A1A1AA]">Total Mesa #{selectedTable}</span>
                    <span className="text-[#FFC72C] text-sm">{formatBRL(attendantSubtotal)}</span>
                  </div>
                  <button
                    disabled={attendantCart.length === 0}
                    onClick={handleAttendantSendToKitchen}
                    className="w-full py-2.5 bg-[#FFC72C] hover:bg-[#FFA000] disabled:opacity-40 text-black font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5"
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5" />
                    <span>Lançar Pedido no KDS Cozinha</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SCREEN CONTENT: Driver App */}
          {activeTab === 'driver_app' && (
            <div className="bg-[#12121A] rounded-[28px] p-4 text-white min-h-[520px] flex flex-col justify-between border border-[#222232]">
              <div>
                {/* Driver Profile Header */}
                <div className="flex items-center justify-between border-b border-[#20202E] pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <img src={selectedDriver?.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-[#FF7A00]" />
                    <div>
                      <div className="text-xs font-black">{selectedDriver?.name}</div>
                      <div className="text-[10px] text-[#00D26A] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00D26A]" /> Em Rota
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-[#1C1C28] px-2 py-1 rounded-lg flex items-center gap-1 text-[#00D26A]">
                    <Battery className="w-3 h-3" /> {selectedDriver?.batteryLevel}%
                  </span>
                </div>

                {/* Earnings Today Box */}
                <div className="bg-gradient-to-br from-[#1C1826] to-[#12121A] border border-[#FF7A00]/30 rounded-2xl p-3 mb-3 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] text-[#A1A1AA] uppercase font-bold">Ganhos de Hoje</div>
                    <div className="text-lg font-black text-[#FFE600]">R$ 148,50</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-[#A1A1AA]">Entregas</div>
                    <div className="text-sm font-bold text-white">{selectedDriver?.completedToday} feitas</div>
                  </div>
                </div>

                {/* Active Deliveries Queue */}
                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-bold text-[#71717A]">Entrega Atual</div>
                  {driverOrders.slice(0, 1).map(order => (
                    <div key={order.id} className="bg-[#181824] p-3 rounded-2xl border border-[#262638] space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-xs text-[#FF7A00]">{order.displayCode}</span>
                        <span className="text-[10px] font-bold text-[#00D26A]">A receber: R$ 8,00</span>
                      </div>
                      <div className="text-xs font-bold">{order.customerName}</div>
                      <div className="text-[10px] text-[#A1A1AA] flex items-start gap-1">
                        <MapPin className="w-3 h-3 text-[#FF2B4E] shrink-0 mt-0.5" />
                        <span>Rua das Flores, 142 - Moema (2.4 km)</span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          onClick={() => {
                            const msg = encodeURIComponent(`Olá ${order.customerName}! Sou o entregador do ${tenant.name} e estou chegando no seu endereço!`);
                            window.open(`https://wa.me/5511987654321?text=${msg}`, '_blank');
                          }}
                          className="py-2 bg-[#00D26A]/20 text-[#00D26A] rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 border border-[#00D26A]/30"
                        >
                          <MessageSquare className="w-3 h-3" /> WhatsApp
                        </button>
                        <button
                          onClick={() => {
                            window.open(`https://maps.google.com/?q=-23.55052,-46.633308`, '_blank');
                          }}
                          className="py-2 bg-[#77D4E1]/20 text-[#77D4E1] rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 border border-[#77D4E1]/30"
                        >
                          <Navigation className="w-3 h-3" /> Waze / Maps
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          updateOrderStatus(order.id, 'completed');
                          playCashRegister();
                        }}
                        className="w-full mt-2 py-2.5 bg-[#00D26A] text-black font-black text-xs rounded-xl flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar Entrega
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center text-[9px] text-[#71717A] pt-2 border-t border-[#1C1C28]">
                GPS Ativo • Conectado à Central Neon Food OS
              </div>
            </div>
          )}

          {/* SCREEN CONTENT: Table QR Code PWA */}
          {activeTab === 'table_pwa' && (
            <div className="bg-[#12121A] rounded-[28px] p-4 text-white min-h-[520px] flex flex-col justify-between border border-[#222232]">
              <div>
                <div className="flex items-center justify-between border-b border-[#20202E] pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#E31837] flex items-center justify-center font-black text-xs text-white">
                      N
                    </div>
                    <div>
                      <div className="text-xs font-black">{tenant.name}</div>
                      <div className="text-[10px] text-[#FFC72C]">Mesa 08 • Salão</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00D26A]/20 text-[#00D26A] font-bold">
                    Cardápio Web
                  </span>
                </div>

                <div className="text-xs font-bold mb-2">🔥 Destaques da Cozinha</div>
                <div className="space-y-2">
                  <div className="p-2.5 bg-[#181824] rounded-2xl border border-[#262638] flex gap-2.5">
                    <div className="w-14 h-14 rounded-xl bg-neutral-900 overflow-hidden shrink-0">
                      <img src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500" alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-black">Smash Neon Duplo</div>
                      <div className="text-[10px] text-[#A1A1AA]">2x burger 100g, cheddar inglês</div>
                      <div className="text-xs font-black text-[#00D26A] mt-1">R$ 36,90</div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#181824] rounded-2xl border border-[#262638] flex gap-2.5">
                    <div className="w-14 h-14 rounded-xl bg-neutral-900 overflow-hidden shrink-0">
                      <img src="https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500" alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-black">Batata Rústica Neon</div>
                      <div className="text-[10px] text-[#A1A1AA]">Crocante com páprica defumada</div>
                      <div className="text-xs font-black text-[#00D26A] mt-1">R$ 22,00</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => playCashRegister()}
                  className="w-full py-3 bg-[#E31837] text-white font-black text-xs rounded-xl shadow-lg"
                >
                  Pedir na Mesa & Pagar no Pix
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Configuration & QR Code Generator on Right */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#111117] border border-[#222230] p-6 rounded-3xl">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#FFC72C]" />
              <span>Gerador de QR Code para Mesas do Salão</span>
            </h3>
            <p className="text-xs text-[#A1A1AA] mt-1">
              Imprima displays para cada mesa. O cliente aponta a câmera do celular, abre o cardápio e faz o pedido direto para a cozinha, ou é atendido pelo celular/tablet do atendente.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
              {[1, 2, 3, 4, 5, 6].map(table => {
                const domain = tenant?.settings?.menuCustomDomain || 'https://neonfood.app/cardapio';
                const slug = tenant?.settings?.menuCustomSlug || 'lanchonete-dulci';
                const link = `${domain}?loja=${slug}&mesa=${table}`;
                const waText = encodeURIComponent(`🍔 *Cardápio Digital - ${tenant?.name || 'Lanchonete Dulci'}* (Mesa #${table})\n\nOlá! Acesse o cardápio e faça seu pedido pelo celular:\n👉 ${link}`);
                const waUrl = `https://wa.me/?text=${waText}`;

                return (
                  <div key={table} className="p-3 bg-[#161622] rounded-2xl border border-[#242436] flex flex-col justify-between gap-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-black text-xs text-white">Mesa #{table}</div>
                        <div className="text-[10px] text-[#A1A1AA] truncate">loja={slug}&mesa={table}</div>
                      </div>
                      <span className="text-[9px] font-bold text-[#00E676] bg-[#00E676]/10 px-1.5 py-0.5 rounded border border-[#00E676]/20">
                        Ativa
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1 border-t border-[#202030]">
                      <button
                        onClick={() => {
                          playBeep(950, 0.04);
                          window.open(waUrl, '_blank');
                        }}
                        className="flex-1 py-1.5 px-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                        title="Enviar via wa.me para cliente"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>WhatsApp (wa.me)</span>
                      </button>

                      <button
                        onClick={() => {
                          setModalInitialTable(table);
                          setIsShareModalOpen(true);
                          playBeep(800, 0.02);
                        }}
                        className="p-1.5 bg-[#20202E] hover:bg-[#2A2A3E] text-[#FFE600] rounded-xl text-xs font-bold cursor-pointer transition-all"
                        title="Mais opções de envio"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-[#111117] border border-[#222230] p-6 rounded-3xl">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#FF7A00]" />
              <span>Gestão da Frota de Entregadores</span>
            </h3>
            <p className="text-xs text-[#A1A1AA] mt-1">
              Selecione o entregador para inspecionar no simulador mobile:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {drivers.map(drv => (
                <button
                  key={drv.id}
                  onClick={() => setSelectedDriverId(drv.id)}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                    selectedDriverId === drv.id
                      ? 'bg-[#FF7A00]/15 border-[#FF7A00]'
                      : 'bg-[#161622] border-[#242436] hover:border-[#38384D]'
                  }`}
                >
                  <img src={drv.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <div className="font-black text-xs text-white">{drv.name}</div>
                    <div className="text-[10px] text-[#A1A1AA]">{drv.vehicle} • {drv.completedToday} entregas hoje</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Compartilhar Cardápio */}
      <CompartilharCardapioModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        initialTable={modalInitialTable}
      />
    </div>
  );
};

