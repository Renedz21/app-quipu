import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalQuery } from "../_generated/server";
import {
  APP_DATA_SNAPSHOT_FORMAT,
  APP_DATA_TABLES,
} from "../lib/appDataTables";

const countsValidator = v.record(v.string(), v.number());

const summaryReturn = v.object({
  convexDeployment: v.string(),
  formatVersion: v.literal(APP_DATA_SNAPSHOT_FORMAT),
  exportedAt: v.number(),
  counts: countsValidator,
  totalDocuments: v.number(),
});

/**
 * Conteo rápido antes/después de deploy o reset (Dashboard / CLI).
 * npx convex run --prod ops/appDataSnapshot:summarizeAppData
 */
export const summarizeAppData = internalQuery({
  args: {},
  returns: summaryReturn,
  handler: async (ctx) => {
    const counts: Record<string, number> = {};
    let totalDocuments = 0;

    for (const table of APP_DATA_TABLES) {
      const docs = await ctx.db.query(table).collect();
      counts[table] = docs.length;
      totalDocuments += docs.length;
    }

    return {
      convexDeployment: process.env.CONVEX_DEPLOYMENT ?? "unknown",
      formatVersion: APP_DATA_SNAPSHOT_FORMAT,
      exportedAt: Date.now(),
      counts,
      totalDocuments,
    };
  },
});

const collectReturn = v.object({
  convexDeployment: v.string(),
  formatVersion: v.literal(APP_DATA_SNAPSHOT_FORMAT),
  exportedAt: v.number(),
  counts: countsValidator,
  tables: v.record(v.string(), v.array(v.any())),
  notes: v.array(v.string()),
});

/**
 * Lee todas las tablas de dominio. Solo vía internalQuery (CLI/dashboard).
 */
export const collectAppDataSnapshot = internalQuery({
  args: {},
  returns: collectReturn,
  handler: async (ctx) => {
    const tables: Record<string, unknown[]> = {};
    const counts: Record<string, number> = {};

    for (const table of APP_DATA_TABLES) {
      const docs = await ctx.db.query(table).collect();
      tables[table] = docs;
      counts[table] = docs.length;
    }

    return {
      convexDeployment: process.env.CONVEX_DEPLOYMENT ?? "unknown",
      formatVersion: APP_DATA_SNAPSHOT_FORMAT,
      exportedAt: Date.now(),
      counts,
      tables,
      notes: [
        "Snapshot de tablas app v2.5. No incluye user/session/passkey de Better Auth.",
        "Import automático a otro schema no está soportado: conservar JSON y arrancar prod desde cero.",
        "Legacy v2.0 en el mismo deployment puede fallar validación al push schema v2.5; exportar ANTES del push.",
      ],
    };
  },
});

const exportReturn = v.object({
  storageId: v.id("_storage"),
  downloadUrl: v.union(v.string(), v.null()),
  exportedAt: v.number(),
  counts: countsValidator,
  totalDocuments: v.number(),
  convexDeployment: v.string(),
  formatVersion: v.literal(APP_DATA_SNAPSHOT_FORMAT),
});

/**
 * Exporta dominio app a JSON en Convex file storage + URL de descarga.
 *
 * Prod (patient-chihuahua-640 u otro):
 *   npx convex run --prod ops/appDataSnapshot:exportAppDataSnapshot
 *
 * Descarga el JSON desde la URL del resultado (caduca; guardar en disco).
 */
export const exportAppDataSnapshot = internalAction({
  args: {
    label: v.optional(v.string()),
  },
  returns: exportReturn,
  handler: async (ctx, args) => {
    const payload = await ctx.runQuery(
      internal.ops.appDataSnapshot.collectAppDataSnapshot,
      {},
    );

    const envelope = {
      label: args.label ?? "pre-v25-cutover",
      ...payload,
    };

    const json = JSON.stringify(envelope, null, 2);
    const storageId = await ctx.storage.store(
      new Blob([json], { type: "application/json" }),
    );
    const downloadUrl = await ctx.storage.getUrl(storageId);

    const totalDocuments = Object.values(payload.counts).reduce(
      (sum, n) => sum + n,
      0,
    );

    return {
      storageId,
      downloadUrl,
      exportedAt: payload.exportedAt,
      counts: payload.counts,
      totalDocuments,
      convexDeployment: payload.convexDeployment,
      formatVersion: APP_DATA_SNAPSHOT_FORMAT,
    };
  },
});

const cutoverConfirm = v.literal("EXPORTED_BACKUP_AND_RESET_V25");

const cutoverReturn = v.object({
  export: exportReturn,
  reset: v.object({
    deleted: v.record(v.string(), v.number()),
  }),
});

/**
 * **Destructivo.** Exporta snapshot y luego borra app + auth (mismo flujo que resetDb.resetAll).
 * Solo después de guardar el JSON descargado.
 *
 *   npx convex run --prod ops/appDataSnapshot:cutoverToFreshV25Deploy '{"confirm":"EXPORTED_BACKUP_AND_RESET_V25"}'
 */
export const cutoverToFreshV25Deploy = internalAction({
  args: {
    confirm: cutoverConfirm,
    label: v.optional(v.string()),
  },
  returns: cutoverReturn,
  handler: async (ctx, args) => {
    void args.confirm;

    const payload = await ctx.runQuery(
      internal.ops.appDataSnapshot.collectAppDataSnapshot,
      {},
    );
    const json = JSON.stringify(
      { label: args.label ?? "cutover-v25", ...payload },
      null,
      2,
    );
    const storageId = await ctx.storage.store(
      new Blob([json], { type: "application/json" }),
    );
    const downloadUrl = await ctx.storage.getUrl(storageId);
    const totalDocuments = Object.values(payload.counts).reduce(
      (sum, n) => sum + n,
      0,
    );

    const exportResult = {
      storageId,
      downloadUrl,
      exportedAt: payload.exportedAt,
      counts: payload.counts,
      totalDocuments,
      convexDeployment: payload.convexDeployment,
      formatVersion: APP_DATA_SNAPSHOT_FORMAT,
    };

    const resetResult: { deleted: Record<string, number> } =
      await ctx.runAction(internal.resetDb.resetAll, {});

    return {
      export: exportResult,
      reset: { deleted: resetResult.deleted },
    };
  },
});
