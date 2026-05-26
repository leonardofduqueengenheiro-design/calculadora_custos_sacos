import express from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { getDb } from "./db";
import { custosFixos, parametros } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Mapeamento de tipo da planilha → categoria do banco
const TIPO_PARA_CATEGORIA: Record<string, string> = {
  "folha de pagamento": "folha_pagamento",
  "impostos sobre folha": "impostos_folha",
  "energia elétrica": "energia",
  "energia eletrica": "energia",
  "combustível": "combustivel",
  "combustivel": "combustivel",
  "transporte/frete": "transporte_frete",
  "transporte frete": "transporte_frete",
  "manutenção/peças": "manutencao",
  "manutencao/pecas": "manutencao",
  "manutenção": "manutencao",
  "manutencao": "manutencao",
  "serviços": "servicos",
  "servicos": "servicos",
  "comissão": "comissoes",
  "comissao": "comissoes",
  "seguros": "diversos",
  "água/saneamento": "diversos",
  "agua/saneamento": "diversos",
  "diversos": "diversos",
};

const CATEGORIAS_VALIDAS = [
  "folha_pagamento", "impostos_folha", "energia", "combustivel",
  "transporte_frete", "manutencao", "servicos", "comissoes", "diversos",
] as const;

type CategoriaValida = typeof CATEGORIAS_VALIDAS[number];

interface LinhaPlanilha {
  vencimento?: string | number | Date;
  valor?: number | string;
  fornecedor?: string;
  tipo?: string;
  empresa?: string;
  status?: string;
  [key: string]: unknown;
}

function normalizar(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function mapearCategoria(tipo: string): CategoriaValida | null {
  const norm = normalizar(tipo);
  // Busca exata
  if (TIPO_PARA_CATEGORIA[norm]) return TIPO_PARA_CATEGORIA[norm] as CategoriaValida;
  // Busca parcial
  for (const [key, val] of Object.entries(TIPO_PARA_CATEGORIA)) {
    if (norm.includes(key) || key.includes(norm)) return val as CategoriaValida;
  }
  return null;
}

function parseValor(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[R$\s]/g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

export function registerUploadRoutes(app: express.Application) {
  // POST /api/upload/planilha — processa a planilha e retorna preview
  app.post("/api/upload/planilha", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado." });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });

      // Procurar aba "CONTROLE MENSAL" ou usar a primeira
      const sheetName =
        workbook.SheetNames.find(n => normalizar(n).includes("controle")) ||
        workbook.SheetNames[0];

      if (!sheetName) {
        return res.status(400).json({ error: "Planilha sem abas válidas." });
      }

      const sheet = workbook.Sheets[sheetName];

      // Converter para JSON — detectar onde começa o cabeçalho real
      // O modelo tem título na linha 1, info na linha 2, cabeçalho na linha 3
      // Tentamos primeiro com header na linha 3 (offset 2), depois sem offset
      let raw: LinhaPlanilha[] = [];
      
      // Tentar com header na linha 3 (skipRows=2)
      const rawWithOffset: LinhaPlanilha[] = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: false,
        range: 2, // começa da linha 3 (0-indexed = 2)
      });
      
      // Verificar se tem coluna VALOR ou VENCIMENTO no resultado
      const primeiraComOffset = rawWithOffset[0] || {};
      const temColunaValida = Object.keys(primeiraComOffset).some(k => 
        normalizar(k).includes("valor") || normalizar(k).includes("venc") || normalizar(k) === "tipo"
      );
      
      if (temColunaValida && rawWithOffset.length > 0) {
        raw = rawWithOffset;
      } else {
        // Fallback: sem offset
        raw = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
      }

      if (!raw.length) {
        return res.status(400).json({ error: "Planilha vazia ou sem dados reconhecíveis." });
      }

      // Detectar colunas dinamicamente (case-insensitive)
      const primeiraLinha = raw[0];
      const colMap: Record<string, string> = {};
      for (const key of Object.keys(primeiraLinha)) {
        const norm = normalizar(key);
        if (norm.includes("venc")) colMap["vencimento"] = key;
        else if (norm.includes("valor")) colMap["valor"] = key;
        else if (norm.includes("fornec") || norm.includes("descri")) colMap["fornecedor"] = key;
        else if (norm === "tipo") colMap["tipo"] = key;
        else if (norm.includes("empres")) colMap["empresa"] = key;
        else if (norm.includes("status")) colMap["status"] = key;
      }

      // Acumular totais por categoria
      const totaisPorCategoria: Record<string, number> = {};
      const totalFaturamento = { valor: 0 };
      const totalMateriaPrima = { valor: 0 };
      const linhasIgnoradas: string[] = [];
      const linhasProcessadas: Array<{ tipo: string; categoria: string; valor: number; fornecedor: string }> = [];
      let mesesDetectados = new Set<string>();

      for (const row of raw) {
        const tipoRaw = String(row[colMap["tipo"]] || row["tipo"] || row["TIPO"] || "").trim();
        const valorRaw = row[colMap["valor"]] || row["valor"] || row["VALOR (R$)"] || row["VALOR"] || 0;
        const fornecedor = String(row[colMap["fornecedor"]] || row["fornecedor"] || row["FORNECEDOR / DESCRIÇÃO"] || "").trim();
        const vencRaw = row[colMap["vencimento"]] || row["vencimento"] || row["VENCIMENTO"] || "";

        if (!tipoRaw || !valorRaw) continue;

        const valor = parseValor(valorRaw);
        if (valor <= 0) continue;

        // Detectar mês
        if (vencRaw) {
          const vencStr = String(vencRaw);
          const match = vencStr.match(/(\d{2})\/(\d{4})/);
          if (match) mesesDetectados.add(`${match[1]}/${match[2]}`);
        }

        const tipoNorm = normalizar(tipoRaw);

        // Faturamento é receita
        if (tipoNorm.includes("faturamento") || tipoNorm.includes("receita")) {
          totalFaturamento.valor += valor;
          continue;
        }

        // Matéria-prima
        if (tipoNorm.includes("materia") || tipoNorm.includes("matéria") || tipoNorm.includes("grao") || tipoNorm.includes("grão")) {
          totalMateriaPrima.valor += valor;
          linhasProcessadas.push({ tipo: tipoRaw, categoria: "materia_prima", valor, fornecedor });
          continue;
        }

        const categoria = mapearCategoria(tipoRaw);
        if (categoria) {
          totaisPorCategoria[categoria] = (totaisPorCategoria[categoria] || 0) + valor;
          linhasProcessadas.push({ tipo: tipoRaw, categoria, valor, fornecedor });
        } else {
          linhasIgnoradas.push(`${tipoRaw} (${fornecedor}) — R$ ${valor.toFixed(2)}`);
        }
      }

      const numMeses = Math.max(mesesDetectados.size, 1);

      // Calcular médias mensais
      const mediasPorCategoria: Record<string, number> = {};
      for (const [cat, total] of Object.entries(totaisPorCategoria)) {
        mediasPorCategoria[cat] = total / numMeses;
      }

      const mediaMateriaPrima = totalMateriaPrima.valor / numMeses;
      const mediaFaturamento = totalFaturamento.valor / numMeses;

      return res.json({
        success: true,
        preview: {
          numMeses,
          mesesDetectados: Array.from(mesesDetectados).sort(),
          totalLinhas: raw.length,
          linhasProcessadas: linhasProcessadas.length,
          linhasIgnoradas: linhasIgnoradas.slice(0, 20),
          mediasPorCategoria,
          mediaMateriaPrima,
          mediaFaturamento,
          totalFaturamento: totalFaturamento.valor,
          totalMateriaPrima: totalMateriaPrima.valor,
          totalCustos: Object.values(totaisPorCategoria).reduce((a, b) => a + b, 0),
        },
      });
    } catch (err) {
      console.error("[Upload] Erro ao processar planilha:", err);
      return res.status(500).json({ error: "Erro ao processar a planilha. Verifique o formato." });
    }
  });

  // POST /api/upload/confirmar — aplica os dados ao banco
  app.post("/api/upload/confirmar", express.json(), async (req, res) => {
    try {
      const { mediasPorCategoria, mediaMateriaPrima, mediaFaturamento } = req.body;

      if (!mediasPorCategoria) {
        return res.status(400).json({ error: "Dados inválidos." });
      }

      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Banco de dados indisponível." });

      // Atualizar custos fixos: substituir todos pelos novos valores
      const LABEL_CATEGORIA: Record<string, string> = {
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

      // Buscar custos existentes
      const existentes = await db.select().from(custosFixos).where(eq(custosFixos.ativo, 1));

      for (const [categoria, media] of Object.entries(mediasPorCategoria)) {
        if (!CATEGORIAS_VALIDAS.includes(categoria as CategoriaValida)) continue;
        const existente = existentes.find(c => c.categoria === categoria);
        if (existente) {
          await db.update(custosFixos)
            .set({ valorMensal: (media as number).toFixed(2), descricao: `${LABEL_CATEGORIA[categoria]} (importado)` })
            .where(eq(custosFixos.id, existente.id));
        } else {
          await db.insert(custosFixos).values({
            categoria: categoria as CategoriaValida,
            descricao: `${LABEL_CATEGORIA[categoria]} (importado)`,
            valorMensal: (media as number).toFixed(2),
            ativo: 1,
          });
        }
      }

      // Atualizar custo de matéria-prima se disponível
      if (mediaMateriaPrima > 0) {
        // Salvar total mensal de MP como parâmetro auxiliar
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
    } catch (err) {
      console.error("[Upload] Erro ao confirmar importação:", err);
      return res.status(500).json({ error: "Erro ao salvar os dados." });
    }
  });
}
