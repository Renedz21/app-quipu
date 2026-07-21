import { createAuth } from "../auth";

// Export a static instance for Better Auth schema generation
// biome-ignore lint/suspicious/noExplicitAny: schema CLI stub; full ctx only at runtime
export const auth = createAuth({} as any);
