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

- [ ] Energia elétrica: separar em parcela fixa (20%) e variável (80% por kg produzido)
- [ ] Parâmetros: campo de percentual fixo/variável da energia editável
- [ ] Lógica de cálculo: custo variável de energia entra no custo por kg junto com MP
- [ ] Break-Even Chart: atualizar para incluir energia variável no custo variável por kg
- [ ] DB: tabela produtos com nome, composição de MP própria (até 5 MPs com %)
- [ ] Backend: rotas tRPC para CRUD de produtos e análise de mix
- [ ] Página Mix de Produtos: cadastro de até 4 produtos com nome, MPs e percentuais
- [ ] Página Análise de Período: informar kg produzido/vendido e preço por produto, ver margem individual e consolidada
- [ ] Dashboard: indicador de custo variável de energia por kg
