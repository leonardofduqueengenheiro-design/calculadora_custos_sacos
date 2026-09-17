import * as XLSX from "xlsx";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const output = resolve("/home/ubuntu/webdev-static-assets/MODELO_CONTROLE_FINANCEIRO_LUKPLAST_V2.xlsx");
mkdirSync(dirname(output), { recursive: true });

const headers = [
  "Vencimento *",
  "Valor (R$) *",
  "Status",
  "Fornecedor / Descrição *",
  "Nº Documento",
  "NF-e / CT-e",
  "OBS",
  "Tipo *",
  "Empresa",
  "Dist. Lucro",
  "Recorrente",
  "Onde / Pagamento",
  "OBS Interna",
];

const rows = [
  ["CONTROLE FINANCEIRO — LUKPLAST"],
  ["Campos obrigatórios para importação: Vencimento, Valor, Fornecedor / Descrição e Tipo. Os demais campos são para o seu controle operacional."],
  headers,
];

const sheet = XLSX.utils.aoa_to_sheet(rows);
sheet["!merges"] = [XLSX.utils.decode_range("A1:M1"), XLSX.utils.decode_range("A2:M2")];
sheet["!autofilter"] = { ref: "A3:M3" };
sheet["!cols"] = [
  { wch: 14 }, { wch: 15 }, { wch: 14 }, { wch: 42 }, { wch: 16 }, { wch: 16 },
  { wch: 28 }, { wch: 26 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 20 }, { wch: 42 },
];
sheet["!rows"] = [{ hpt: 26 }, { hpt: 34 }, { hpt: 24 }];

const titleStyle = {
  font: { bold: true, sz: 15, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "17365D" } },
  alignment: { horizontal: "center", vertical: "center" },
};
const noteStyle = {
  font: { italic: true, color: { rgb: "555555" } },
  fill: { fgColor: { rgb: "EAF2F8" } },
  alignment: { wrapText: true, vertical: "center" },
};
const headerStyle = {
  font: { bold: true, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "1F4E78" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: {
    top: { style: "thin", color: { rgb: "D9E2F3" } },
    bottom: { style: "thin", color: { rgb: "D9E2F3" } },
    left: { style: "thin", color: { rgb: "D9E2F3" } },
    right: { style: "thin", color: { rgb: "D9E2F3" } },
  },
};

sheet.A1.s = titleStyle;
sheet.A2.s = noteStyle;
for (let column = 0; column < headers.length; column += 1) {
  const address = XLSX.utils.encode_cell({ r: 2, c: column });
  sheet[address].s = headerStyle;
}

// Formata 250 linhas vazias para facilitar o preenchimento sem criar lançamentos de exemplo.
for (let row = 3; row < 253; row += 1) {
  for (let column = 0; column < headers.length; column += 1) {
    const address = XLSX.utils.encode_cell({ r: row, c: column });
    sheet[address] = { t: "z", s: { border: { bottom: { style: "hair", color: { rgb: "E7E6E6" } } } } };
  }
  sheet[XLSX.utils.encode_cell({ r: row, c: 0 })].z = "dd/mm/yyyy";
  sheet[XLSX.utils.encode_cell({ r: row, c: 1 })].z = 'R$ #,##0.00';
}
sheet["!ref"] = "A1:M253";

const guia = XLSX.utils.aoa_to_sheet([
  ["GUIA DE PREENCHIMENTO"],
  ["Coluna", "Uso"],
  ["Vencimento *", "Data do lançamento no formato dd/mm/aaaa. É usada para calcular as médias mensais."],
  ["Valor (R$) *", "Informe o valor do lançamento. Aceita números no padrão brasileiro, por exemplo: 1.234,56."],
  ["Fornecedor / Descrição *", "Nome do fornecedor, cliente ou breve descrição do lançamento."],
  ["Tipo *", "Use uma categoria reconhecida: Folha de Pagamento, Impostos sobre Folha, Energia Elétrica, Combustível, Transporte/Frete, Manutenção/Peças, Serviços, Comissão, Matéria-Prima, Faturamento ou Diversos."],
  ["Status", "Exemplos: pago, agendado, a pagar. Mantido para controle; todos os lançamentos preenchidos são considerados na prévia."],
  ["Demais colunas", "Nº Documento, NF-e/CT-e, OBS, Empresa, Dist. Lucro, Recorrente, Onde/Pagamento e OBS Interna são opcionais e ficam disponíveis para o controle da operação."],
]);
guia["!cols"] = [{ wch: 28 }, { wch: 115 }];
guia.A1.s = titleStyle;
guia.A2.s = headerStyle;
guia.B2.s = headerStyle;
for (let row = 2; row <= 7; row += 1) {
  guia[XLSX.utils.encode_cell({ r: row, c: 1 })].s = { alignment: { wrapText: true, vertical: "top" } };
}

guia["!merges"] = [XLSX.utils.decode_range("A1:B1")];

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, sheet, "CONTROLE FINANCEIRO");
XLSX.utils.book_append_sheet(workbook, guia, "GUIA");
workbook.Workbook = { Views: [{ activeTab: 0 }] };
XLSX.writeFile(workbook, output, { cellStyles: true });
console.log(output);
