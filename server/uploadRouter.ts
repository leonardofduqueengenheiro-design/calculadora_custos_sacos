import express from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { getDb } from "./db";
import { custosFixos, parametros } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Mapeamento do campo "Tipo" da planilha para a categoria usada na calculadora.
const TIPO_PARA_CATEGORIA: Record<string, string> = {
  "folha de pagamento": "folha_pagamento",
  "impostos sobre folha": "impostos_folha",
  "energia eletrica": "energia",
  combustivel: "combustivel",
  "transporte/frete": "transporte_frete",
  "transporte frete": "transporte_frete",
  "manutencao/pecas": "manutencao",
  manutencao: "manutencao",
  servicos: "servicos",
  comissao: "comissoes",
  seguros: "diversos",
  "agua/saneamento": "diversos",
  diversos: "diversos",
};

const CATEGORIAS_VALIDAS = [
  "folha_pagamento", "impostos_folha", "energia", "combustivel",
  "transporte_frete", "manutencao", "servicos", "comissoes", "diversos",
] as const;

type CategoriaValida = typeof CATEGORIAS_VALIDAS[number];

type LinhaPlanilha = Record<string, unknown>;

export interface PreviewImportacao {
  numMeses: number;
  mesesDetectados: string[];
  totalLinhas: number;
  linhasProcessadas: number;
  linhasIgnoradas: string[];
  mediasPorCategoria: Record<string, number>;
  mediaMateriaPrima: number;
  mediaFaturamento: number;
  totalFaturamento: number;
  totalMateriaPrima: number;
  totalCustos: number;
}

export function normalizar(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mapearCategoria(tipo: string): CategoriaValida | null {
  const norm = normalizar(tipo);
  if (TIPO_PARA_CATEGORIA[norm]) return TIPO_PARA_CATEGORIA[norm] as CategoriaValida;

  for (const [key, value] of Object.entries(TIPO_PARA_CATEGORIA)) {
    if (norm.includes(key) || key.includes(norm)) return value as CategoriaValida;
  }

  return null;
}

/** Aceita números e textos nos formatos 1234.56, 1.234,56 e R$ 1.234,56. */
export function parseValor(valor: unknown): number {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  if (typeof valor !== "string") return 0;

  const original = valor.trim().replace(/R\$/gi, "").replace(/\s/g, "");
  if (!original) return 0;

  const limpo = original.replace(/[^0-9,.-]/g, "");
  const ultimoPonto = limpo.lastIndexOf(".");
  const ultimaVirgula = limpo.lastIndexOf(",");
  let normalizado = limpo;

  if (ultimaVirgula > ultimoPonto) {
    // Formato brasileiro: 1.234,56
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else if (ultimoPonto > ultimaVirgula) {
    if (ultimaVirgula >= 0) {
      // Formato internacional: 1,234.56
      normalizado = limpo.replace(/,/g, "");
    } else {
      const casasAposPonto = limpo.length - ultimoPonto - 1;
      // Um ponto seguido por exatamente três dígitos normalmente representa milhar.
      normalizado = casasAposPonto === 3 ? limpo.replace(/\./g, "") : limpo;
    }
  } else if (ultimaVirgula >= 0) {
    normalizado = limpo.replace(",", ".");
  }

  const numero = Number.parseFloat(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

function extrairMes(valor: unknown): string | null {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return `${String(valor.getMonth() + 1).padStart(2, "0")}/${valor.getFullYear()}`;
  }

  if (typeof valor === "number" && Number.isFinite(valor)) {
    const data = XLSX.SSF.parse_date_code(valor);
    if (data) return `${String(data.m).padStart(2, "0")}/${data.y}`;
  }

  const texto = String(valor ?? "").trim();
  const brasileiro = texto.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (brasileiro) {
    const mes = brasileiro[2].padStart(2, "0");
    const ano = brasileiro[3].length === 2 ? `20${brasileiro[3]}` : brasileiro[3];
    return `${mes}/${ano}`;
  }

  const data = new Date(texto);
  if (!Number.isNaN(data.getTime())) {
    return `${String(data.getMonth() + 1).padStart(2, "0")}/${data.getFullYear()}`;
  }

  return null;
}

function encontrarLinhasDeDados(sheet: XLSX.WorkSheet): LinhaPlanilha[] {
  const linhas = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  // O novo modelo inicia o cabeçalho na linha 3, mas a leitura também aceita planilhas
  // recebidas com o cabeçalho na primeira linha ou em outra posição próxima ao topo.
  const indiceCabecalho = linhas.slice(0, 30).findIndex((linha) => {
    const colunas = linha.map(celula => normalizar(String(celula)));
    const temValor = colunas.some(coluna => coluna === "valor" || coluna.startsWith("valor ("));
    const temVencimento = colunas.some(coluna => coluna === "vencimento" || coluna.startsWith("vencimento "));
    const temTipo = colunas.some(coluna => coluna === "tipo" || coluna === "categoria");
    return temValor && (temVencimento || temTipo);
  });

  if (indiceCabecalho < 0) {
    throw new Error("Não foi possível localizar o cabeçalho. Inclua as colunas Vencimento, Valor e Tipo.");
  }

  return XLSX.utils.sheet_to_json<LinhaPlanilha>(sheet, {
    defval: "",
    raw: false,
    range: indiceCabecalho,
  });
}

function localizarColunas(primeiraLinha: LinhaPlanilha): Record<string, string> {
  const colunas: Record<string, string> = {};

  for (const chave of Object.keys(primeiraLinha)) {
    const norm = normalizar(chave);
    if (norm.includes("venc") || norm === "data") colunas.vencimento = chave;
    else if (norm.includes("valor")) colunas.valor = chave;
    else if (norm.includes("fornec") || norm.includes("descri")) colunas.fornecedor = chave;
    else if (norm === "tipo" || norm.includes("categoria")) colunas.tipo = chave;
    else if (norm.includes("empres")) colunas.empresa = chave;
    else if (norm.includes("status")) colunas.status = chave;
  }

  return colunas;
}

export function extrairPreviewPlanilha(workbook: XLSX.WorkBook): PreviewImportacao {
  const sheetName =
    workbook.SheetNames.find(nome => normalizar(nome).includes("controle")) ||
    workbook.SheetNames[0];

  if (!sheetName) throw new Error("Planilha sem abas válidas.");

  const sheet = workbook.Sheets[sheetName];
  const linhas = encontrarLinhasDeDados(sheet);
  if (!linhas.length) throw new Error("Planilha vazia ou sem dados reconhecíveis.");

  const colunas = localizarColunas(linhas[0]);
  if (!colunas.valor || !colunas.tipo) {
    throw new Error("Colunas obrigatórias não encontradas. Use ao menos Valor e Tipo.");
  }

  const totaisPorCategoria: Record<string, number> = {};
  let totalFaturamento = 0;
  let totalMateriaPrima = 0;
  const linhasIgnoradas: string[] = [];
  let linhasProcessadas = 0;
  const mesesDetectados = new Set<string>();

  for (const linha of linhas) {
    const tipoRaw = String(linha[colunas.tipo] ?? linha.tipo ?? linha.TIPO ?? "").trim();
    const valorRaw = linha[colunas.valor] ?? linha.valor ?? linha["VALOR (R$)"] ?? linha.VALOR ?? 0;
    const fornecedor = String(linha[colunas.fornecedor] ?? linha.fornecedor ?? linha["FORNECEDOR / DESCRIÇÃO"] ?? "").trim();
    const vencimento = linha[colunas.vencimento] ?? linha.vencimento ?? linha.VENCIMENTO ?? "";

    if (!tipoRaw || valorRaw === "" || valorRaw === null || valorRaw === undefined) continue;

    const valor = parseValor(valorRaw);
    if (valor <= 0) continue;

    const mes = extrairMes(vencimento);
    if (mes) mesesDetectados.add(mes);

    const tipoNormalizado = normalizar(tipoRaw);
    if (tipoNormalizado.includes("faturamento") || tipoNormalizado.includes("receita")) {
      totalFaturamento += valor;
      continue;
    }

    if (tipoNormalizado.includes("materia") || tipoNormalizado.includes("grao")) {
      totalMateriaPrima += valor;
      linhasProcessadas += 1;
      continue;
    }

    const categoria = mapearCategoria(tipoRaw);
    if (categoria) {
      totaisPorCategoria[categoria] = (totaisPorCategoria[categoria] || 0) + valor;
      linhasProcessadas += 1;
    } else {
      linhasIgnoradas.push(`${tipoRaw} (${fornecedor || "sem fornecedor"}) — R$ ${valor.toFixed(2)}`);
    }
  }

  const numMeses = Math.max(mesesDetectados.size, 1);
  const mediasPorCategoria: Record<string, number> = {};
  for (const [categoria, total] of Object.entries(totaisPorCategoria)) {
    mediasPorCategoria[categoria] = total / numMeses;
  }

  return {
    numMeses,
    mesesDetectados: Array.from(mesesDetectados).sort((a, b) => {
      const [mesA, anoA] = a.split("/").map(Number);
      const [mesB, anoB] = b.split("/").map(Number);
      return anoA - anoB || mesA - mesB;
    }),
    totalLinhas: linhas.length,
    linhasProcessadas,
    linhasIgnoradas: linhasIgnoradas.slice(0, 20),
    mediasPorCategoria,
    mediaMateriaPrima: totalMateriaPrima / numMeses,
    mediaFaturamento: totalFaturamento / numMeses,
    totalFaturamento,
    totalMateriaPrima,
    totalCustos: Object.values(totaisPorCategoria).reduce((soma, valor) => soma + valor, 0),
  };
}

export function registerUploadRoutes(app: express.Application) {
  app.post("/api/upload/planilha", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });

      const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
      const preview = extrairPreviewPlanilha(workbook);
      return res.json({ success: true, preview });
    } catch (error) {
      console.error("[Upload] Erro ao processar planilha:", error);
      const message = error instanceof Error ? error.message : "Erro ao processar a planilha. Verifique o formato.";
      return res.status(400).json({ error: message });
    }
  });

  app.post("/api/upload/confirmar", express.json(), async (req, res) => {
    try {
      const { mediasPorCategoria, mediaMateriaPrima, mediaFaturamento } = req.body;
      if (!mediasPorCategoria) return res.status(400).json({ error: "Dados inválidos." });

      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Banco de dados indisponível." });

      const labels: Record<string, string> = {
        folha_pagamento: "Folha de Pagamento",
        impostos_folha: "Impostos sobre Folha",
        energia: "Energia Elétrica",
        combustivel: "Combustível",
        transporte_frete: "Transporte / Frete",
        manutencao: "Manutenção e Peças",
        servicos: "Serviços Terceirizados",
        comissoes: "Comissões",
        diversos: "Diversos",
      };

      const existentes = await db.select().from(custosFixos).where(eq(custosFixos.ativo, 1));
      for (const [categoria, media] of Object.entries(mediasPorCategoria)) {
        if (!CATEGORIAS_VALIDAS.includes(categoria as CategoriaValida)) continue;
        const existente = existentes.find(custo => custo.categoria === categoria);
        if (existente) {
          await db.update(custosFixos)
            .set({ valorMensal: (media as number).toFixed(2), descricao: `${labels[categoria]} (importado)` })
            .where(eq(custosFixos.id, existente.id));
        } else {
          await db.insert(custosFixos).values({
            categoria: categoria as CategoriaValida,
            descricao: `${labels[categoria]} (importado)`,
            valorMensal: (media as number).toFixed(2),
            ativo: 1,
          });
        }
      }

      if (mediaMateriaPrima > 0) {
        await db.insert(parametros)
          .values({ chave: "total_mp_mensal", valor: mediaMateriaPrima.toFixed(2) })
          .onDuplicateKeyUpdate({ set: { valor: mediaMateriaPrima.toFixed(2) } });
      }

      if (mediaFaturamento > 0) {
        await db.insert(parametros)
          .values({ chave: "faturamento_mensal_importado", valor: mediaFaturamento.toFixed(2) })
          .onDuplicateKeyUpdate({ set: { valor: mediaFaturamento.toFixed(2) } });
      }

      return res.json({ success: true, message: "Dados atualizados com sucesso!" });
    } catch (error) {
      console.error("[Upload] Erro ao confirmar importação:", error);
      return res.status(500).json({ error: "Erro ao salvar os dados." });
    }
  });
}
