import { z } from "zod";

export const effectiveOnSchema = z.enum(["current_cycle", "next_cycle"]);
