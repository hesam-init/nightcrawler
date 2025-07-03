import type { EnvSchema } from "./env.validation";

export const env: EnvSchema = {
	TELEGRAM_BASE_URL: process.env.TELEGRAM_BASE_URL || "",
	PROXY_URL: process.env.PROXY_URL || "",
};
