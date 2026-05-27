# Calculadora de Custos e Precificação - Sacos Plásticos

## Funcionalidades

- [x] Schema do banco de dados (custos fixos, variáveis, parâmetros, simulações)
- [x] Backend: rotas tRPC para CRUD de custos fixos por categoria
- [x] Backend: rotas tRPC para custos variáveis (MP e SIMPLES)
- [x] Backend: rotas tRPC para parâmetros de produção
- [x] Backend: rotas tRPC para histórico de simulações
- [x] Backend: lógica de cálculo financeiro (custo/kg, margem, preço mínimo)
- [x] Dashboard principal com KPIs (custo/kg, margem, faturamento, lucro)
- [x] Página de Custos Fixos com edição por categoria
- [x] Página de Custos Variáveis (MP e SIMPLES editáveis)
- [x] Página de Parâmetros de Produção
- [x] Simulador de Margem (preço → margem)
- [x] Simulador de Preço (margem desejada → preço mínimo)
- [x] Tabela de cenários comparativos
- [x] Análise de estoque (lucro potencial)
- [x] Histórico de simulações por sessão
- [x] Exportação PDF / impressão de relatório
- [x] Design elegante e refinado (tema escuro premium)
- [x] Dados iniciais pré-carregados com valores reais do cliente
- [x] Testes vitest

## Novas Funcionalidades (v2)

- [x] Planilha Excel modelo de controle financeiro (colunas: vencimento, valor, nº doc, fornecedor, tipo, empresa, dist lucro, obs, status, recorrente, onde, obs2)
- [x] Aba de instruções na planilha modelo com lista de tipos válidos e empresas
- [x] Backend: endpoint de upload de arquivo Excel (.xlsx)
- [x] Backend: processamento/parsing da planilha e extração de custos por categoria
- [x] Backend: atualização automática dos custos fixos e variáveis a partir da planilha
- [x] Frontend: página de Importação com upload drag-and-drop
- [x] Frontend: preview dos dados extraídos antes de confirmar atualização
- [x] Frontend: resumo do período importado e totais por categoria
- [x] Frontend: link para download da planilha modelo

## Novas Funcionalidades (v3)

- [x] Banco de dados: tabela materias_primas com campos nome, custo_kg, percentual_uso
- [x] Backend: rotas tRPC para CRUD de múltiplas matérias-primas (até 5)
- [x] Backend: cálculo de custo médio ponderado de MP
- [x] Frontend: página Custos Variáveis com 5 campos de MP (nome, R$/kg, % uso)
- [x] Frontend: exibição do custo médio ponderado calculado automaticamente
- [x] Validação: soma dos percentuais deve ser 100%

## Novas Funcionalidades (v4)

- [x] Dashboard: Gráfico de Ponto de Equilíbrio (Break-Even Chart) com cruzamento de Receita Total x Custo Total

## Novas Funcionalidades (v5)

- [x] Energia elétrica: separar em parcela fixa (20%) e variável (80% por kg produzido)
- [x] Parâmetros: campo de percentual fixo/variável da energia editável
- [x] Lógica de cálculo: custo variável de energia entra no custo por kg junto com MP
- [x] Break-Even Chart: atualizar para incluir energia variável no custo variável por kg
- [x] DB: tabela produtos com nome, composição de MP própria (até 5 MPs com %)
- [x] Backend: rotas tRPC para CRUD de produtos e análise de mix
- [x] Página Mix de Produtos: cadastro de até 4 produtos com nome, MPs e percentuais
- [x] Página Análise de Período: informar kg produzido/vendido e preço por produto, ver margem individual e consolidada
- [x] Dashboard: indicador de custo variável de energia por kg

## Novas Funcionalidades (v6)

- [x] Bug: corrigir gravação do nome do produto na página Produtos
- [x] Combustível: separar em parcela fixa e variável por kg (configurável)
- [x] Transporte/Frete: separar em parcela fixa e variável por kg (configurável)
- [x] Parâmetros: campos de percentual fixo/variável para combustível e frete
- [x] Lógica de cálculo: combustível e frete variáveis entram no custo por kg
- [x] Break-Even Chart: atualizar para incluir combustível e frete variáveis

## Novas Funcionalidades (v7)

- [x] Backend: combustível e frete variáveis na Análise por Mix usam volume real do mix (não produção média)
- [x] UI: Análise por Mix exibe nota explicativa sobre rateio de custos fixos (Custeio por Absorção)
- [x] UI: Análise por Mix mostra custo fixo/kg recalculado com base no volume total do mix
- [x] UI: Análise por Mix exibe detalhamento separado de energia, combustível e frete variáveis por kg

## Novas Funcionalidades (v8 — Otimizador de Mix)

- [x] Backend: procedure tRPC `analises.otimizar` com algoritmo de otimização de mix por margem
- [x] Backend: suporte a restrições de volume mínimo/máximo por produto e volume total
- [x] Frontend: página dedicada "Otimizador de Mix" com rota /otimizador-mix
- [x] Frontend: tabela comparativa (mix atual vs mix otimizado) com delta de kg e margem
- [x] Frontend: gráfico de barras agrupadas (kg atual vs kg otimizado por produto)
- [x] Frontend: gráfico de pizza/rosca mostrando participação % de cada produto no mix otimizado
- [x] Frontend: card de ganho de lucro e margem vs mix atual
- [x] Testes vitest para a função de otimização (6 novos testes — total: 44)

## Novas Funcionalidades (v9 — Sincronização de Custos de MP)

- [x] Schema: adicionar coluna `materia_prima_id` (FK opcional) em `produto_materias_primas` para vincular ao catálogo global
- [x] Backend: migração SQL para adicionar a coluna `materia_prima_id`
- [x] Backend: procedure `produtos.syncCustos` que copia o custo atual de cada MP do catálogo global para os produtos vinculados
- [x] Backend: ao salvar uma MP em `materiasPrimas.update`, propagar automaticamente o novo custo para todos os produtos vinculados
- [x] Frontend: UI de Produtos mostra dropdown para vincular cada linha de MP ao catálogo global (Custos Variáveis)
- [x] Frontend: custo da MP vinculada é exibido como somente-leitura com ícone de sincronização
- [x] Frontend: botão "Sincronizar Custos" na página de Produtos para forçar atualização manual
- [x] Frontend: banner explicativo sobre o funcionamento do vínculo automático
- [x] 44 testes passando (sem regressões)

## Novas Funcionalidades (v10)

### Alerta de Custo Desatualizado
- [x] Backend: procedure `produtos.custosDesatualizados` compara custo armazenado vs catálogo global para MPs vinculadas
- [x] Frontend: badge de aviso em cada produto com MP desatualizada na página Produtos
- [x] Frontend: botão "Corrigir" que aplica o custo atual do catálogo para a linha desatualizada

### Preço de Venda Padrão por Produto
- [x] Schema: adicionar coluna `preco_venda_padrao` (decimal) na tabela `produtos`
- [x] Backend: migração SQL para adicionar a coluna
- [x] Backend: procedure `produtos.updatePreco` para salvar o preço padrão
- [x] Frontend: campo de preço de venda padrão na página Produtos (por produto)
- [x] Frontend: Análise por Mix pré-preenche o preço de venda com o valor padrão do produto
- [x] Frontend: Otimizador de Mix pré-preenche o preço de venda com o valor padrão do produto

### Histórico de Variação de Custo de MP
- [x] Schema: nova tabela `historico_custo_mp` com campos: id, materia_prima_id, nome_mp, custo_anterior, custo_novo, data_alteracao
- [x] Backend: migração SQL para criar a tabela
- [x] Backend: ao salvar uma MP em `materiasPrimas.update`, registrar o histórico se o custo mudou
- [x] Backend: procedure `materiasPrimas.historico` para listar o histórico de uma MP
- [x] Frontend: botão "Ver Histórico" (aba) em cada MP na página Custos Variáveis
- [x] Frontend: modal com tabela de histórico e gráfico de linha de variação de custo ao longo do tempo
- [x] 49 testes passando (sem regressões)
