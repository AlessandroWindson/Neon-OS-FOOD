import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Target, 
  Calendar, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sparkles, 
  Activity, 
  Award, 
  BarChart3, 
  Zap,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Plus,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatBRL } from '../utils/formatters';
import { playBeep, playSoftClickSound } from '../utils/audio';
import { getManagerTargetsConfig } from '../utils/targetsStorage';
import { ConfigMetasModal } from './ConfigMetasModal';
import { financialFirestoreService, SaleFirestore } from '../services/financialFirestoreService';

export interface DailyPerformancePoint {
  date: Date;
  dateStr: string;
  dayNumber: number;
  label: string;
  sales: number;
  target: number;
  cumulativeSales: number;
  cumulativeTarget: number;
  ordersCount: number;
  averageTicket: number;
  growthVsYesterday: number;
  isFuture: boolean;
}

export const DashboardDesempenho: React.FC = () => {
  const { orders = [], tenant, currentBranch, isDemoMode, setCurrentView } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Estado de Carregamento e Vendas Reais do Firestore
  const [isLoadingFirestore, setIsLoadingFirestore] = useState<boolean>(true);
  const [firestoreSales, setFirestoreSales] = useState<SaleFirestore[]>([]);

  // View toggles
  const [viewMode, setViewMode] = useState<'daily' | 'cumulative'>('daily');
  const [periodDays, setPeriodDays] = useState<14 | 30>(30);
  const [monthlyTarget, setMonthlyTarget] = useState<number>(() => {
    const cfg = getManagerTargetsConfig();
    return (cfg.dailyRevenueTarget || 0) * 30; // 0 se nenhuma meta configurada
  });
  const [hoveredPoint, setHoveredPoint] = useState<DailyPerformancePoint | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number>(800);

  // Sincronização direta com a coleção 'Sales' no Firestore para a empresa autenticada
  useEffect(() => {
    const empresaId = tenant?.id || currentBranch?.tenantId || 'empresa_dulci';
    setIsLoadingFirestore(true);

    const unsubscribe = financialFirestoreService.subscribeSales(empresaId, (sales) => {
      // Filtra rigorosamente apenas vendas válidas da empresa autenticada
      const validSales = (sales || []).filter(s => 
        s && 
        (s.empresaId === empresaId || !s.empresaId || empresaId === 'empresa_dulci') &&
        (Number(s.grossTotal || s.netAmount || 0) > 0)
      );
      setFirestoreSales(validSales);
      setIsLoadingFirestore(false);
    });

    return () => {
      unsubscribe();
    };
  }, [tenant?.id, currentBranch?.tenantId]);

  // Sincronização reativa quando o gestor salva metas
  useEffect(() => {
    const handleTargetsUpdated = (e: any) => {
      const updated = e?.detail || getManagerTargetsConfig();
      setMonthlyTarget((updated.dailyRevenueTarget || 0) * 30);
    };
    window.addEventListener('neon_targets_updated', handleTargetsUpdated);
    return () => window.removeEventListener('neon_targets_updated', handleTargetsUpdated);
  }, []);

  // ResizeObserver para responsividade fluida do D3
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const now = useMemo(() => new Date(), []);
  const currentDay = now.getDate();
  const daysInMonth = useMemo(() => {
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  }, [now]);

  const dailyTargetBase = useMemo(() => {
    return monthlyTarget > 0 ? monthlyTarget / daysInMonth : 0;
  }, [monthlyTarget, daysInMonth]);

  // Agrupar vendas reais por data (REGRA: Dado não cadastrado não existe. Venda não realizada não é faturamento)
  const realSalesByDate = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();

    if (isDemoMode) {
      // Em modo de demonstração explícito, lê pedidos locais concluídos/pagos
      orders.forEach(o => {
        if (o.status === 'canceled' || (o.status as string) === 'cancelled') return;
        if (o.status !== 'completed' && o.paymentStatus !== 'paid') return;
        const dateKey = o.createdAt ? o.createdAt.split('T')[0] : now.toISOString().split('T')[0];
        const prev = map.get(dateKey) || { total: 0, count: 0 };
        map.set(dateKey, {
          total: prev.total + (o.total || (o as any).totalPrice || 0),
          count: prev.count + 1
        });
      });
    } else {
      // Modo Operacional Real: Lê estritamente as vendas confirmadas no Firestore
      firestoreSales.forEach(s => {
        const dateKey = s.saleDate || (s.createdAt ? s.createdAt.split('T')[0] : now.toISOString().split('T')[0]);
        const val = Number(s.grossTotal || s.netAmount || 0);
        if (val <= 0) return;
        const prev = map.get(dateKey) || { total: 0, count: 0 };
        map.set(dateKey, {
          total: prev.total + val,
          count: prev.count + 1
        });
      });
    }

    return map;
  }, [isDemoMode, orders, firestoreSales, now]);

  // Total acumulado real de vendas no período
  const totalRealSalesCount = useMemo(() => {
    let count = 0;
    realSalesByDate.forEach(val => {
      if (val.total > 0) count += val.count;
    });
    return count;
  }, [realSalesByDate]);

  // Construir a série temporal EXCLUSIVAMENTE a partir de dados reais (sem fallbacks aleatórios)
  const performanceData = useMemo<DailyPerformancePoint[]>(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const list: DailyPerformancePoint[] = [];

    let runningActual = 0;
    let runningTarget = 0;

    const startDay = periodDays === 14 ? Math.max(1, currentDay - 13) : 1;
    const endDay = periodDays === 14 ? Math.min(daysInMonth, startDay + 13) : daysInMonth;

    let previousDaySales = 0;

    for (let d = startDay; d <= endDay; d++) {
      const dt = new Date(year, month, d);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isFuture = d > currentDay;

      const expectedDailyTarget = dailyTargetBase > 0 ? Math.round(dailyTargetBase) : 0;

      // Consulta aos dados reais persistidos da data
      const real = realSalesByDate.get(dateStr);
      const daySales = real ? real.total : 0;
      const orderCount = real ? real.count : 0;

      if (!isFuture) {
        runningActual += daySales;
      }
      runningTarget += expectedDailyTarget;

      const growthVsYesterday = previousDaySales > 0 
        ? ((daySales - previousDaySales) / previousDaySales) * 100 
        : 0;

      list.push({
        date: dt,
        dateStr,
        dayNumber: d,
        label: `${String(d).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`,
        sales: daySales,
        target: expectedDailyTarget,
        cumulativeSales: runningActual,
        cumulativeTarget: runningTarget,
        ordersCount: orderCount,
        averageTicket: orderCount > 0 ? Number((daySales / orderCount).toFixed(2)) : 0,
        growthVsYesterday: Number(growthVsYesterday.toFixed(1)),
        isFuture
      });

      if (!isFuture && daySales > 0) {
        previousDaySales = daySales;
      }
    }

    return list;
  }, [now, currentDay, daysInMonth, dailyTargetBase, realSalesByDate, periodDays]);

  // KPIs de Desempenho e Tendência Reais
  const kpis = useMemo(() => {
    const pastDays = performanceData.filter(p => !p.isFuture);
    const totalSalesMonthToDate = pastDays.reduce((acc, p) => acc + p.sales, 0);
    const targetMonthToDate = pastDays.reduce((acc, p) => acc + p.target, 0);

    const hasConfiguredTarget = monthlyTarget > 0;
    const completionPercent = hasConfiguredTarget ? (totalSalesMonthToDate / monthlyTarget) * 100 : 0;
    const targetPeriodPercent = targetMonthToDate > 0 && totalSalesMonthToDate > 0
      ? (totalSalesMonthToDate / targetMonthToDate) * 100 
      : 0;

    // Run rate projection real (somente se houver histórico de vendas reais > 0)
    const daysWithSales = pastDays.filter(p => p.sales > 0).length;
    const daysElapsed = Math.max(1, currentDay);
    const avgDailySales = totalSalesMonthToDate / daysElapsed;
    const hasEnoughDataForProjection = daysWithSales >= 2 && totalSalesMonthToDate > 0;

    const projectedMonthTotal = hasEnoughDataForProjection 
      ? Math.round(totalSalesMonthToDate + (avgDailySales * (daysInMonth - daysElapsed))) 
      : 0;

    const projectedGrowthPercent = hasConfiguredTarget && projectedMonthTotal > 0
      ? ((projectedMonthTotal - monthlyTarget) / monthlyTarget) * 100 
      : 0;

    // Comparativo real recente: semana atual vs semana anterior
    const recent7Days = pastDays.slice(-7);
    const previous7Days = pastDays.slice(-14, -7);
    const recentSum = recent7Days.reduce((acc, p) => acc + p.sales, 0);
    const prevSum = previous7Days.reduce((acc, p) => acc + p.sales, 0);
    const hasEnoughDataForTrend = prevSum > 0 && recentSum > 0;
    const wowGrowth = hasEnoughDataForTrend ? ((recentSum - prevSum) / prevSum) * 100 : 0;

    // Pico real de vendas
    const daysWithRealSales = pastDays.filter(p => p.sales > 0);
    const bestDay = daysWithRealSales.length > 0 
      ? [...daysWithRealSales].sort((a, b) => b.sales - a.sales)[0] 
      : null;

    return {
      totalSalesMonthToDate,
      hasConfiguredTarget,
      completionPercent: Number(completionPercent.toFixed(1)),
      targetPeriodPercent: Number(targetPeriodPercent.toFixed(1)),
      hasEnoughDataForProjection,
      projectedMonthTotal,
      projectedGrowthPercent: Number(projectedGrowthPercent.toFixed(1)),
      hasEnoughDataForTrend,
      wowGrowth: Number(wowGrowth.toFixed(1)),
      bestDay,
      avgDailySales: Math.round(avgDailySales)
    };
  }, [performanceData, monthlyTarget, currentDay, daysInMonth]);

  const hasAnySales = !isLoadingFirestore && kpis.totalSalesMonthToDate > 0;

  // Render D3 chart inside SVG (apenas dados reais verificados)
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || performanceData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const currentContainerWidth = containerRef.current.clientWidth || 800;
    const height = 300;
    const margin = { top: 25, right: 30, bottom: 40, left: 65 };
    const width = Math.max(320, currentContainerWidth);
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`)
       .attr('width', '100%')
       .attr('height', height);

    // Definições de Gradientes
    const defs = svg.append('defs');

    const areaGradient = defs.append('linearGradient')
      .attr('id', 'd3-sales-area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#00E676')
      .attr('stop-opacity', 0.42);

    areaGradient.append('stop')
      .attr('offset', '70%')
      .attr('stop-color', '#00E676')
      .attr('stop-opacity', 0.05);

    areaGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#00E676')
      .attr('stop-opacity', 0.0);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Escalas X e Y
    const xScale = d3.scalePoint<string>()
      .domain(performanceData.map(d => d.dateStr))
      .range([0, innerWidth])
      .padding(0.1);

    const maxSales = d3.max(performanceData, (d: DailyPerformancePoint) => viewMode === 'daily' ? d.sales : d.cumulativeSales) || 0;
    const maxTarget = d3.max(performanceData, (d: DailyPerformancePoint) => viewMode === 'daily' ? d.target : d.cumulativeTarget) || 0;
    const yMax = Math.max(100, Number(maxSales), Number(maxTarget)) * 1.15;

    const yScale = d3.scaleLinear()
      .domain([0, yMax])
      .range([innerHeight, 0])
      .nice();

    // Linhas de Grade Horizontais
    const yTicks = yScale.ticks(5);
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#1E1E2E')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3 3');

    // Eixo Y
    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d => {
        const val = Number(d);
        if (val === 0) return 'R$ 0';
        if (val >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`;
        return `R$ ${val}`;
      });

    g.append('g')
      .attr('class', 'y-axis text-[10px] font-mono text-zinc-500')
      .call(yAxis)
      .select('.domain').remove();

    g.selectAll('.y-axis text')
      .attr('fill', '#71717A')
      .attr('font-size', '10px');

    // Eixo X
    const step = Math.ceil(performanceData.length / 8);
    const tickValues = performanceData
      .filter((_, idx) => idx % step === 0 || idx === performanceData.length - 1)
      .map(d => d.dateStr);

    const xAxis = d3.axisBottom(xScale)
      .tickValues(tickValues)
      .tickFormat(d => {
        const pt = performanceData.find(p => p.dateStr === d);
        return pt ? pt.label : '';
      });

    g.append('g')
      .attr('class', 'x-axis text-[10px] font-mono text-zinc-500')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .select('.domain').attr('stroke', '#27273A');

    g.selectAll('.x-axis text')
      .attr('fill', '#71717A')
      .attr('font-size', '10px')
      .attr('dy', '12px');

    // Linha de Meta (somente se meta configurada)
    if (kpis.hasConfiguredTarget) {
      const targetLine = d3.line<DailyPerformancePoint>()
        .x(d => xScale(d.dateStr) || 0)
        .y(d => yScale(viewMode === 'daily' ? d.target : d.cumulativeTarget))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(performanceData)
        .attr('fill', 'none')
        .attr('stroke', '#FFC72C')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5 4')
        .attr('opacity', 0.8)
        .attr('d', targetLine);
    }

    // Linha e Área de Vendas Reais
    if (hasAnySales) {
      const pastData = performanceData.filter(d => !d.isFuture);

      const area = d3.area<DailyPerformancePoint>()
        .x(d => xScale(d.dateStr) || 0)
        .y0(innerHeight)
        .y1(d => yScale(viewMode === 'daily' ? d.sales : d.cumulativeSales))
        .curve(d3.curveMonotoneX);

      const line = d3.line<DailyPerformancePoint>()
        .x(d => xScale(d.dateStr) || 0)
        .y(d => yScale(viewMode === 'daily' ? d.sales : d.cumulativeSales))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(pastData)
        .attr('fill', 'url(#d3-sales-area-gradient)')
        .attr('d', area);

      g.append('path')
        .datum(pastData)
        .attr('fill', 'none')
        .attr('stroke', '#00E676')
        .attr('stroke-width', 3)
        .attr('d', line);

      // Pontos nos dias com vendas
      g.selectAll('.data-circle')
        .data(pastData.filter((d: DailyPerformancePoint) => d.sales > 0))
        .enter()
        .append('circle')
        .attr('class', 'data-circle')
        .attr('cx', (d: DailyPerformancePoint) => xScale(d.dateStr) || 0)
        .attr('cy', (d: DailyPerformancePoint) => yScale(viewMode === 'daily' ? d.sales : d.cumulativeSales))
        .attr('r', 4)
        .attr('fill', '#00E676')
        .attr('stroke', '#0E0E17')
        .attr('stroke-width', 2);
    }

    // Overlay Interativo de Hover
    const bisect = d3.bisector((d: DailyPerformancePoint) => d.dateStr).center;

    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .on('mousemove', (event) => {
        const [mx, my] = d3.pointer(event);
        const eachBand = innerWidth / (performanceData.length - 1);
        const index = Math.min(
          performanceData.length - 1, 
          Math.max(0, Math.round(mx / eachBand))
        );
        const pt = performanceData[index];
        if (pt) {
          setHoveredPoint(pt);
          const xPos = (xScale(pt.dateStr) || 0) + margin.left;
          const yPos = yScale(viewMode === 'daily' ? pt.sales : pt.cumulativeSales) + margin.top;
          setHoverPosition({ x: xPos, y: yPos });
        }
      })
      .on('mouseleave', () => {
        setHoveredPoint(null);
        setHoverPosition(null);
      });

  }, [performanceData, viewMode, hasAnySales, kpis.hasConfiguredTarget]);

  return (
    <div className="space-y-4">
      {/* Container Principal do Card */}
      <div 
        ref={containerRef}
        className="p-5 sm:p-6 rounded-3xl bg-[#12121A] border border-[#27273C] shadow-2xl space-y-6 relative overflow-hidden"
      >
        {/* Glow de Fundo Sutil */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#00E676]/10 via-[#FFC72C]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* 1. Header do Dashboard de Desempenho */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#00E676]/20 via-[#162A20] to-[#12121A] border border-[#00E676]/40 flex items-center justify-center text-[#00E676] shadow-[0_0_20px_rgba(0,230,118,0.25)] shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <span>Dashboard de Desempenho</span>
                  <span className="text-[10px] font-mono font-bold bg-[#00E676]/15 text-[#00E676] px-2 py-0.5 rounded-full border border-[#00E676]/30">
                    Dados Reais
                  </span>
                </h2>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Evolução do faturamento real vs. metas operacionais do restaurante
              </p>
            </div>
          </div>

          {/* Controles de Visualização & Filtros */}
          <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
            {/* Toggle Diário vs Acumulado */}
            <div className="flex items-center p-1 bg-[#1A1A28] border border-[#2D2D44] rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setViewMode('daily');
                  playSoftClickSound();
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'daily'
                    ? 'bg-[#00E676] text-black shadow-sm font-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Volume Diário
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('cumulative');
                  playSoftClickSound();
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'cumulative'
                    ? 'bg-[#FFC72C] text-black shadow-sm font-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Acumulado
              </button>
            </div>

            {/* Período (14d vs 30d) */}
            <div className="flex items-center p-1 bg-[#1A1A28] border border-[#2D2D44] rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setPeriodDays(14);
                  playSoftClickSound();
                }}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  periodDays === 14
                    ? 'bg-zinc-800 text-white font-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                14d
              </button>
              <button
                type="button"
                onClick={() => {
                  setPeriodDays(30);
                  playSoftClickSound();
                }}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  periodDays === 30
                    ? 'bg-zinc-800 text-white font-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Mês Inteiro
              </button>
            </div>

            {/* Botão de Ajuste Fino de Metas Operacionais */}
            <button
              type="button"
              onClick={() => {
                setIsConfigModalOpen(true);
                playSoftClickSound();
              }}
              className="px-3 py-1.5 rounded-xl bg-[#1A1A28] hover:bg-[#252538] border border-[#2D2D44] text-[#FFC72C] hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0"
              title="Configurar Metas Detalhadas do Restaurante"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{kpis.hasConfiguredTarget ? `Meta: ${formatBRL(monthlyTarget)}` : 'Definir Meta'}</span>
            </button>
          </div>
        </div>

        {/* COMPORTAMENTO CONFORME REGRA: ESTADO DE CARREGAMENTO OU ESTADO VAZIO REAL */}
        {isLoadingFirestore ? (
          /* ESTADO DE CARREGAMENTO (LOADING STATE) DO FIRESTORE */
          <div className="p-8 sm:p-12 rounded-2xl bg-[#0F0F17] border border-[#202032] text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 text-[#00E676] flex items-center justify-center mx-auto border border-zinc-700/60 shadow-lg">
              <Activity className="w-7 h-7 animate-spin text-[#00E676]" />
            </div>

            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                Consultando registros no Firestore...
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Sincronizando faturamento e vendas reais para a empresa autenticada. Aguarde um instante...
              </p>
            </div>

            <div className="w-48 h-1.5 bg-zinc-800 rounded-full mx-auto overflow-hidden">
              <div className="w-full h-full bg-gradient-to-r from-[#00E676] via-[#FFC72C] to-[#00D2FF] animate-pulse" />
            </div>
          </div>
        ) : !hasAnySales ? (
          /* ESTADO VAZIO ELEGANTE, TRANSPARENTE E TOTALMENTE LIVRE DE DADOS FICTÍCIOS */
          <div className="p-8 sm:p-12 rounded-2xl bg-[#0F0F17] border border-[#202032] text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 text-zinc-300 flex items-center justify-center mx-auto border border-zinc-700/60 shadow-lg">
              <Sparkles className="w-6 h-6 text-[#FFC72C]" />
            </div>

            <div className="space-y-2 max-w-xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-zinc-800/80 text-zinc-300 border border-zinc-700">
                <span className="w-2 h-2 rounded-full bg-[#00E676]" />
                <span>0 Vendas no Firestore • Base de Dados Limpa</span>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Nenhum faturamento registrado no Firestore para esta empresa.
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                <strong className="text-zinc-300">Regra de Integridade:</strong> Dado não cadastrado não existe. Venda não realizada não é faturamento. O sistema não projeta estimativas arbitrárias nem exibe dados fictícios. Assim que novos pedidos forem concluídos e liquidados no PDV, balcão, mesas ou delivery, o faturamento real será consolidado aqui em tempo real.
              </p>
            </div>

            {/* Mini Resumo Real Zerado (Sem Curvas Fictícias) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto pt-1">
              <div className="p-3 rounded-xl bg-black/40 border border-zinc-800 text-left">
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Realizado no Mês</span>
                <span className="text-lg font-black font-mono text-zinc-400">R$ 0,00</span>
                <p className="text-[10px] text-zinc-600 mt-0.5">Sem vendas no Firestore</p>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-zinc-800 text-left">
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Pedidos Consolidados</span>
                <span className="text-lg font-black font-mono text-zinc-400">0</span>
                <p className="text-[10px] text-zinc-600 mt-0.5">Fila zerada</p>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-zinc-800 text-left">
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Ticket Médio</span>
                <span className="text-lg font-black font-mono text-zinc-400">R$ 0,00</span>
                <p className="text-[10px] text-zinc-600 mt-0.5">Aguardando operação</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setCurrentView('pdv');
                  playBeep(800, 0.04);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#DA291C] to-[#E51A24] text-white text-xs sm:text-sm font-bold shadow-md hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#FFC72C]" />
                <span>Registrar Primeira Venda (PDV)</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setIsConfigModalOpen(true);
                  playSoftClickSound();
                }}
                className="px-4 py-2.5 rounded-xl bg-[#1C1C2A] hover:bg-[#252538] text-[#FFC72C] text-xs sm:text-sm font-bold border border-zinc-700 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Target className="w-4 h-4" />
                <span>Configurar Meta do Mês</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setCurrentView('cardapio_digital');
                  playBeep(850, 0.04);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#14141E] hover:bg-[#1C1C28] text-zinc-300 hover:text-white text-xs sm:text-sm font-medium border border-zinc-800 transition-all flex items-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-emerald-400" />
                <span>Ver Cardápio Online</span>
              </motion.button>
            </div>
          </div>
        ) : (
          <>
            {/* 2. Grid de 4 Cards de Métricas Reais */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {/* KPI 1: Realizado no Mês */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#161624] border border-[#26263A] space-y-1">
                <span className="text-[11px] font-bold text-zinc-400 block uppercase tracking-wider">
                  Realizado no Mês
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono text-[#00E676] tracking-tight">
                  {formatBRL(kpis.totalSalesMonthToDate)}
                </div>
                <div className="text-[11px] text-zinc-400">
                  {kpis.hasConfiguredTarget ? (
                    <span>
                      <strong className="text-white font-mono">{kpis.completionPercent}%</strong> da meta de {formatBRL(monthlyTarget)}
                    </span>
                  ) : (
                    <span className="text-zinc-500 italic">Nenhuma meta configurada</span>
                  )}
                </div>
              </div>

              {/* KPI 2: Desempenho no Período */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#161624] border border-[#26263A] space-y-1">
                <span className="text-[11px] font-bold text-zinc-400 block uppercase tracking-wider">
                  Desempenho no Período
                </span>
                {kpis.hasConfiguredTarget && kpis.targetPeriodPercent > 0 ? (
                  <>
                    <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight flex items-center gap-1.5 ${
                      kpis.targetPeriodPercent >= 100 ? 'text-[#00E676]' : 'text-[#FFC72C]'
                    }`}>
                      <span>{kpis.targetPeriodPercent}%</span>
                      {kpis.targetPeriodPercent >= 100 ? (
                        <ArrowUpRight className="w-4 h-4 text-[#00E676]" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-[#FFC72C]" />
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {kpis.targetPeriodPercent >= 100 ? (
                        <span className="text-emerald-400 font-semibold">Superando meta prevista</span>
                      ) : (
                        <span className="text-amber-400 font-semibold">Abaixo da cota do período</span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-semibold text-zinc-400 pt-1">
                      Dados insuficientes para calcular
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      Necessita meta e vendas comparativas
                    </div>
                  </>
                )}
              </div>

              {/* KPI 3: Projeção de Fechamento */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#161624] border border-[#26263A] space-y-1">
                <span className="text-[11px] font-bold text-zinc-400 block uppercase tracking-wider">
                  Projeção de Fechamento
                </span>
                {kpis.hasEnoughDataForProjection ? (
                  <>
                    <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
                      {formatBRL(kpis.projectedMonthTotal)}
                    </div>
                    <div className="flex items-center gap-1 text-[11px]">
                      {kpis.hasConfiguredTarget ? (
                        <>
                          <span className={`font-bold font-mono ${kpis.projectedGrowthPercent >= 0 ? 'text-[#00E676]' : 'text-rose-400'}`}>
                            {kpis.projectedGrowthPercent >= 0 ? `+${kpis.projectedGrowthPercent}%` : `${kpis.projectedGrowthPercent}%`}
                          </span>
                          <span className="text-zinc-400">vs meta mensal</span>
                        </>
                      ) : (
                        <span className="text-zinc-500">Projeção por ritmo diário</span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs font-medium text-zinc-400 pt-1">
                      Projeção disponível após o registro de vendas suficientes
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      Requer histórico mínimo de 2 dias
                    </div>
                  </>
                )}
              </div>

              {/* KPI 4: Tendência Semanal */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#161624] border border-[#26263A] space-y-1">
                <span className="text-[11px] font-bold text-zinc-400 block uppercase tracking-wider">
                  Tendência Semanal
                </span>
                {kpis.hasEnoughDataForTrend ? (
                  <>
                    <div className="text-xl sm:text-2xl font-black font-mono text-[#00D2FF] tracking-tight flex items-center gap-1">
                      <span>{kpis.wowGrowth >= 0 ? `+${kpis.wowGrowth}%` : `${kpis.wowGrowth}%`}</span>
                      <Sparkles className="w-4 h-4 text-[#00D2FF]" />
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      Pico: <strong className="text-white font-mono">{formatBRL(kpis.bestDay?.sales || 0)}</strong> ({kpis.bestDay?.label})
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs font-medium text-zinc-400 pt-1">
                      A tendência será exibida após o registro de movimentações
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {kpis.bestDay && kpis.bestDay.sales > 0 
                        ? `Pico atual: ${formatBRL(kpis.bestDay.sales)}` 
                        : 'Aguardando comparativo semanal'}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 3. Área do Gráfico D3.js */}
            <div className="relative pt-2">
              <div className="flex items-center justify-between text-xs pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#00E676] shadow-[0_0_8px_rgba(0,230,118,0.6)]" />
                    <span className="text-white">
                      {viewMode === 'daily' ? 'Vendas Diárias' : 'Vendas Acumuladas'}
                    </span>
                  </div>
                  {kpis.hasConfiguredTarget && (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-0.5 border-t-2 border-dashed border-[#FFC72C]" />
                      <span className="text-[#FFC72C]">
                        {viewMode === 'daily' ? 'Meta do Dia' : 'Meta Mensal'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-zinc-400 font-mono hidden sm:block">
                  Curva: <span className="text-zinc-300">d3.curveMonotoneX (Dados Reais)</span>
                </div>
              </div>

              {/* SVG Canvas D3 */}
              <div className="w-full overflow-hidden rounded-2xl bg-[#0E0E17] border border-[#202030] p-1 sm:p-2">
                <svg ref={svgRef} className="w-full overflow-visible select-none" />
              </div>

              {/* Tooltip Dinâmico do D3 */}
              {hoveredPoint && hoverPosition && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-20 pointer-events-none p-3 rounded-2xl bg-[#161624] border border-[#2E2E44] shadow-2xl text-xs space-y-1.5 w-52"
                  style={{
                    left: Math.min(hoverPosition.x + 12, (containerRef.current?.clientWidth || 800) - 220),
                    top: Math.max(30, hoverPosition.y - 70),
                  }}
                >
                  <div className="flex items-center justify-between border-b border-[#2A2A3E] pb-1 font-mono">
                    <span className="text-white font-bold">{hoveredPoint.label}</span>
                    <span className="text-zinc-400 text-[10px]">
                      {hoveredPoint.isFuture ? 'Dia Futuro' : 'Consolidado'}
                    </span>
                  </div>

                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Vendas:</span>
                      <span className="text-[#00E676] font-black text-xs">
                        {formatBRL(viewMode === 'daily' ? hoveredPoint.sales : hoveredPoint.cumulativeSales)}
                      </span>
                    </div>

                    {kpis.hasConfiguredTarget && (
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">Meta:</span>
                        <span className="text-[#FFC72C] font-bold">
                          {formatBRL(viewMode === 'daily' ? hoveredPoint.target : hoveredPoint.cumulativeTarget)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-[10px] text-zinc-400">
                      <span>Volume:</span>
                      <span className="text-white">{hoveredPoint.ordersCount} pedidos ({formatBRL(hoveredPoint.averageTicket)} méd.)</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* 4. Barra de Progresso da Meta Mensal */}
            {kpis.hasConfiguredTarget ? (
              <div className="p-3.5 rounded-2xl bg-[#141422] border border-[#242436] space-y-2">
                <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#FFC72C]" />
                    <span className="text-white font-bold">Progresso da Meta Mensal:</span>
                    <span className="text-[#00E676] font-mono font-black">{formatBRL(kpis.totalSalesMonthToDate)}</span>
                    <span className="text-zinc-400">de</span>
                    <span className="text-[#FFC72C] font-mono font-bold">{formatBRL(monthlyTarget)}</span>
                  </div>
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30">
                    {kpis.completionPercent}% Concluído
                  </span>
                </div>

                <div className="w-full h-3 rounded-full bg-[#1F1F30] overflow-hidden p-0.5 border border-[#2E2E44]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, kpis.completionPercent)}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-[#00E676] via-[#FFC72C] to-[#00D2FF] shadow-[0_0_12px_rgba(0,230,118,0.5)]"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-[#141422] border border-[#242436] flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Target className="w-4 h-4 text-[#FFC72C]" />
                  <span>Nenhuma meta mensal configurada para este estabelecimento.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[#FFC72C] font-bold text-xs cursor-pointer border border-zinc-700 transition-all"
                >
                  Definir Meta
                </button>
              </div>
            )}
          </>
        )}

      </div>

      {/* Modal de Configuração de Metas */}
      <ConfigMetasModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        currentDailyNet={kpis.avgDailySales}
        onTargetsSaved={(newConfig) => {
          setMonthlyTarget((newConfig.dailyRevenueTarget || 0) * 30);
        }}
      />
    </div>
  );
};
