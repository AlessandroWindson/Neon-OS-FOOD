# DOCUMENTAÇÃO TÉCNICA E FUNCIONAL DO SISTEMA
## NEON FOOD OS — Lanchonete Dulci (Manaus - AM)

---

### SUMÁRIO
1. [Visão Geral do Sistema e Propósito](#1-visão-geral-do-sistema-e-propósito)
2. [Glossário e Nomenclatura Oficial do Ecossistema](#2-glossário-e-nomenclatura-oficial-do-ecossistema)
3. [Cardápio Oficial e Fonte da Verdade (Lanchonete Dulci)](#3-cardápio-oficial-e-fonte-da-verdade-lanchonete-dulci)
4. [Diretrizes de Imagens Gastronômicas Reais (Manaus-AM)](#4-diretrizes-de-imagens-gastronômicas-reais-manaus-am)
5. [Requisitos Funcionais (RF)](#5-requisitos-funcionais-rf)
6. [Requisitos Não Funcionais (RNF)](#6-requisitos-não-funcionais-rnf)
7. [Requisitos Tecnológicos e Arquitetura de Software](#7-requisitos-tecnológicos-e-arquitetura-de-software)
8. [Estrutura de Dados e Esquema de Entidades](#8-estrutura-de-dados-e-esquema-de-entidades)
9. [Segurança, Multi-Tenancy e Isolamento de Dados](#9-segurança-multi-tenancy-e-isolamento-de-dados)
10. [Auditoria, Integridade de Faturamento e Testes Automatizados](#10-auditoria-integridade-de-faturamento-e-testes-automatizados)
11. [Manuais de Operação por Módulo](#11-manuais-de-operação-por-módulo)
12. [Checklist de Implantação e Produção](#12-checklist-de-implantação-e-produção)

---

## 1. VISÃO GERAL DO SISTEMA E PROPÓSITO

O **NEON FOOD OS** é um sistema operacional e plataforma SaaS de gestão gastronômica em tempo real, projetado para lanchonetes, hamburguerias, pizzarias e restaurantes com foco na operação física e delivery de alta velocidade. 

Nesta instância especializada para a **Lanchonete Dulci** (Manaus - AM), o sistema unifica:
- **Cardápio Online Interativo para Clientes** com sacola inteligente, cálculo de frete, bairros de Manaus e despacho direto via WhatsApp/PDV.
- **Catálogo em PDF / Impressão A4** de alta fidelidade visual.
- **Cardápio Formatado para WhatsApp** com formatação em negrito, itálico, categorias e link para pedidos instantâneos.
- **Ponto de Venda (PDV Inteligente)** com leitor de código de barras, atalhos rápidos e suporte a teclado numérico.
- **Central de Pedidos e KDS (Kitchen Display System)** autoritativo por estação de preparo (chapa, fritadeira, montagem e bar).
- **Mapa de Mesas & Comandas Digitais** com QR Code de mesa e comanda individual/coletiva.
- **Atendente Mobile** para lançamentos em tempo real na mesa do cliente via smartphone.
- **Gestão de Estoque com Ficha Técnica & CMV** com alertas de estoque mínimo e baixa automática de ingredientes.
- **Business Intelligence (BI) e Dashboard de Desempenho (D3.js)** com isolamento multi-tenant real via Google Cloud Firestore, operando sob a regra mandatória: *"Dado não cadastrado não existe. Venda não realizada não é faturamento."*

---

## 2. GLOSSÁRIO E NOMENCLATURA OFICIAL DO ECOSSISTEMA

Para garantir coerência em todo o código, documentação e comunicação, adotam-se os seguintes termos oficiais:

| Termo Oficial | Significado no Ecossistema |
| :--- | :--- |
| **NEON FOOD OS** | Nome oficial da plataforma de gestão gastronômica. |
| **Lanchonete Dulci** | A unidade gastronômica/empresa de Manaus-AM que serve como caso de uso primário e oficial. |
| **Fonte de Verdade** | O cardápio físico oficial transcrito a partir das 3 imagens reais da Lanchonete Dulci (não passível de alterações fictícias). |
| **Bisnagas de Condimentos** | O trio obrigatório em fotos de lanches/porções: bisnaga transparente de **Maionese Caseira Verde** temperada, bisnaga vermelha de **Ketchup** e bisnaga amarela de **Mostarda**. |
| **Guaraná Baré** | O clássico refrigerante regional de Manaus, mantido em destaque em garrafas de 2L, 1L ou latas de 350ml trincando de geladas. |
| **PDV Inteligente** | Módulo de Ponto de Venda para operadores de caixa e balcão. |
| **KDS (Kitchen Display System)** | Painel de controle da cozinha em tempo real organizado por estações operacionais. |
| **OverviewBI / Dashboard de Desempenho** | Painel analítico visual em D3.js com evolução diária e acumulada do faturamento vs. metas operacionais. |
| **CMV (Custo de Mercadoria Vendida)** | Relação percentual e monetária entre o custo dos ingredientes consumidos e o preço de venda. |
| **Matriz BCG Gastronômica** | Classificação de produtos em Estrelas (*Stars*), Vacas Leiteiras (*Cash Cows*), Interrogações (*Question Marks*) e Abacaxis (*Dogs*). |
| **Atendente Mobile** | Interface de bolso responsiva utilizada pelos garçons no salão. |
| **Multi-Tenancy** | Arquitetura de segregação estrita de dados por `tenantId` e `branchId`. |
| **ESC/POS** | Padrão de comunicação serial/USB para impressão térmica em bobinas de 80mm e 58mm. |

---

## 3. CARDÁPIO OFICIAL E FONTE DA VERDADE (LANCHONETE DULCI)

O cardápio da Lanchonete Dulci é **imutável em sua essência comercial**. Nenhum produto, preço ou descrição foi inventado ou substituído:

### 3.1. Ofertas da Casa & Promoções Especiais
- **3 X-Saladas (Oferta da Casa)**: R$ 25,00 *(Economia de R$ 2,00)*
- **3 X-Saladas + Coca-Cola 1L**: R$ 34,00
- **3 X-Saladas + Baré 1L**: R$ 32,00 *(O Clássico Manauara)*
- **3 X-Saladas + Regente 1L**: R$ 30,00
- **4 X-Saladas + Regente 1,5L**: R$ 40,00

### 3.2. Lanches no Pão Brioche (Hambúrgueres Artesanais)
- **X-Salada**: R$ 9,00 *(Pão brioche, hambúrguer bovino, ovo, queijo prato, presunto, alface e tomate fresco)*
- **X-Tudo**: R$ 18,00 *(Pão brioche, hambúrguer, ovo, queijo, presunto, bacon crocante, calabresa fatiada, salsicha, alface e tomate)*
- **X-Bacon**: R$ 14,00 *(Pão brioche, hambúrguer, ovo, queijo, presunto, fatias de bacon grelhado, alface e tomate)*
- **X-Calabresa**: R$ 14,00 *(Pão brioche, hambúrguer, ovo, queijo, presunto, calabresa fatiada na chapa, alface e tomate)*
- **X-Salsicha**: R$ 13,00 *(Pão brioche, hambúrguer, ovo, queijo, presunto, salsicha na chapa, alface e tomate)*
- **X-Banana**: R$ 14,00 *(Pão brioche, hambúrguer, ovo, queijo, presunto, banana frita regional, alface e tomate)*
- **X-Caboquinho Especial**: R$ 18,00 *(Pão francês ou brioche com queijo coalho na chapa, lascas de tucumã fresco e banana frita)*

### 3.3. Mistos Quentes na Chapa
- **Misto Simples**: R$ 6,00 *(Pão de forma tostado na chapa com manteiga, queijo muçarela derretido e presunto)*
- **Misto Duplo**: R$ 12,00 *(Pão de forma alto com dobro de queijo e dobro de presunto)*

### 3.4. Pastéis Crocantes Fritos na Hora (R$ 6,00 cada)
- **Pastel de Queijo**: R$ 6,00 *(Massa crocante estufada e recheio generoso de queijo derretido)*
- **Pastel Misto**: R$ 6,00 *(Queijo e presunto)*
- **Pastel Pizza**: R$ 6,00 *(Queijo, presunto, tomate picado e orégano)*
- **Pastel de Queijo com Banana**: R$ 6,00 *(Combinação tradicional manauara de banana frita com queijo)*

### 3.5. Acompanhamentos
- **Batata Frita P (200g)**: R$ 10,00 *(Porção individual crocante e sequinha)*
- **Batata Frita G (400g)**: R$ 20,00 *(Porção família servida em cesto)*

### 3.6. Pizzas da Dulci (Massa Crocante Artesanal)
*Disponíveis em dois tamanhos: Média (M) a R$ 30,00 e Grande (G) a R$ 40,00*
- **Marguerita**: Molho artesanal, muçarela, rodelas de tomate e folhas de manjericão fresco.
- **Muçarela**: Molho de tomate especial com camada farta de queijo muçarela e azeitonas.
- **Portuguesa**: Presunto, calabresa, cebola em rodelas, ovos cozidos e pimentão verde.
- **Calabresa**: Muçarela, fatias selecionadas de linguiça calabresa e orégano.
- **Toscana**: Molho, muçarela, calabresa moída/fatiada e pedaços de bacon crocante.

### 3.7. Refrigerantes & Guaranás Regionais
- **Coca-Cola e Fanta 1L**: R$ 10,00
- **Coca-Cola e Fanta 2L**: R$ 14,00
- **Coca-Cola e Fanta Lata 350ml**: R$ 6,00
- **Tuchaua ou Baré 1L**: R$ 8,00
- **Tuchaua 2L**: R$ 9,00
- **Teté Cola 2L**: R$ 9,00
- **Guaraná Baré 2L**: R$ 10,00
- **Guaraná Baré Lata 350ml**: R$ 6,00

### 3.8. Sucos Naturais da Fruta Batidos na Hora
- **Copo 300ml (Goiaba ou Acerola)**: R$ 5,00
- **Copo 300ml (Maracujá ou Graviola)**: R$ 10,00
- **Jarra/Garrafa 1L (Goiaba ou Acerola)**: R$ 18,00
- **Jarra/Garrafa 1L (Maracujá)**: R$ 23,00

---

## 4. DIRETRIZES DE IMAGENS GASTRONÔMICAS REAIS (MANAUS-AM)

Todas as imagens integradas no sistema obedecem aos seguintes critérios:
1. **Fotografia Gastronômica Realista**: Sem visual 3D artificial, sem aspecto plástico e sem elementos fantásticos.
2. **Contexto Regional de Manaus**: Cenário de lanchonete tradicional, mesas de madeira rústica, cestos de arame ou plástico com papel manteiga, copos de vidro com gelo e garrafas suando de frio.
3. **Bisnagas Oficiais Obrigatórias**:
   - Bisnaga verde translúcida de **Maionese Caseira de Ervas** com bico dosador e etiqueta característica.
   - Bisnaga vermelha de **Ketchup Tradicional**.
   - Bisnaga amarela de **Mostarda**.
4. **Individualidade de Bebidas**: Cada refrigerante possui foto específica e fidedigna ao seu rótulo e volume (1L, 2L ou lata 350ml), nunca reutilizando a imagem de uma marca para representar outra.

---

## 5. REQUISITOS FUNCIONAIS (RF)

### 5.1. Módulo Cardápio Online & Experiência do Cliente
- **RF-01**: O sistema deve permitir que clientes finais naveguem pelo catálogo completo filtrando por categorias, faixa de preço e busca textual.
- **RF-02**: O sistema deve permitir personalização de lanches com seleção de ponto da carne, remoção de ingredientes (ex: sem cebola) e adição de complementos pagos.
- **RF-03**: O sistema deve calcular automaticamente a taxa de entrega baseando-se no bairro de Manaus selecionado (ex: Centro, Adrianópolis, Flores, Ponta Negra, São Geraldo) ou via cálculo de quilometragem geolocalizada.
- **RF-04**: O sistema deve permitir que o cliente envie o pedido diretamente para o WhatsApp da Lanchonete Dulci formatado com todos os itens, endereço, forma de pagamento e chave Pix.
- **RF-05**: O sistema deve disponibilizar atalho para cópia do cardápio textual completo com formatação pronta para colagem em mensagens do WhatsApp.

### 5.2. Módulo Catálogo em PDF & Impressão A4
- **RF-06**: O sistema deve gerar uma versão visual para impressão contendo todos os produtos, fotos, valores, contatos comerciais e QR Code estático/dinâmico para acesso ao cardápio digital.
- **RF-07**: O sistema deve permitir a impressão direta via navegador ou download em formato PDF através de folha de estilos `@media print`.

### 5.3. Módulo Ponto de Venda (PDV Inteligente)
- **RF-08**: O operador deve ser capaz de registrar vendas rápidas de balcão via clique em fotos, pesquisa por nome ou leitura de código de barras.
- **RF-09**: O PDV deve aceitar múltiplas formas de pagamento: Dinheiro (com cálculo automático de troco), Cartão de Crédito, Cartão de Débito e Pix.
- **RF-10**: Para pagamentos via Pix, o PDV deve exibir o QR Code dinâmico na tela com chave Pix Copia e Cola e conferência automática.
- **RF-11**: O operador deve conseguir aplicar descontos em percentual ou reais, bem como emitir cupom não-fiscal térmico após a finalização.

### 5.4. Módulo Mesas, Comandas e Atendente Mobile
- **RF-12**: O sistema deve gerenciar o mapa de mesas do estabelecimento, indicando visualmente mesas livres, ocupadas, aguardando conta e reservadas.
- **RF-13**: O sistema deve permitir a abertura de comandas individuais ou vinculadas a mesas específicas.
- **RF-14**: O garçom/atendente deve poder lançar pedidos diretamente na comanda da mesa através do celular (Atendente Mobile), disparando a produção imediatamente para a cozinha.
- **RF-15**: O sistema deve permitir a transferência de itens entre comandas e o fechamento parcial ou total da conta com divisão por número de pessoas.

### 5.5. Módulo KDS (Kitchen Display System - Cozinha)
- **RF-16**: Os pedidos confirmados devem ser roteados automaticamente para a tela da cozinha em tempo real.
- **RF-17**: Os itens devem ser segregados por praças operacionais: Chapa (Hambúrgueres/Mistos), Fritadeira (Pastéis/Batatas), Forno (Pizzas) e Bar (Bebidas/Sucos).
- **RF-18**: O KDS deve alterar as cores das comandas conforme o tempo decorrido (Verde: < 10min; Amarelo: 10 a 20min; Vermelho piscante: > 20min) com emissão de alerta sonoro ao receber novo pedido.
- **RF-19**: O cozinheiro deve poder marcar itens ou pedidos completos como "Em Preparo", "Pronto para Entrega" ou "Entregue".

### 5.6. Módulo Estoque & CMV
- **RF-20**: Cada produto vendido deve descontar proporcionalmente os ingredientes de sua ficha técnica do estoque em tempo real.
- **RF-21**: O sistema deve emitir alerta visual sonoro e banner de destaque quando qualquer insumo atingir ou ficar abaixo do estoque mínimo de segurança.
- **RF-22**: O gestor deve ser capaz de registrar entradas manuais de insumos (compras de fornecedores) com atualização imediata do custo unitário médio ponderado.

### 5.7. Módulo OverviewBI e Dashboard de Desempenho (D3.js)
- **RF-23**: O dashboard deve exibir estritamente as vendas confirmadas e faturadas gravadas no Firestore para a empresa autenticada.
- **RF-24**: Se a empresa não tiver vendas cadastradas, o sistema deve apresentar estado de carregamento (*loading*) e, em seguida, estado vazio (*empty state*) com faturamento R$ 0,00, sem projeções ou dados fictícios.
- **RF-25**: O gestor deve poder alternar a visualização temporal entre Volume Diário e Volume Acumulado, nos períodos de 14 dias ou mês completo.
- **RF-26**: O sistema deve permitir a definição de metas diárias de faturamento, recalculando a curva de meta esperada em D3.js.

### 5.8. Módulo Gateways de Pagamento e Impressão Térmica
- **RF-27**: Suporte à integração com Mercado Pago, Asaas e EFI Bank (Gerencianet) para liquidação Pix automática via Webhook.
- **RF-28**: Integração com impressoras térmicas ESC/POS (80mm e 58mm) conectadas via WebSerial, WebUSB ou rede local/IP.

---

## 6. REQUISITOS NÃO FUNCIONAIS (RNF)

- **RNF-01 (Desempenho)**: O tempo de resposta para adição de itens ao carrinho e troca de abas no PDV deve ser inferior a 100 milissegundos.
- **RNF-02 (Confiabilidade e Integridade)**: Nenhum dado financeiro pode ser simulado ou inventado fora do modo de testes expressamente ativado pelo usuário. Vendas não liquidadas não compõem faturamento líquido.
- **RNF-03 (Responsividade)**: A interface deve ser 100% responsiva, adaptando-se com fluidez desde telas compactas de smartphones (360px) até monitores ultrawide (2560px) e terminais touch-screen de PDV.
- **RNF-04 (Operação Offline & PWA)**: O sistema deve manter cache local dos pedidos recentes via LocalStorage e IndexedDB, permitindo continuar a registrar vendas no balcão mesmo em caso de oscilação momentânea da conexão de internet.
- **RNF-05 (Segurança)**: Acesso às rotas administrativas restrito por permissões RBAC (*Role-Based Access Control*), separando caixas, atendentes, cozinheiros, gerentes e super-administradores.
- **RNF-06 (Acessibilidade)**: Contraste de cores em conformidade com WCAG AA, feedback sonoro opcional para operadores com deficiência visual e teclas de atalho de teclado para todas as operações críticas do PDV.
- **RNF-07 (Tempo de Construção e Build)**: A aplicação SPA deve compilar sem avisos ou erros de TypeScript (`tsc --noEmit`) em menos de 15 segundos.

---

## 7. REQUISITOS TECNOLÓGICOS E ARQUITETURA DE SOFTWARE

### 7.1. Stack Tecnológica
- **Linguagem Principal**: TypeScript 5.8+ (Strict Mode ativado).
- **Front-end Library**: React 19 (Hooks, Context API, Suspense, Lazy Loading).
- **Build Tool & Bundler**: Vite 6.2 com Plugin React e Tailwind CSS v4.
- **Estilização**: Tailwind CSS v4 com variáveis de tema e animações customizadas.
- **Visualização de Dados**: D3.js v7 (Gráficos vetoriais SVG interativos com interpolação de curvas).
- **Animações**: Motion (Framer Motion / `motion/react`).
- **Ícones**: Lucide React.
- **Back-end Server**: Node.js com Express e TSX para proxy seguro de rotas `/api/*`.
- **Banco de Dados & Tempo Real**: Google Cloud Firestore (SDK Firebase v12).
- **Test Runner**: TSX / Node Test Runner com suíte de regressão automatizada.

### 7.2. Arquitetura em Camadas

```
┌─────────────────────────────────────────────────────────────┐
│                      CAMADA DE APRESENTAÇÃO                 │
│   Cardápio Cliente │ PDV │ KDS │ Mesas │ BI (D3.js) │ PDF   │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                  CAMADA DE ESTADO E CONTEXTO                │
│    AppContext & AppProvider (Multi-tenant, Orders, Stock)   │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    CAMADA DE SERVIÇOS                       │
│  financialFirestoreService │ orderService │ webhookService │
│  printerService │ multiTenantService │ targetsStorage       │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                  PERSISTÊNCIA E INTEGRAÇÃO                  │
│     Firebase Firestore (Cloud) │ LocalStorage (Offline)     │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. ESTRUTURA DE DADOS E ESQUEMA DE ENTIDADES

### 8.1. Entidade `Product` (Produto)
```typescript
interface Product {
  id: string;
  itemNumber?: string;
  name: string;
  description: string;
  category: string;
  price: number;
  costPrice?: number;
  marginPercent?: number;
  imageUrl: string;
  badgeText?: string;
  tags?: string[];
  available: boolean;
  trackStock: boolean;
  station?: 'grill' | 'fryer' | 'bar' | 'pizza' | 'dessert';
  salesVolume30Days?: number;
  bcgClassification?: 'star' | 'cash_cow' | 'question_mark' | 'dog';
  options?: ProductOptionGroup[];
  ingredients?: { ingredientId: string; quantity: number }[];
}
```

### 8.2. Entidade `Order` (Pedido)
```typescript
interface Order {
  id: string;
  displayCode: string;
  tenantId: string;
  branchId: string;
  channel: 'balcao' | 'pdv_balcao' | 'cardapio_online' | 'delivery_whatsapp' | 'mesa' | 'atendente_mesa';
  tableNumber?: number;
  customerName: string;
  customerPhone?: string;
  customerAddress?: DeliveryAddress;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: 'pix' | 'credit' | 'debit' | 'money';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  status: 'pending' | 'preparing' | 'ready' | 'delivering' | 'completed' | 'canceled';
  createdAt: string;
  updatedAt: string;
}
```

### 8.3. Entidade `SaleFirestore` (Venda Fiscal/Gerencial no Firestore)
```typescript
interface SaleFirestore {
  id: string;
  empresaId: string;
  branchId: string;
  orderId: string;
  channel: string;
  saleDate: string; // YYYY-MM-DD
  grossTotal: number;
  netAmount: number;
  paymentMethod: string;
  status: 'concluida' | 'cancelada' | 'pendente';
  createdAt: string;
}
```

---

## 9. SEGURANÇA, MULTI-TENANCY E ISOLAMENTO DE DADOS

1. **Isolamento de Tenants**: Todas as operações de leitura e escrita nas coleções do Firestore exigem o `empresaId` ou `tenantId`. O sistema rejeita e ignora eventos em tempo real oriundos de tenants diferentes da empresa ativa no contexto.
2. **Controle de Acesso por Perfil (RBAC)**:
   - `admin`: Acesso irrestrito a configurações, DRE, metas e cancelamentos.
   - `gerente`: Gestão de estoque, cardápio, relatórios operacionais e fechamento de caixa.
   - `caixa`: Operação do PDV, recebimentos e consulta básica de comandas.
   - `atendente`: Lançamento de pedidos em mesas e comandas via mobile.
   - `cozinha`: Acesso exclusivo ao painel KDS.
3. **Auditoria Contínua**: Todo cancelamento de item ou comanda gera log com carimbo de data/hora, operador responsável e motivo registrado.

---

## 10. AUDITORIA, INTEGRIDADE DE FATURAMENTO E TESTES AUTOMATIZADOS

O sistema conta com um script de teste de regressão em tempo real (`tests/dashboardRegression.test.ts`), rodando 15 testes de integridade financeira:

1. **Teste 1**: Empresa sem vendas possui estritamente R$ 0,00 de faturamento.
2. **Teste 2**: Nenhuma projeção fictícia é calculada sem base histórica real.
3. **Teste 3**: Nenhum pico fictício ou aleatório é exibido.
4. **Teste 4**: Faturamento reflete rigorosamente a venda real registrada.
5. **Teste 5**: Recarregamento sucessivo produz valores idênticos sem dispersão pseudo-aleatória.
6. **Teste 6**: Nova sessão inicia com meta diária zerada caso o gestor não tenha configurado.
7. **Teste 7**: Erro ou retorno nulo do Firestore não aciona fallback com dados fictícios.
8. **Teste 8**: Empresa Dulci visualiza estritamente suas próprias vendas e faturamento.
9. **Teste 9**: Purga automática de resquícios de chaves de mock em caches legados.
10. **Teste 10**: Banco vazio produz estado vazio consistente e elegante.

Comando de validação:
```bash
npm test
```

---

## 11. MANUAIS DE OPERAÇÃO POR MÓDULO

### 11.1. Como Receber e Despachar Pedidos do Cardápio Online
1. O cliente monta a sacola no Cardápio Online e clica em **Enviar Pedido**.
2. O pedido chega instantaneamente à **Central de Pedidos** e emite alerta sonoro.
3. O operador do balcão clica em **Aceitar Pedido**.
4. O pedido é enviado automaticamente à tela do **KDS** da cozinha na praça correspondente.
5. Quando o cozinheiro clica em **Pronto**, o entregador é acionado ou o cliente é notificado no balcão.

### 11.2. Como Fazer Fechamento de Caixa no PDV
1. No menu lateral, acesse **Vendas & Caixa (PDV)**.
2. Ao final do expediente, clique em **Fechar Turno de Caixa**.
3. O sistema calcula a soma dos recebimentos por espécie (Dinheiro, Cartão de Crédito, Débito e Pix).
4. O operador digita o valor físico em gaveta para apuração de eventuais sobras ou quebras.
5. O relatório de fechamento pode ser impresso na bobina térmica térmica de 80mm ou exportado em PDF/Excel.

---

## 12. CHECKLIST DE IMPLANTAÇÃO E PRODUÇÃO

Para colocar o sistema em produção física na Lanchonete Dulci, siga as etapas:

- [x] Transcrição rigorosa do cardápio físico (preços e itens oficiais).
- [x] Associação das fotografias gastronômicas individuais de cada refrigerante e lanche com bisnagas.
- [x] Homologação do cálculo de entrega por bairros de Manaus.
- [x] Eliminação completa de fallbacks com faturamento simulado no OverviewBI.
- [x] Validação da suíte de 15 testes de integridade.
- [ ] Inserção do Token de Produção do Gateway Pix em **Gateways de Pagamento**.
- [ ] Pareamento da impressora térmica via USB ou Bluetooth no módulo **Gerenciamento de Impressoras**.
- [ ] Fixação dos adesivos com QR Code nas mesas do salão.

---
*Documento oficializado e homologado para a plataforma NEON FOOD OS — Lanchonete Dulci.*
