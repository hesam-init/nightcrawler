import type { EnvSchema } from "@/bootstrap/env.validation";

declare module "bun" {
	interface Env extends EnvSchema {}
}

export type ChannelsListCsvSchema = Array<{
	id: string;
	maxPages: number;
}>;

export type DohListCsvSchema = Array<{
	url: string;
}>;
