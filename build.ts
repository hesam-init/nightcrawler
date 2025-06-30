import * as Bun from "bun";

(async function main() {
	const scraperBuild = await Bun.build({
		entrypoints: ["./scraper.ts"],
		env: "disable",
		target: "bun",
		outdir: "./dist/scraper",
		packages: "bundle",
		sourcemap: "linked",
		splitting: true,
		format: "esm",
		minify: true,
	});

	const dnsBuild = await Bun.build({
		entrypoints: ["./dns.ts"],
		env: "disable",
		target: "bun",
		outdir: "./dist/dns",
		packages: "bundle",
		sourcemap: "linked",
		splitting: true,
		format: "esm",
		minify: true,
	});

	console.log(
		scraperBuild.success ? "Scraper Build successful" : "Scraper Build failed"
	);

	console.log(dnsBuild.success ? "DNS Build successful" : "DNS Build failed");
})();
