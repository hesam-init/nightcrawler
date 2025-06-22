import chalk from "chalk";
import { type TypeOf, z } from "zod";

export type EnvSchema = TypeOf<typeof zodEnv>;

const SUPPORTED_PROTOCOLS = ["vless", "vmess", "ss", "trojan"] as const;

export const zodEnv = z.object({
   TELEGRAM_BASE_URL: z
      .string({
         required_error: "TELEGRAM_BASE_URL is required",
      })
      .min(1, "TELEGRAM_BASE_URL is required and cannot be empty")
      .url({
         message: "TELEGRAM_BASE_URL must be a valid URL",
      }),

   PROXY_URL: z.
      string({
         description: "HTTP proxy for requests"
      }).
      regex(/^http:\/\/.+:\d+$/, "Proxy must start with http:// and include a port (e.g., http://localhost:2080)")
      .optional()

   // .min(1, "MODEM_PASSWORD is required and cannot be empty"),
   // MODEM_MODEL: z.enum(SUPPORTED_MODELS, {
   //    required_error: "MODEM_MODEL is required",
   // }),
});

export function envValidation(): Promise<EnvSchema> {
   return new Promise((resolve, reject) => {
      const parsed = zodEnv.safeParse(process.env);

      if (!parsed.success) {
         parsed.error.issues.map((issue) => {
            const path = issue.path.toString() as keyof EnvSchema;

            console.error(
               chalk.bgRed.white.bold(" ERROR "),
               chalk.red(`${path}`),
               chalk.white(`\n➤ ${issue.message}`),
               // path === "MODEM_MODEL"
               //    ? chalk.white(
               //       `\n➤ Supported models: ${SUPPORTED_MODELS.join(", ")}`
               //    )
               //    : "",
               "\n"
            );
         });

         // const errorMessage = Object.entries(parsed.error.format())
         // 	.map(([key, value]) => {
         // 		if (key === "_errors") return "";
         // 		// @ts-ignore
         // 		return `${chalk.bold.red(`➤ ${key}:`)} ${value._errors?.join(", ")}`;
         // 	})
         // 	.join("\n");

         // console.error(
         // 	chalk.bgRed.white.bold(" ERROR "),
         // 	chalk.red("Invalid environment variables:\n"),
         // 	errorMessage
         // );

         reject("Invalid environment variables");
      } else {
         resolve(parsed.data);
      }
   });
}