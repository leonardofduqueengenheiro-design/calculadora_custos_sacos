import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, custosFixos, parametros, simulacoes, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Custos Fixos ────────────────────────────────────────────────────────────

export async function getCustosFixos() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(custosFixos).where(eq(custosFixos.ativo, 1));
}

export async function upsertCustoFixo(id: number | undefined, data: {
  categoria: typeof custosFixos.$inferInsert['categoria'];
  descricao: string;
  valorMensal: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (id) {
    await db.update(custosFixos)
      .set({ descricao: data.descricao, valorMensal: data.valorMensal, categoria: data.categoria })
      .where(eq(custosFixos.id, id));
    return id;
  } else {
    const result = await db.insert(custosFixos).values({
      categoria: data.categoria,
      descricao: data.descricao,
      valorMensal: data.valorMensal,
    });
    return (result as any)[0]?.insertId ?? null;
  }
}

export async function deleteCustoFixo(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(custosFixos).set({ ativo: 0 }).where(eq(custosFixos.id, id));
}

// ─── Parâmetros ──────────────────────────────────────────────────────────────

export async function getParametros() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(parametros);
}

export async function getParametro(chave: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(parametros).where(eq(parametros.chave, chave)).limit(1);
  return result[0] ?? null;
}

export async function setParametro(chave: string, valor: string, descricao?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(parametros)
    .values({ chave, valor, descricao })
    .onDuplicateKeyUpdate({ set: { valor, ...(descricao ? { descricao } : {}) } });
}

// ─── Simulações ──────────────────────────────────────────────────────────────

export async function getSimulacoes(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(simulacoes);
  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
}

export async function saveSimulacao(data: typeof simulacoes.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(simulacoes).values(data);
  return (result as any)[0]?.insertId ?? null;
}

export async function deleteSimulacao(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(simulacoes).where(eq(simulacoes.id, id));
}
