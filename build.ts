import * as Bun from "bun";
import ora from "ora";

const commonBuildOptions: Bun.BuildConfig = {
	env: "disable",
	packages: "bundle",
	sourcemap: "linked",
	format: "esm",
	splitting: true,
	minify: true,
};

(async function main() {
	const spinner = ora("Building Nightcrawler...").start();

	const scraperBuild = await Bun.build({
		...commonBuildOptions,
		entrypoints: ["./scraper.ts"],
		outdir: "./dist/scraper",
		env: "disable",
		target: "bun",
	});

	const dnsBuild = await Bun.build({
		...commonBuildOptions,
		entrypoints: ["./dns.ts"],
		outdir: "./dist/dns",
		env: "disable",
		target: "bun",
	});

	const scraperNodeBuild = await Bun.build({
		entrypoints: ["./scraper.ts"],
		env: "inline",
		target: "node",
		outdir: "./dist/scraper-node",
		packages: "bundle",
		sourcemap: "linked",
		splitting: true,
		format: "esm",
		minify: false,
	});

	spinner.succeed("Nightcrawler Build completed");

	console.log(
		scraperBuild.success ? "Scraper Build successful" : "Scraper Build failed"
	);

	console.log(
		scraperNodeBuild.success
			? "Scraper Node Build successful"
			: "Scraper Node Build failed"
	);

	console.log(dnsBuild.success ? "DNS Build successful" : "DNS Build failed");
})();
