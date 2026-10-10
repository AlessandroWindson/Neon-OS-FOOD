/**
 * Módulo de Geolocalização e Cálculo Automático de Taxas de Entrega (Delivery)
 * Neon Food - Sistema de Restaurantes, Hamburguerias & Pizzarias
 */

import { TenantSettings } from '../types';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DeliveryZone {
  id: string;
  name: string;
  minKm: number;
  maxKm: number;
  baseFee: number;
  estimatedMinutes: string;
  color: string;
  badgeBg: string;
  description: string;
}

export interface DeliveryCalculationResult {
  distanceKm: number;
  isDeliverable: boolean;
  deliveryFee: number;
  isFreeDelivery: boolean;
  freeDeliveryThreshold?: number;
  estimatedMinutesMin: number;
  estimatedMinutesMax: number;
  zone: DeliveryZone;
  origin: Coordinates;
  destination: Coordinates;
  breakdown: {
    baseFee: number;
    extraKmFee: number;
    extraKmCount: number;
    freeDeliveryDiscount: number;
    subtotal: number;
  };
}

// Coordenadas padrão da Lanchonete Dulci (Manaus - Amazonas - Brasil)
export const DEFAULT_STORE_COORDS: Coordinates = {
  lat: -3.0910,
  lng: -60.0210,
};

export const DEFAULT_STORE_ADDRESS = 'Av. Constantino Nery, Flores / Adrianópolis - Manaus - AM';

// Zonas padrão de entrega por raio em Manaus - AM
export const DEFAULT_DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: 'zone_express',
    name: 'Zona 1: Raio Expresso Manaus (0 a 3 km)',
    minKm: 0,
    maxKm: 3.0,
    baseFee: 6.00,
    estimatedMinutes: '20 - 30 min',
    color: '#00E676', // Matrix Green
    badgeBg: 'bg-[#00E676]/15 border-[#00E676]/40 text-[#00E676]',
    description: 'Adrianópolis, Vieiralves, Flores, Parque 10, Chapada',
  },
  {
    id: 'zone_intermediaria',
    name: 'Zona 2: Raio Médio Manaus (3 a 6 km)',
    minKm: 3.0,
    maxKm: 6.0,
    baseFee: 9.00,
    estimatedMinutes: '30 - 45 min',
    color: '#FFC72C', // Dulci Gold
    badgeBg: 'bg-[#FFC72C]/15 border-[#FFC72C]/40 text-[#FFC72C]',
    description: 'Centro, Aleixo, Dom Pedro, São Geraldo, Cachoeirinha, São Francisco',
  },
  {
    id: 'zone_expandida',
    name: 'Zona 3: Raio Expandido Manaus (6 a 10 km)',
    minKm: 6.0,
    maxKm: 10.0,
    baseFee: 14.00,
    estimatedMinutes: '40 - 55 min',
    color: '#FF7A00', // Dulci Orange
    badgeBg: 'bg-[#FF7A00]/15 border-[#FF7A00]/40 text-[#FF7A00]',
    description: 'Ponta Negra, Alvorada, Compensa, Coroado, Japiim, Santo Antônio',
  },
  {
    id: 'zone_limite',
    name: 'Zona 4: Raio Limite Manaus (10 a 15 km)',
    minKm: 10.0,
    maxKm: 15.0,
    baseFee: 19.00,
    estimatedMinutes: '50 - 65 min',
    color: '#DA291C', // Dulci Red
    badgeBg: 'bg-[#DA291C]/15 border-[#DA291C]/40 text-[#FF4D4D]',
    description: 'Cidade Nova, Tarumã, Nova Cidade, Colônia Terra Nova, Distrito Industrial',
  },
];

/**
 * Fórmula de Haversine para calcular a distância geodésica em quilômetros
 * entre dois pares de coordenadas (Latitude / Longitude).
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // Raio médio da Terra em km

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const rawKm = R * c;

  // Multiplicador de rota urbana real (fator de curvatura de ruas, ~1.25x linha reta)
  const urbanRoadFactor = 1.25;
  const estimatedRoadKm = rawKm * urbanRoadFactor;

  return Math.round(estimatedRoadKm * 10) / 10;
}

/**
 * Calcula a taxa de entrega automática baseada nas configurações do restaurante
 * e na distância do cliente.
 */
export function calculateDeliveryFeeByLocation(
  clientCoords: Coordinates,
  settings?: TenantSettings,
  orderSubtotal: number = 0,
  storeCoords: Coordinates = DEFAULT_STORE_COORDS
): DeliveryCalculationResult {
  const distanceKm = calculateDistanceKm(
    storeCoords.lat,
    storeCoords.lng,
    clientCoords.lat,
    clientCoords.lng
  );

  const baseRadiusKm = settings?.deliveryBaseRadiusKm ?? 3.0;
  const baseFee = settings?.deliveryBaseFee ?? 6.00;
  const feePerKm = settings?.deliveryFeePerKm ?? 1.80;
  const maxRadiusKm = settings?.deliveryMaxRadiusKm ?? 15.0;
  const freeDeliveryOver = settings?.freeDeliveryOver ?? 120.00;

  const isDeliverable = distanceKm <= maxRadiusKm;

  // Encontrar a zona correspondente
  const matchedZone =
    DEFAULT_DELIVERY_ZONES.find(
      (z) => distanceKm >= z.minKm && distanceKm <= z.maxKm
    ) ||
    DEFAULT_DELIVERY_ZONES[DEFAULT_DELIVERY_ZONES.length - 1];

  let rawFee = baseFee;
  let extraKmCount = 0;
  let extraKmFee = 0;

  if (distanceKm > baseRadiusKm) {
    extraKmCount = Math.round((distanceKm - baseRadiusKm) * 10) / 10;
    extraKmFee = Math.round(extraKmCount * feePerKm * 100) / 100;
    rawFee += extraKmFee;
  }

  // Verifica se o subtotal qualifica para frete grátis
  const isFreeDelivery = freeDeliveryOver > 0 && orderSubtotal >= freeDeliveryOver;
  const finalFee = isFreeDelivery ? 0 : Math.round(rawFee * 100) / 100;

  // Tempo estimado de entrega: 15 min preparo base + ~3.2 min por km de trânsito
  const estimatedTransitMin = Math.round(distanceKm * 3.2);
  const estimatedMinutesMin = Math.max(15, 12 + estimatedTransitMin);
  const estimatedMinutesMax = Math.max(25, 20 + estimatedTransitMin);

  return {
    distanceKm,
    isDeliverable,
    deliveryFee: finalFee,
    isFreeDelivery,
    freeDeliveryThreshold: freeDeliveryOver,
    estimatedMinutesMin,
    estimatedMinutesMax,
    zone: matchedZone,
    origin: storeCoords,
    destination: clientCoords,
    breakdown: {
      baseFee,
      extraKmFee,
      extraKmCount,
      freeDeliveryDiscount: isFreeDelivery ? rawFee : 0,
      subtotal: orderSubtotal,
    },
  };
}

/**
 * Captura as coordenadas do cliente em tempo real utilizando a API nativa do navegador
 */
export function requestCurrentBrowserLocation(): Promise<{
  coords: Coordinates;
  accuracy: number;
}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não é suportada neste navegador.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          coords: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  });
}

/**
 * Simula a interpolação suave da posição do entregador em direção ao destino
 */
export function interpolateDriverPosition(
  current: Coordinates,
  target: Coordinates,
  stepFactor: number = 0.05
): { nextCoords: Coordinates; isArrived: boolean } {
  const dLat = target.lat - current.lat;
  const dLng = target.lng - current.lng;
  const dist = Math.sqrt(dLat * dLat + dLng * dLng);

  if (dist < 0.0003) {
    return {
      nextCoords: target,
      isArrived: true,
    };
  }

  return {
    nextCoords: {
      lat: current.lat + dLat * stepFactor,
      lng: current.lng + dLng * stepFactor,
    },
    isArrived: false,
  };
}

/**
 * Bairros de referência em Manaus - Amazonas para simulação e teste de cálculo de taxa
 */
export const PRESET_DELIVERY_LOCATIONS: {
  name: string;
  address: string;
  coords: Coordinates;
}[] = [
  {
    name: 'Adrianópolis / Vieiralves (1.5 km)',
    address: 'Rua Salvador, 440 - Adrianópolis, Manaus - AM',
    coords: { lat: -3.1050, lng: -60.0130 },
  },
  {
    name: 'Flores / Parque 10 (2.2 km)',
    address: 'Av. Nilton Lins, 1200 - Flores, Manaus - AM',
    coords: { lat: -3.0780, lng: -60.0240 },
  },
  {
    name: 'Chapada / Amazonas Shopping (1.8 km)',
    address: 'Av. Djalma Batista, 482 - Chapada, Manaus - AM',
    coords: { lat: -3.0960, lng: -60.0260 },
  },
  {
    name: 'Centro Histórico / Teatro Amazonas (4.2 km)',
    address: 'Largo de São Sebastião - Centro, Manaus - AM',
    coords: { lat: -3.1302, lng: -60.0234 },
  },
  {
    name: 'Ponta Negra / Orla do Rio Negro (7.5 km)',
    address: 'Av. Coronel Teixeira, 1320 - Ponta Negra, Manaus - AM',
    coords: { lat: -3.0620, lng: -60.0780 },
  },
  {
    name: 'Aleixo / Ephigênio Salles (3.8 km)',
    address: 'Av. Ephigênio Salles, 1500 - Aleixo, Manaus - AM',
    coords: { lat: -3.0920, lng: -59.9920 },
  },
  {
    name: 'Dom Pedro / Arena da Amazônia (2.8 km)',
    address: 'Av. Constantino Nery - Dom Pedro, Manaus - AM',
    coords: { lat: -3.0830, lng: -60.0280 },
  },
  {
    name: 'Compensa / Av. Brasil (5.2 km)',
    address: 'Av. Brasil, 800 - Compensa, Manaus - AM',
    coords: { lat: -3.1110, lng: -60.0520 },
  },
  {
    name: 'Alvorada / Zona Centro-Oeste (4.5 km)',
    address: 'Av. Desembargador João Machado - Alvorada, Manaus - AM',
    coords: { lat: -3.0780, lng: -60.0450 },
  },
  {
    name: 'Cidade Nova / Zona Norte (9.0 km)',
    address: 'Av. Noel Nutels, 1400 - Cidade Nova, Manaus - AM',
    coords: { lat: -3.0320, lng: -59.9880 },
  },
];
