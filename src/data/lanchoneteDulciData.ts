import { Product, ProductCategory, Order } from '../types';

/**
 * Categorias Oficiais da Lanchonete Dulci (Manaus - AM)
 * Inspiradas na identidade fast-food moderna de alta conversão
 */
export const DULCI_CATEGORIES: ProductCategory[] = [
  {
    id: 'cat_promocoes_dulci',
    name: '🔥 Ofertas & Promoções',
    icon: 'Flame',
    order: 1,
    imageUrl: '/images/x-salada-dulci.jpg',
    description: 'Combos exclusivos com super desconto e economia garantida para você e sua galera.',
    colorGradient: 'from-[#DA291C] to-[#FFC72C]',
    badge: '🔥 Destaque Máximo',
    startingPrice: 25.00,
    popularTag: 'Melhor Custo-Benefício'
  },
  {
    id: 'cat_lanches_dulci',
    name: '🍔 X-Saladas & Lanches',
    icon: 'Flame',
    order: 2,
    imageUrl: '/images/x-salada-dulci.jpg',
    description: 'Pão brioche macio tostado na manteiga com ovo, queijo derretido e hambúrguer no ponto.',
    colorGradient: 'from-[#DA291C] to-[#E53E3E]',
    badge: '🍔 Pão Brioche',
    startingPrice: 9.00,
    popularTag: 'Mais Vendidos de Manaus'
  },
  {
    id: 'cat_mistos_dulci',
    name: '🥪 Mistos Quentes',
    icon: 'Sandwich',
    order: 3,
    imageUrl: '/images/misto-quente-chapa.jpg',
    description: 'Pão de forma tostado na chapa com fartura de queijo derretido e presunto saboroso.',
    colorGradient: 'from-[#D97706] to-[#F59E0B]',
    badge: '🥪 Tostadinho na Chapa',
    startingPrice: 6.00,
    popularTag: 'Lanche Rápido'
  },
  {
    id: 'cat_pasteis_dulci',
    name: '🥟 Pastéis Crocantes',
    icon: 'Sparkles',
    order: 4,
    imageUrl: '/images/pastel-frito-crocante.jpg',
    description: 'Massa caseira dourada e sequinha, frita na hora com recheios generosos por apenas R$ 6,00.',
    colorGradient: 'from-[#F59E0B] to-[#FFC72C]',
    badge: '🥟 Frito na Hora',
    startingPrice: 6.00,
    popularTag: 'Super Crocante'
  },
  {
    id: 'cat_acompanhamentos_dulci',
    name: '🍟 Acompanhamentos',
    icon: 'Soup',
    order: 5,
    imageUrl: '/images/batata-frita-dulci.jpg',
    description: 'Batatas fritas sequinhas, crocantes por fora e macias por dentro nas versões 200g e 400g.',
    colorGradient: 'from-[#EA580C] to-[#F97316]',
    badge: '🍟 Irresistível',
    startingPrice: 10.00,
    popularTag: 'Combina com Tudo'
  },
  {
    id: 'cat_pizzas_dulci',
    name: '🍕 Pizzas da Dulci',
    icon: 'UtensilsCrossed',
    order: 6,
    imageUrl: '/images/pizza-tradicional-dulci.jpg',
    description: 'Massa crocante artesanal, molho de tomate temperado e queijo muçarela abundante nos tamanhos M e G.',
    colorGradient: 'from-[#DC2626] to-[#EA580C]',
    badge: '🍕 Massa Crocante',
    startingPrice: 30.00,
    popularTag: 'Média e Grande'
  },
  {
    id: 'cat_refrigerantes_dulci',
    name: '🥤 Refrigerantes',
    icon: 'Beer',
    order: 7,
    imageUrl: '/images/guarana-bare-gelado.jpg',
    description: 'Refrigerantes nacionais e o consagrado sabor regional do Guaraná Baré, Tuchaua e Teté Cola.',
    colorGradient: 'from-[#B91C1C] to-[#DA291C]',
    badge: '🥤 Trincando de Gelado',
    startingPrice: 6.00,
    popularTag: 'Sabor do Amazonas'
  },
  {
    id: 'cat_sucos_dulci',
    name: '🧃 Sucos Naturais',
    icon: 'Heart',
    order: 8,
    imageUrl: '/images/suco-natural-amazonia.jpg',
    description: 'Sucos naturais da fruta batidos na hora com muito gelo: Goiaba, Acerola, Maracujá e Graviola.',
    colorGradient: 'from-[#059669] to-[#10B981]',
    badge: '🌿 100% Natural',
    startingPrice: 5.00,
    popularTag: 'Puro Frescor'
  },
  {
    id: 'cat_combos_dulci',
    name: '⭐ Combos com Refrigerante',
    icon: 'Flame',
    order: 9,
    imageUrl: '/images/combo-dulci-bare.jpg',
    description: 'Combinações com múltiplos X-Saladas e garrafas de Guaraná Baré, Regente ou Coca-Cola 1L a 1,5L.',
    colorGradient: 'from-[#DA291C] to-[#FFC72C]',
    badge: '⭐ Combos da Galera',
    startingPrice: 30.00,
    popularTag: 'Economia Coletiva'
  }
];

/**
 * Produtos Oficiais da Lanchonete Dulci (Manaus - AM)
 * Transcrição fiel dos produtos e valores constantes nas 3 imagens do cardápio físico.
 */
export const DULCI_PRODUCTS: Product[] = [
  // ==========================================
  // 1. PROMOÇÕES & OFERTAS DA DULCI (Imagem 2 e 3)
  // ==========================================
  {
    id: 'dulci_promo_01',
    itemNumber: 'P01',
    name: '3 X-Saladas (Oferta da Casa)',
    description: 'Trio campeão da casa: 3 X-Saladas caprichados no pão brioche com ovo, queijo e hambúrguer.',
    category: 'cat_promocoes_dulci',
    price: 25.00,
    badgeText: 'OFERTA DA CASA',
    tags: ['De R$ 27 por R$ 25', 'Economia R$ 2,00', 'Mais Pedido'],
    costPrice: 9.80,
    marginPercent: 60.8,
    imageUrl: '/images/x-salada-dulci.jpg',
    available: true,
    trackStock: true,
    station: 'grill',
    salesVolume30Days: 420,
    bcgClassification: 'star',
    options: [
      {
        groupName: 'Observações do Preparo',
        required: false,
        max: 3,
        items: [
          { name: 'Sem Salada (Alface/Tomate)', price: 0 },
          { name: 'Sem Maionese', price: 0 },
          { name: 'Gema Bem Passada', price: 0 }
        ]
      }
    ]
  },
  {
    id: 'dulci_promo_02',
    itemNumber: 'P02',
    name: 'Combo Família: 3 X-Saladas + Coca-Cola 1L',
    description: '3 X-Saladas no pão brioche com ovo e queijo derretido + 1 garrafa de Coca-Cola 1 Litro bem gelada.',
    category: 'cat_promocoes_dulci',
    price: 34.00,
    badgeText: 'COMBO FAMÍLIA',
    tags: ['Combo Completo', 'Coca-Cola 1L Inclusa'],
    costPrice: 14.50,
    marginPercent: 57.3,
    imageUrl: '/images/combo-dulci-coca.jpg',
    available: true,
    trackStock: true,
    station: 'grill',
    salesVolume30Days: 310,
    bcgClassification: 'star'
  },
  {
    id: 'dulci_promo_03',
    itemNumber: 'P03',
    name: 'Combo Econômico: 3 X-Saladas + Baré 1L',
    description: '3 X-Saladas completos no capricho + 1 garrafa do autêntico Guaraná Baré 1 Litro trincando de gelado.',
    category: 'cat_promocoes_dulci',
    price: 32.00,
    badgeText: 'COMBO ECONÔMICO',
    tags: ['Guaraná Baré 1L', 'Tradição Manauara'],
    costPrice: 13.20,
    marginPercent: 58.7,
    imageUrl: '/images/combo-dulci-bare.jpg',
    available: true,
    trackStock: true,
    station: 'grill',
    salesVolume30Days: 295,
    bcgClassification: 'star'
  },
  {
    id: 'dulci_promo_04',
    itemNumber: 'P04',
    name: 'Combo Maior Economia: 3 X-Saladas + Regente 1L',
    description: '3 X-Saladas artesanais no pão brioche + 1 garrafa de Guaraná Regente 1 Litro geladíssimo.',
    category: 'cat_promocoes_dulci',
    price: 30.00,
    badgeText: 'MAIOR ECONOMIA',
    tags: ['Guaraná Regente 1L', 'Preço Campeão'],
    costPrice: 12.00,
    marginPercent: 60.0,
    imageUrl: '/images/combo-dulci-regente.jpg',
    available: true,
    trackStock: true,
    station: 'grill',
    salesVolume30Days: 280,
    bcgClassification: 'cash_cow'
  },
  {
    id: 'dulci_promo_05',
    itemNumber: 'P05',
    name: 'Combo Galera: 4 X-Saladas + Regente 1,5L',
    description: 'Banquete para compartilhar: 4 X-Saladas suculentos + 1 garrafa de Guaraná Regente 1,5 Litros.',
    category: 'cat_promocoes_dulci',
    price: 40.00,
    badgeText: 'COMBO PARA A GALERA',
    tags: ['4 Lanches', 'Regente 1,5L', 'Mata a Fome da Galera'],
    costPrice: 16.50,
    marginPercent: 58.7,
    imageUrl: '/images/combo-dulci-regente.jpg',
    available: true,
    trackStock: true,
    station: 'grill',
    salesVolume30Days: 340,
    bcgClassification: 'star'
  },

  // ==========================================
  // 2. LANCHES NO PÃO BRIOCHE (Imagem 2)
  // ==========================================
  {
    id: 'dulci_lanche_xsalada',
    itemNumber: '01',
    name: 'X-Salada',
    description: 'Pão brioche, hambúrguer, ovo, queijo, presunto, alface e tomate frescos.',
    category: 'cat_lanches_dulci',
    price: 9.00,
    badgeText: 'Mais Pedido',
    tags: ['Pão Brioche', 'Ovo & Queijo', 'Clássico'],
    costPrice: 3.40,
    marginPercent: 62.2,
    imageUrl: '/images/x-salada-dulci.jpg',
    available: true,
    trackStock: true,
    station: 'grill',
    salesVolume30Days: 850,
    bcgClassification: 'star',
    options: [
      {
        groupName: 'Adicionais & Turbinar',
        required: false,
        max: 4,
        items: [
          { name: '+Bacon Crocante', price: 5.00 },
          { name: '+Calabresa Fatiada', price: 5.00 },
          { name: '+Banana Frita', price: 5.00 },
          { name: '+Queijo Extra Derretido', price: 3.50 }
        ]
      }
    ]
  },
  {
    id: 'dulci_lanche_xtudo',
    itemNumber: '02',
    name: 'X-Tudo',
    description: 'Pão brioche, hambúrguer, ovo, queijo, presunto, bacon, calabresa, salsicha, tomate e alface.',
    category: 'cat_lanches_dulci',
    price: 18.00,
    badgeText: 'Gigante da Dulci',
    tags: ['Bacon', 'Calabresa', 'Salsicha', 'Mega Lanche'],
    costPrice: 7.10,
    marginPercent: 60.5,
    imageUrl: '/images/x-tudo-gigante-dulci.jpg',
    available: true,
    trackStock: true,
    station: 'grill',
    salesVolume30Days: 620,
    bcgClassification: 'star'
  },
  {
    id: 'dulci_lanche_xbacon',
    itemNumber: '03',
    name: 'X-Bacon',
    description: 'Pão brioche, hambúrguer, ovo, queijo, presunto, bacon crocante, alface e tomate.',
    category: 'cat_lanches_dulci',
    price: 14.00,
    badgeText: 'Bacon Crocante',
    tags: ['Pão Brioche', 'Bacon Fatiado', 'Suculento'],
    costPrice: 5.30,
    marginPercent: 62.1,
    imageUrl: '/images/x-tudo-gigante-dulci.jpg',
    available: true,
    trackStock: true,
    station: 'grill',
    salesVolume30Days: 450,
    bcgClassification: 'star'
  },
  {
    id: 'dulci_lanche_xcalabresa',
    itemNumber: '04',
    name: 'X-Calabresa',
    description: 'Pão brioche, hambúrguer, ovo, queijo, presunto, calabresa dourada na chapa, alface e tomate.',
    category: 'cat_lanches_dulci',
    price: 14.00,
    badgeText: 'Calabresa na Chapa',
    tags: ['Pão Brioche', 'Calabresa', 'Saboroso'],
    costPrice: 5.10,
    marginPercent: 63.5,
    imageUrl: '/images/x-tudo-gigante-dulci.jpg',
    available: true,
    trackStock: true,
    station: 'grill',
    salesVolume30Days: 390,
    bcgClassification: 'cash_cow'
  },
  {
    id: 'dulci_lanche_xsalsicha',
    itemNumber: '05',
    name: 'X-Salsicha',
    description: 'Pão brioche, hambúrguer, ovo, queijo, presunto, salsicha na chapa, alface e tomate.',
    category: 'cat_lanches_dulci',
    price: 13.00,
    badgeText: 'Tradicional',
    tags: ['Pão Brioche', 'Salsicha Fatiada', 'Queijo derretido'],
    costPrice: 4.60,
    marginPercent: 64.6,
    imageUrl: '/images/x-tudo-gigante-dulci.jpg',
    available: true,
    trackStock: true,
    station: 'grill',
    salesVolume30Days: 230,
    bcgClassification: 'cash_cow'
  },
  {
    id: 'dulci_lanche_xbanana',
    itemNumber: '06',
    name: 'X-Banana',
    description: 'Pão brioche, hambúrguer, ovo, queijo, presunto, banana frita docinha, alface e tomate.',
    category: 'cat_lanches_dulci',
    badgeText: '⭐ Especial Manauara',
    tags: ['Banana Frita', 'Regional do Norte', 'Exclusivo'],
    price: 14.00,
    costPrice: 4.80,
    marginPercent: 65.7,
    imageUrl: '/images/x-caboquinho-manaus.jpg',
    available: true,
    trackStock: true,
    station: 'grill',
    salesVolume30Days: 480,
    bcgClassification: 'star'
  },

  // ==========================================
  // 3. MISTOS QUENTES NA CHAPA (Imagem 2)
  // ==========================================
  {
    id: 'dulci_misto_simples',
    itemNumber: '07',
    name: 'Misto Simples',
    description: 'Pão de forma tostado com queijo derretido e presunto fatiado.',
    category: 'cat_mistos_dulci',
    price: 6.00,
    badgeText: 'Econômico',
    tags: ['Pão de Forma', 'Tostado na Manteiga'],
    costPrice: 2.10,
    marginPercent: 65.0,
    imageUrl: '/images/misto-quente-chapa.jpg',
    available: true,
    trackStock: true,
    station: 'grill',
    salesVolume30Days: 310,
    bcgClassification: 'cash_cow'
  },
  {
    id: 'dulci_misto_duplo',
    itemNumber: '08',
    name: 'Misto Duplo',
    description: 'Pão de forma tostado com 2 fatias de queijo e 2 fatias de presunto no capricho.',
    category: 'cat_mistos_dulci',
    price: 12.00,
    badgeText: 'Dobro de Recheio',
    tags: ['2 Queijos', '2 Presuntos', 'Super Recheado'],
    costPrice: 4.20,
    marginPercent: 65.0,
    imageUrl: '/images/misto-quente-chapa.jpg',
    available: true,
    trackStock: true,
    station: 'grill',
    salesVolume30Days: 260,
    bcgClassification: 'cash_cow'
  },

  // ==========================================
  // 4. PASTÉIS CROCANTES (Imagem 2)
  // ==========================================
  {
    id: 'dulci_pastel_queijo',
    itemNumber: '09',
    name: 'Pastel de Queijo',
    description: 'Crocante por fora e recheado com queijo muçarela derretido puxento.',
    category: 'cat_pasteis_dulci',
    price: 6.00,
    badgeText: 'Frito na Hora',
    tags: ['Massa Crocante', 'Queijo Derretido'],
    costPrice: 2.00,
    marginPercent: 66.7,
    imageUrl: '/images/pastel-frito-crocante.jpg',
    available: true,
    trackStock: true,
    station: 'fryer',
    salesVolume30Days: 410,
    bcgClassification: 'star'
  },
  {
    id: 'dulci_pastel_misto',
    itemNumber: '10',
    name: 'Pastel Misto',
    description: 'Combinação clássica de queijo e presunto em massa sequinha e estaladiça.',
    category: 'cat_pasteis_dulci',
    price: 6.00,
    badgeText: 'Clássico',
    tags: ['Presunto & Queijo', 'Crocante'],
    costPrice: 2.10,
    marginPercent: 65.0,
    imageUrl: '/images/pastel-frito-crocante.jpg',
    available: true,
    trackStock: true,
    station: 'fryer',
    salesVolume30Days: 380,
    bcgClassification: 'cash_cow'
  },
  {
    id: 'dulci_pastel_pizza',
    itemNumber: '11',
    name: 'Pastel Pizza',
    description: 'Um sabor inspirado na pizza em um pastel crocante com queijo, presunto e orégano.',
    category: 'cat_pasteis_dulci',
    price: 6.00,
    badgeText: 'Sabor Pizza',
    tags: ['Orégano', 'Queijo & Presunto'],
    costPrice: 2.15,
    marginPercent: 64.2,
    imageUrl: '/images/pastel-frito-crocante.jpg',
    available: true,
    trackStock: true,
    station: 'fryer',
    salesVolume30Days: 350,
    bcgClassification: 'cash_cow'
  },
  {
    id: 'dulci_pastel_queijo_banana',
    itemNumber: '12',
    name: 'Pastel de Queijo com Banana',
    description: 'Contraste irresistível entre queijo derretido e banana frita, sabor típico do Amazonas.',
    category: 'cat_pasteis_dulci',
    price: 6.00,
    badgeText: '⭐ Especialidade AM',
    tags: ['Banana Frita', 'Queijo', 'Doce & Salgado'],
    costPrice: 2.10,
    marginPercent: 65.0,
    imageUrl: '/images/pastel-frito-crocante.jpg',
    available: true,
    trackStock: true,
    station: 'fryer',
    salesVolume30Days: 430,
    bcgClassification: 'star'
  },

  // ==========================================
  // 5. ACOMPANHAMENTOS (Imagem 3)
  // ==========================================
  {
    id: 'dulci_batata_p',
    itemNumber: '13',
    name: 'Batata Frita P – 200g',
    description: 'Porção crocante e sequinha de 200g para acompanhar com perfeição seu lanche.',
    category: 'cat_acompanhamentos_dulci',
    price: 10.00,
    badgeText: '200 Gramas',
    tags: ['Crocante', 'Porção Individual'],
    costPrice: 3.20,
    marginPercent: 68.0,
    imageUrl: '/images/batata-frita-dulci.jpg',
    available: true,
    trackStock: true,
    station: 'fryer',
    salesVolume30Days: 520,
    bcgClassification: 'star'
  },
  {
    id: 'dulci_batata_g',
    itemNumber: '14',
    name: 'Batata Frita G – 400g',
    description: 'Porção grande de 400g frita na hora, ideal para compartilhar com os amigos.',
    category: 'cat_acompanhamentos_dulci',
    price: 20.00,
    badgeText: '400 Gramas (Família)',
    tags: ['Para Compartilhar', 'Super Crocante'],
    costPrice: 6.00,
    marginPercent: 70.0,
    imageUrl: '/images/batata-frita-dulci.jpg',
    available: true,
    trackStock: true,
    station: 'fryer',
    salesVolume30Days: 390,
    bcgClassification: 'star'
  },

  // ==========================================
  // 6. PIZZAS DA DULCI (Imagem 1 - Média e Grande)
  // ==========================================
  {
    id: 'dulci_pizza_marguerita',
    itemNumber: '15',
    name: 'Pizza Marguerita',
    description: 'Massa crocante, muçarela, molho de tomate artesanal e manjericão fresco aromático.',
    category: 'cat_pizzas_dulci',
    price: 30.00,
    priceVariants: [
      { label: 'Média (M)', price: 30.00, costPrice: 9.80 },
      { label: 'Grande (G)', price: 40.00, costPrice: 12.80 }
    ],
    badgeText: 'Média R$ 30 | Grande R$ 40',
    tags: ['Manjericão Fresco', 'Massa Crocante'],
    costPrice: 9.80,
    marginPercent: 67.3,
    imageUrl: '/images/pizza-tradicional-dulci.jpg',
    available: true,
    trackStock: true,
    station: 'grill',
    salesVolume30Days: 280,
    bcgClassification: 'star'
  },
  {
    id: 'dulci_pizza_mucarela',
    itemNumber: '16',
    name: 'Pizza Muçarela',
    description: 'Massa crocante, molho de tomate artesanal e uma camada generosa de muçarela derretida.',
    category: 'cat_pizzas_dulci',
    price: 30.00,
    priceVariants: [
      { label: 'Média (M)', price: 30.00, costPrice: 9.50 },
      { label: 'Grande (G)', price: 40.00, costPrice: 12.50 }
    ],
    badgeText: 'Média R$ 30 | Grande R$ 40',
    tags: ['Muçarela Abundante', 'Mais Pedida'],
    costPrice: 9.50,
    marginPercent: 68.3,
    imageUrl: '/images/pizza-tradicional-dulci.jpg',
    available: true,
    trackStock: true,
    station: 'grill',
    salesVolume30Days: 360,
    bcgClassification: 'star'
  },
  {
    id: 'dulci_pizza_portuguesa',
    itemNumber: '17',
    name: 'Pizza Portuguesa',
    description: 'Massa crocante, molho de tomate, presunto, calabresa, cebola, ovo cozido e pimentão fresco.',
    category: 'cat_pizzas_dulci',
    price: 30.00,
    priceVariants: [
      { label: 'Média (M)', price: 30.00, costPrice: 10.40 },
      { label: 'Grande (G)', price: 40.00, costPrice: 13.60 }
    ],
    badgeText: 'Média R$ 30 | Grande R$ 40',
    tags: ['Presunto & Calabresa', 'Ovo & Cebola', 'Recheadíssima'],
    costPrice: 10.40,
    marginPercent: 65.3,
    imageUrl: '/images/pizza-tradicional-dulci.jpg',
    available: true,
    trackStock: true,
    station: 'grill',
    salesVolume30Days: 310,
    bcgClassification: 'star'
  },
  {
    id: 'dulci_pizza_calabresa',
    itemNumber: '18',
    name: 'Pizza Calabresa',
    description: 'Massa crocante, muçarela, molho de tomate e muita calabresa especial fatiada.',
    category: 'cat_pizzas_dulci',
    price: 30.00,
    priceVariants: [
      { label: 'Média (M)', price: 30.00, costPrice: 9.80 },
      { label: 'Grande (G)', price: 40.00, costPrice: 12.90 }
    ],
    badgeText: 'Média R$ 30 | Grande R$ 40',
    tags: ['Muita Calabresa', 'Fatias Crocantes'],
    costPrice: 9.80,
    marginPercent: 67.3,
    imageUrl: '/images/pizza-tradicional-dulci.jpg',
    available: true,
    trackStock: true,
    station: 'grill',
    salesVolume30Days: 340,
    bcgClassification: 'star'
  },
  {
    id: 'dulci_pizza_toscana',
    itemNumber: '19',
    name: 'Pizza Toscana',
    description: 'Massa crocante, muçarela derretida, molho de tomate, calabresa fatiada e bacon crocante.',
    category: 'cat_pizzas_dulci',
    price: 30.00,
    priceVariants: [
      { label: 'Média (M)', price: 30.00, costPrice: 10.80 },
      { label: 'Grande (G)', price: 40.00, costPrice: 14.00 }
    ],
    badgeText: 'Média R$ 30 | Grande R$ 40',
    tags: ['Calabresa & Bacon', 'Sabor Intenso'],
    costPrice: 10.80,
    marginPercent: 64.0,
    imageUrl: '/images/pizza-tradicional-dulci.jpg',
    available: true,
    trackStock: true,
    station: 'grill',
    salesVolume30Days: 270,
    bcgClassification: 'cash_cow'
  },

  // ==========================================
  // 7. REFRIGERANTES (Imagem 3)
  // ==========================================
  {
    id: 'dulci_refri_coca_fanta_1l',
    itemNumber: '20',
    name: 'Coca-Cola e Fanta 1L',
    description: 'Garrafa de 1 Litro estupidamente gelada, escolha Coca-Cola ou Fanta.',
    category: 'cat_refrigerantes_dulci',
    price: 10.00,
    badgeText: 'Garrafa 1 Litro',
    tags: ['Coca-Cola', 'Fanta', 'Bem Gelada'],
    costPrice: 4.50,
    marginPercent: 55.0,
    imageUrl: '/images/coca-fanta-1l-gelada.jpg',
    available: true,
    trackStock: true,
    station: 'bar',
    salesVolume30Days: 380,
    bcgClassification: 'cash_cow',
    options: [
      {
        groupName: 'Escolha o Refrigerante',
        required: true,
        max: 1,
        items: [
          { name: 'Coca-Cola 1L', price: 0 },
          { name: 'Fanta Laranja 1L', price: 0 },
          { name: 'Fanta Uva 1L', price: 0 }
        ]
      }
    ]
  },
  {
    id: 'dulci_refri_coca_fanta_2l',
    itemNumber: '21',
    name: 'Coca-Cola e Fanta 2L',
    description: 'Tamanho família 2 Litros geladaço para acompanhar o lanche de toda a turma.',
    category: 'cat_refrigerantes_dulci',
    price: 14.00,
    badgeText: 'Família 2 Litros',
    tags: ['2 Litros', 'Coca-Cola', 'Fanta'],
    costPrice: 6.80,
    marginPercent: 51.4,
    imageUrl: '/images/coca-cola-2l-garrafa.jpg',
    available: true,
    trackStock: true,
    station: 'bar',
    salesVolume30Days: 450,
    bcgClassification: 'star',
    options: [
      {
        groupName: 'Escolha o Refrigerante',
        required: true,
        max: 1,
        items: [
          { name: 'Coca-Cola 2L', price: 0 },
          { name: 'Fanta Laranja 2L', price: 0 }
        ]
      }
    ]
  },
  {
    id: 'dulci_refri_coca_fanta_lata',
    itemNumber: '22',
    name: 'Coca-Cola e Fanta Lata',
    description: 'Lata 350ml trincando de gelada, perfeita para o consumo individual.',
    category: 'cat_refrigerantes_dulci',
    price: 6.00,
    badgeText: 'Lata 350ml',
    tags: ['Lata', 'Gelada'],
    costPrice: 2.80,
    marginPercent: 53.3,
    imageUrl: '/images/coca-cola-lata-gelada.jpg',
    available: true,
    trackStock: true,
    station: 'bar',
    salesVolume30Days: 490,
    bcgClassification: 'cash_cow',
    options: [
      {
        groupName: 'Escolha a Lata',
        required: true,
        max: 1,
        items: [
          { name: 'Coca-Cola Lata 350ml', price: 0 },
          { name: 'Fanta Laranja Lata 350ml', price: 0 },
          { name: 'Coca-Cola Zero Lata 350ml', price: 0 }
        ]
      }
    ]
  },
  {
    id: 'dulci_refri_tuchaua_bare_1l',
    itemNumber: '23',
    name: 'Tuchaua ou Baré 1L',
    description: 'O autêntico refrigerante do Amazonas! Escolha Guaraná Baré ou Tuchaua 1L geladinho.',
    category: 'cat_refrigerantes_dulci',
    price: 8.00,
    badgeText: '⭐ Orgulho Manauara',
    tags: ['Baré 1L', 'Tuchaua 1L', 'Regional'],
    costPrice: 3.50,
    marginPercent: 56.3,
    imageUrl: '/images/guarana-tuchaua-bare-1l.jpg',
    available: true,
    trackStock: true,
    station: 'bar',
    salesVolume30Days: 560,
    bcgClassification: 'star',
    options: [
      {
        groupName: 'Escolha o Guaraná Regional',
        required: true,
        max: 1,
        items: [
          { name: 'Guaraná Baré 1L', price: 0 },
          { name: 'Guaraná Tuchaua 1L', price: 0 }
        ]
      }
    ]
  },
  {
    id: 'dulci_refri_tuchaua_2l',
    itemNumber: '24',
    name: 'Tuchaua 2L',
    description: 'Guaraná Tuchaua 2 Litros gelado, o sabor marcante e tradicional que todo manauara adora.',
    category: 'cat_refrigerantes_dulci',
    price: 9.00,
    badgeText: 'Tuchaua 2 Litros',
    tags: ['Tuchaua', '2 Litros', 'Regional'],
    costPrice: 4.00,
    marginPercent: 55.6,
    imageUrl: '/images/guarana-tuchaua-gelado.jpg',
    available: true,
    trackStock: true,
    station: 'bar',
    salesVolume30Days: 390,
    bcgClassification: 'cash_cow'
  },
  {
    id: 'dulci_refri_tete_cola_2l',
    itemNumber: '25',
    name: 'Teté Cola 2L',
    description: 'Teté Cola 2 Litros estupidamente gelada, excelente refrescância e custo-benefício.',
    category: 'cat_refrigerantes_dulci',
    price: 9.00,
    badgeText: 'Teté Cola 2L',
    tags: ['Teté Cola', 'Super Gelado', 'Econômico'],
    costPrice: 4.10,
    marginPercent: 54.4,
    imageUrl: '/images/tete-cola-gelada.jpg',
    available: true,
    trackStock: true,
    station: 'bar',
    salesVolume30Days: 240,
    bcgClassification: 'cash_cow'
  },
  {
    id: 'dulci_refri_bare_2l',
    itemNumber: '26',
    name: 'Baré 2L',
    description: 'O consagrado Guaraná Baré do Amazonas 2 Litros, clássico inconfundível de Manaus.',
    category: 'cat_refrigerantes_dulci',
    price: 10.00,
    badgeText: '⭐ Baré 2 Litros',
    tags: ['Guaraná Baré', '2L', 'O Campeão de Manaus'],
    costPrice: 4.40,
    marginPercent: 56.0,
    imageUrl: '/images/guarana-bare-2l-gelado.jpg',
    available: true,
    trackStock: true,
    station: 'bar',
    salesVolume30Days: 610,
    bcgClassification: 'star'
  },

  // ==========================================
  // 8. SUCOS NATURAIS (Imagem 3)
  // ==========================================
  {
    id: 'dulci_suco_300_goiaba_acerola',
    itemNumber: '27',
    name: 'Suco Natural 300 ml – Goiaba ou Acerola',
    description: 'Polpa natural batida na hora com gelo, refrescante e cheia de vitamina C.',
    category: 'cat_sucos_dulci',
    price: 5.00,
    badgeText: 'Copo 300ml',
    tags: ['Fruta Natural', 'Goiaba', 'Acerola', 'Refrescante'],
    costPrice: 1.80,
    marginPercent: 64.0,
    imageUrl: '/images/suco-natural-amazonia.jpg',
    available: true,
    trackStock: true,
    station: 'bar',
    salesVolume30Days: 310,
    bcgClassification: 'cash_cow',
    options: [
      {
        groupName: 'Escolha o Sabor do Suco 300ml',
        required: true,
        max: 1,
        items: [
          { name: 'Goiaba', price: 0 },
          { name: 'Acerola', price: 0 }
        ]
      }
    ]
  },
  {
    id: 'dulci_suco_300_maracuja_graviola',
    itemNumber: '28',
    name: 'Suco Natural 300 ml – Maracujá ou Graviola',
    description: 'Polpa nobre batida na hora com puro frescor e cremosidade tropical amazônica.',
    category: 'cat_sucos_dulci',
    price: 10.00,
    badgeText: 'Sabor Nobre 300ml',
    tags: ['Maracujá', 'Graviola', 'Pura Fruta'],
    costPrice: 3.50,
    marginPercent: 65.0,
    imageUrl: '/images/suco-natural-amazonia.jpg',
    available: true,
    trackStock: true,
    station: 'bar',
    salesVolume30Days: 290,
    bcgClassification: 'star',
    options: [
      {
        groupName: 'Escolha o Sabor Nobre 300ml',
        required: true,
        max: 1,
        items: [
          { name: 'Maracujá', price: 0 },
          { name: 'Graviola', price: 0 }
        ]
      }
    ]
  },
  {
    id: 'dulci_suco_1l_goiaba_acerola',
    itemNumber: '29',
    name: 'Suco Natural 1L – Goiaba ou Acerola',
    description: 'Jarra de 1 Litro de suco natural da fruta para refrescar toda a família com saúde.',
    category: 'cat_sucos_dulci',
    price: 18.00,
    badgeText: 'Jarra 1 Litro',
    tags: ['1 Litro', 'Goiaba', 'Acerola', '100% Natural'],
    costPrice: 6.20,
    marginPercent: 65.6,
    imageUrl: '/images/suco-natural-amazonia.jpg',
    available: true,
    trackStock: true,
    station: 'bar',
    salesVolume30Days: 210,
    bcgClassification: 'cash_cow',
    options: [
      {
        groupName: 'Escolha o Sabor 1L',
        required: true,
        max: 1,
        items: [
          { name: 'Goiaba 1L', price: 0 },
          { name: 'Acerola 1L', price: 0 }
        ]
      }
    ]
  },
  {
    id: 'dulci_suco_1l_maracuja',
    itemNumber: '30',
    name: 'Suco Natural 1L – Maracujá',
    description: '1 Litro de suco concentrado de maracujá da fruta, azedinho na medida certa e revigorante.',
    category: 'cat_sucos_dulci',
    price: 23.00,
    badgeText: 'Maracujá 1 Litro',
    tags: ['Maracujá da Fruta', '1 Litro', 'Puro Sabor'],
    costPrice: 7.90,
    marginPercent: 65.7,
    imageUrl: '/images/suco-natural-amazonia.jpg',
    available: true,
    trackStock: true,
    station: 'bar',
    salesVolume30Days: 240,
    bcgClassification: 'star'
  }
];

/**
 * Número oficial e dados de contato para WhatsApp e Delivery
 */
export const DULCI_CONTACT = {
  name: 'Lanchonete Dulci',
  city: 'Manaus',
  state: 'Amazonas',
  country: 'Brasil',
  whatsappNumber: '92993032598',
  whatsappDisplay: '(92) 99303-2598',
  whatsappSecondary: '(92) 99930-2598',
  slogan: 'Seu sabor favorito em Manaus',
  address: 'Manaus – AM, Brasil',
  deliveryTimeEst: '30 a 45 min',
  taxaEntregaPadrao: 6.00,
};

/**
 * Pedidos Iniciais da Lanchonete Dulci (Vazio na fase de testes; preenchido exclusivamente por pedidos reais)
 */
export const DULCI_INITIAL_ORDERS: Order[] = [];

/**
 * Gerador de texto promocional do cardápio completo para WhatsApp
 */
export function generateDulciWhatsAppMenuText(): string {
  return `🔥 *LANCHEONETE DULCI — MANAUS / AM* 🔥
_Seu sabor favorito do nosso jeito!_
📍 Manaus - Amazonas | 📲 Zap: ${DULCI_CONTACT.whatsappDisplay}

=================================
⭐ *OFERTAS & COMBOS ESPECIAIS*
=================================
🔥 *3 X-SALADAS*
   De R$ 27,00 por *R$ 25,00* (Oferta da Casa)

🔥 *3 X-SALADAS + COCA 1L*
   Por apenas *R$ 34,00* (Combo Família)

🔥 *3 X-SALADAS + BARÉ 1L*
   Por apenas *R$ 32,00* (Combo Econômico)

🔥 *3 X-SALADAS + REGENTE 1L*
   Por apenas *R$ 30,00* (Maior Economia)

🔥 *4 X-SALADAS + REGENTE 1,5L*
   Por apenas *R$ 40,00* (Combo pra Galera)

=================================
🍔 *LANCHES (PÃO BRIOCHE)*
=================================
• *X-SALADA*: R$ 9,00
  _Pão brioche, hambúrguer, ovo, queijo, presunto, alface e tomate._
• *X-TUDO*: R$ 18,00
  _Pão brioche, hambúrguer, ovo, queijo, presunto, bacon, calabresa, salsicha, tomate e alface._
• *X-BACON*: R$ 14,00
  _Pão brioche, hambúrguer, ovo, queijo, presunto, bacon crocante, alface e tomate._
• *X-CALABRESA*: R$ 14,00
  _Pão brioche, hambúrguer, ovo, queijo, presunto, calabresa, alface e tomate._
• *X-SALSICHA*: R$ 13,00
  _Pão brioche, hambúrguer, ovo, queijo, presunto, salsicha, alface e tomate._
• *X-BANANA*: R$ 14,00
  _Pão brioche, hambúrguer, ovo, queijo, presunto, banana frita, alface e tomate._

=================================
🥪 *MISTOS QUENTES*
=================================
• *Misto Simples*: R$ 6,00 (Pão de forma, queijo e presunto)
• *Misto Duplo*: R$ 12,00 (Pão de forma, 2 queijos e 2 presuntos)

=================================
🥟 *PASTÉIS CROCANTES (R$ 6,00 cada)*
=================================
• *Pastel de Queijo*: R$ 6,00
• *Pastel Misto*: R$ 6,00
• *Pastel Pizza*: R$ 6,00
• *Pastel de Queijo com Banana*: R$ 6,00 (Especial AM)

=================================
🍟 *ACOMPANHAMENTOS*
=================================
• *Batata Frita P (200g)*: R$ 10,00
• *Batata Frita G (400g)*: R$ 20,00

=================================
🍕 *PIZZAS DA DULCI (Massa Crocante)*
=================================
*Tamanhos: Média R$ 30,00 | Grande R$ 40,00*
• *Marguerita*: Muçarela, molho de tomate e manjericão
• *Muçarela*: Molho de tomate e camada generosa de muçarela
• *Portuguesa*: Presunto, calabresa, cebola, ovo cozido e pimentão
• *Calabresa*: Muçarela, molho de tomate e muita calabresa
• *Toscana*: Muçarela, molho de tomate, calabresa e bacon

=================================
🥤 *BEBIDAS & REFRIGERANTES*
=================================
• *Coca e Fanta 1L*: R$ 10,00
• *Coca e Fanta 2L*: R$ 14,00
• *Coca e Fanta Lata*: R$ 6,00
• *Tuchaua ou Baré 1L*: R$ 8,00
• *Tuchaua 2L*: R$ 9,00
• *Teté Cola 2L*: R$ 9,00
• *Baré 2L*: R$ 10,00

=================================
🧃 *SUCOS NATURAIS*
=================================
• *Suco 300 ml (Goiaba ou Acerola)*: R$ 5,00
• *Suco 300 ml (Maracujá ou Graviola)*: R$ 10,00
• *Suco 1L (Goiaba ou Acerola)*: R$ 18,00
• *Suco 1L (Maracujá)*: R$ 23,00

🚀 *Faça seu pedido agora pelo WhatsApp ou Cardápio Online:*
👉 https://wa.me/5592993032598?text=Ol%C3%A1!%20Quero%20fazer%20um%20pedido%20na%20Lanchonete%20Dulci`;
}
