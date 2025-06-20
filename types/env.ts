import type { EnvSchema } from "@/bootstrap/env.validation";

declare module "bun" {
   interface Env extends EnvSchema { }
}

export type CsvSchema = Array<{
   url: string;
   allMessageFlag: boolean
}>