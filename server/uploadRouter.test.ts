import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { extrairPreviewPlanilha, obterIntervaloImportacao, parseValor } from "./uploadRouter";

function criarPlanilhaNovoFormato() {
  const linhas = [
    ["CONTROLE FINANCEIRO — LUKPLAST"],
    ["Preencha Vencimento, Valor, Fornecedor e Tipo para a importação."],
    [
      "Vencimento *", "Valor (R$) *", "STATUS", "Fornecedor / Descrição *", "nº doc", "nf-e / ct-e",
      "OBS", "Tipo *", "Empresa", "Dist. lucro", "Recorrente", "Onde", "OBS interna",
    ],
    ["11/09/2026", "1.234,56", "pago", "Transportadora A", "001", "", "", "Transporte/Frete", "LUKPLAST", "", "sim", "e-mail", ""],
    ["12/09/2026", "2.000,00", "pago", "Cliente B", "002", "", "", "Faturamento", "LUKPLAST", "", "", "", ""],
    ["15/10/2026", "500,00", "agendado", "Consultoria C", "003", "", "", "Serviços", "LUKPLAST", "", "sim", "boleto", ""],
    ["16/10/2026", "400,00", "pago", "INSS", "003-A", "", "", "impostos sobre folha de pagamento", "LUKPLAST", "", "sim", "boleto", ""],
    ["18/10/2026", "7.3000", "pago", "Resina D", "004", "", "", "Matéria-Prima", "LUKPLAST", "", "", "", ""],
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(linhas), "CONTROLE FINANCEIRO");
  return workbook;
}

describe("Importação da nova planilha de controle", () => {
  it("interpreta corretamente valores brasileiros", () => {
    expect(parseValor("R$ 1.234,56")).toBeCloseTo(1234.56, 2);
    expect(parseValor("7.3000")).toBeCloseTo(7.3, 4);
    expect(parseValor("1,234.56")).toBeCloseTo(1234.56, 2);
  });

  it("reconhece as colunas e os tipos do novo modelo", () => {
    const preview = extrairPreviewPlanilha(criarPlanilhaNovoFormato());

    expect(preview.numMeses).toBe(2);
    expect(preview.mesesDetectados).toEqual(["09/2026", "10/2026"]);
    expect(preview.linhasProcessadas).toBe(4);
    expect(preview.mediasPorCategoria.transporte_frete).toBeCloseTo(617.28, 2);
    expect(preview.mediasPorCategoria.servicos).toBeCloseTo(250, 2);
    expect(preview.mediasPorCategoria.impostos_folha).toBeCloseTo(200, 2);
    expect(preview.mediasPorCategoria.folha_pagamento).toBeUndefined();
    expect(preview.mediaMateriaPrima).toBeCloseTo(3.65, 2);
    expect(preview.mediaFaturamento).toBeCloseTo(1000, 2);
  });

  it("salva o intervalo cronológico detectado no histórico", () => {
    expect(obterIntervaloImportacao(["01/2025", "03/2025", "04/2026"])).toEqual({
      periodoInicio: "01/2025",
      periodoFim: "04/2026",
    });
    expect(obterIntervaloImportacao([])).toEqual({ periodoInicio: null, periodoFim: null });
  });
});
