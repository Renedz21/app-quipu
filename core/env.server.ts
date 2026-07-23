import { parseServerEnv, type ServerEnv } from "@/core/env";

/**
 * Variables de servidor. Importar solo desde RSC, Route Handlers, Server Actions
 * o `instrumentation.ts` (no desde Client Components ni `instrumentation-client.ts`).
 */
export const serverEnv: ServerEnv = parseServerEnv();
