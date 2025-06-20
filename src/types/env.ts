import type { EnvSchema } from "@/bootstrap/env.validation";

declare module "bun" {
   interface Env extends EnvSchema { }
}