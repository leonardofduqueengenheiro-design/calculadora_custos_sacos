export interface LinhaComparacaoExportacao {
  categoria: string;
  referencia: number;
  comparada: number;
}

export interface DadosComparacaoExportacao {
  referencia: { nome: string; periodo: string };
  comparada: { nome: string; periodo: string };
  linhas: LinhaComparacaoExportacao[];
  resumo: Array<{ indicador: string; referencia: number; comparada: number }>;
}

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

function nomeSeguro(texto: string) {
  return texto.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").toLowerCase();
}

export async function exportarComparacaoExcel(dados: DadosComparacaoExportacao) {
  const XLSX = await import("xlsx");
  const linhas: Array<Array<string | number>> = [
    ["COMPARAÇÃO DE IMPORTAÇÕES — LUKPLAST"],
    ["Base do período inicial", dados.referencia.nome],
    ["Período inicial", dados.referencia.periodo],
    ["Base do período seguinte", dados.comparada.nome],
    ["Período seguinte", dados.comparada.periodo],
    [],
    ["MÉDIAS MENSAIS POR CATEGORIA"],
    ["Categoria", "Período inicial (R$/mês)", "Período seguinte (R$/mês)", "Variação (R$/mês)", "Variação (%)"],
    ...dados.linhas.map(linha => [
      linha.categoria,
      linha.referencia,
      linha.comparada,
      linha.comparada - linha.referencia,
      linha.referencia !== 0 ? (linha.comparada - linha.referencia) / linha.referencia : null as unknown as number,
    ]),
    [],
    ["INDICADORES DE MÉDIA MENSAL"],
    ["Indicador", "Período inicial (R$)", "Período seguinte (R$)", "Variação (R$)", "Variação (%)"],
    ...dados.resumo.map(item => [
      item.indicador,
      item.referencia,
      item.comparada,
      item.comparada - item.referencia,
      item.referencia !== 0 ? (item.comparada - item.referencia) / item.referencia : null as unknown as number,
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(linhas);
  worksheet["!cols"] = [{ wch: 28 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 16 }];
  for (let linha = 9; linha <= 8 + dados.linhas.length; linha += 1) {
    ["B", "C", "D"].forEach(coluna => {
      const celula = worksheet[`${coluna}${linha}`];
      if (celula) celula.z = 'R$ #,##0.00';
    });
    const percentual = worksheet[`E${linha}`];
    if (percentual) percentual.z = "0.00%";
  }
  const inicioResumo = 13 + dados.linhas.length;
  for (let linha = inicioResumo + 1; linha <= inicioResumo + dados.resumo.length; linha += 1) {
    ["B", "C", "D"].forEach(coluna => {
      const celula = worksheet[`${coluna}${linha}`];
      if (celula) celula.z = 'R$ #,##0.00';
    });
    const percentual = worksheet[`E${linha}`];
    if (percentual) percentual.z = "0.00%";
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Comparação");
  XLSX.writeFile(workbook, `comparacao_${nomeSeguro(dados.referencia.periodo)}_vs_${nomeSeguro(dados.comparada.periodo)}.xlsx`);
}

export async function exportarComparacaoPdf(dados: DadosComparacaoExportacao) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const largura = 297;
  const margem = 15;
  let y = 17;

  const titulo = "Comparação de Importações — Lukplast";
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);
  pdf.text(titulo, margem, y);
  y += 8;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(`Período inicial: ${dados.referencia.periodo} — ${dados.referencia.nome}`, margem, y);
  y += 5;
  pdf.text(`Período seguinte: ${dados.comparada.periodo} — ${dados.comparada.nome}`, margem, y);
  y += 10;

  const desenharCabecalho = (tituloSecao: string) => {
    pdf.setFillColor(20, 32, 43);
    pdf.rect(margem, y - 5, largura - margem * 2, 7, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text(tituloSecao, margem + 3, y - 0.5);
    y += 5;
    pdf.setTextColor(30, 41, 59);
    pdf.text("Categoria", margem + 3, y);
    pdf.text("Período inicial", 155, y, { align: "right" });
    pdf.text("Período seguinte", 205, y, { align: "right" });
    pdf.text("Variação", 252, y, { align: "right" });
    y += 4;
    pdf.setDrawColor(203, 213, 225);
    pdf.line(margem, y, largura - margem, y);
    y += 4;
  };

  const novaPagina = () => {
    pdf.addPage("a4", "landscape");
    y = 17;
  };

  desenharCabecalho("MÉDIAS MENSAIS POR CATEGORIA");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  for (const linha of dados.linhas) {
    if (y > 186) {
      novaPagina();
      desenharCabecalho("MÉDIAS MENSAIS POR CATEGORIA (continuação)");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
    }
    const variacao = linha.comparada - linha.referencia;
    pdf.text(linha.categoria, margem + 3, y);
    pdf.text(moeda(linha.referencia), 155, y, { align: "right" });
    pdf.text(moeda(linha.comparada), 205, y, { align: "right" });
    pdf.setTextColor(variacao > 0 ? 185 : 10, variacao > 0 ? 50 : 120, variacao > 0 ? 50 : 90);
    pdf.text(`${variacao >= 0 ? "+" : ""}${moeda(variacao)}`, 252, y, { align: "right" });
    pdf.setTextColor(30, 41, 59);
    y += 6;
  }

  y += 4;
  if (y > 175) novaPagina();
  desenharCabecalho("INDICADORES DE MÉDIA MENSAL");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  for (const item of dados.resumo) {
    const variacao = item.comparada - item.referencia;
    pdf.text(item.indicador, margem + 3, y);
    pdf.text(moeda(item.referencia), 155, y, { align: "right" });
    pdf.text(moeda(item.comparada), 205, y, { align: "right" });
    pdf.setTextColor(variacao > 0 ? 185 : 10, variacao > 0 ? 50 : 120, variacao > 0 ? 50 : 90);
    pdf.text(`${variacao >= 0 ? "+" : ""}${moeda(variacao)}`, 252, y, { align: "right" });
    pdf.setTextColor(30, 41, 59);
    y += 6;
  }

  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  pdf.text("Valores em reais. Variação = período seguinte menos período inicial.", margem, 201);
  pdf.save(`comparacao_${nomeSeguro(dados.referencia.periodo)}_vs_${nomeSeguro(dados.comparada.periodo)}.pdf`);
}
