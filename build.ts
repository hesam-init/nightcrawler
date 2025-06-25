import * as Bun from "bun";

(async function main() {
   const result = await Bun.build({
      entrypoints: ["./index.ts"],
      env: "disable",
      target: "bun",
      outdir: "./dist",
      packages: "bundle",
      sourcemap: "linked",
      splitting: true,
      format: "esm",
      minify: true
   });

   console.log(result.outputs);
   console.log(result.success ? "Build successful" : "Build failed");
}())
