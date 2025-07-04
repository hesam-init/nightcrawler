import { HttpStatusCode } from "axios";
import * as cheerio from "cheerio";
import ora from "ora";
import os from "os";
import type { ChannelsListCsvSchema } from "types/env";
import { FileFramework } from "@/frameworks/file/file.framework";
import { TelegramFramework } from "../axios/telegram.framework";

interface ConfigFileIds {
	[key: string]: number;
}

interface Configs {
	[key: string]: string;
}

interface MyRegex {
	[key: string]: string;
}

const PROTOCOLS = ["vless", "vmess", "ss", "trojan"];

const telegramService = new TelegramFramework({
	debug: false,
});

export class V2RayCollector {
	private telegram: boolean = true;
	private maxPages: number = 1;
	private maxMessages: number = 100;
	private configsNames: string = "@";
	private maxConcurrency: number;

	private configs: Configs = {
		ss: "",
		vmess: "",
		trojan: "",
		vless: "",
		mixed: "",
	};

	private configFileIds: ConfigFileIds = {
		ss: 0,
		vmess: 0,
		trojan: 0,
		vless: 0,
		mixed: 0,
	};

	private myRegex: MyRegex = {
		ss: `(...ss:|^ss:)\\/\\/.+?(%3A%40|#)`,
		vmess: `vmess:\\/\\/.+`,
		trojan: `trojan:\\/\\/.+?(%3A%40|#)`,
		vless: `vless:\\/\\/.+?(%3A%40|#)`,
	};

	private sort: boolean;

	constructor(sort: boolean = false, maxConcurrency?: number) {
		this.sort = sort;

		this.maxConcurrency = maxConcurrency || os.cpus().length;

		console.log(`Using ${this.maxConcurrency} concurrent workers`);
	}

	// Enhanced concurrent processing with full CPU utilization
	async mainFullyConcurrent(): Promise<void> {
		try {
			if (this.telegram) {
				await telegramService.init();

				const fileData = await FileFramework.readFileContent(
					"assets/channels-list.csv"
				);

				const channels =
					FileFramework.parseCSV<ChannelsListCsvSchema>(fileData);

				console.log(
					`Processing ${channels.length} channels with ${this.maxConcurrency} concurrent workers`
				);

				// Process channels in batches based on CPU cores
				const results = await this.processBatches(
					channels,
					this.maxConcurrency
				);

				console.log(`\nCompleted processing ${results.length} channels`);
				console.log(
					`Successful: ${results.filter((r) => r.status === "fulfilled").length}`
				);
				console.log(
					`Failed: ${results.filter((r) => r.status === "rejected").length}`
				);
			}
		} catch (error) {
			console.error("Error while scraping:", error);
		}
	}

	// Process channels in concurrent batches
	private async processBatches(
		channels: ChannelsListCsvSchema,
		batchSize: number
	): Promise<PromiseSettledResult<any>[]> {
		const results: PromiseSettledResult<any>[] = [];

		for (let i = 0; i < channels.length; i += batchSize) {
			const batch = channels.slice(i, i + batchSize);

			console.log(batch);

			console.log(
				`\nProcessing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(channels.length / batchSize)}`
			);

			const batchPromises = batch.map((channel, index) =>
				this.processChannelConcurrent(channel, i + index + 1)
			);

			const batchResults = await Promise.allSettled(batchPromises);
			results.push(...batchResults);

			if (i + batchSize < channels.length) {
				await this.delay(100);
			}
		}

		return results;
	}

	// Process a single channel with concurrent page requests
	private async processChannelConcurrent(
		channel: ChannelsListCsvSchema[number],
		channelNumber: number
	): Promise<{ channelId: string; configCount: number }> {
		const spinner = ora(`[${channelNumber}] Crawling ${channel.id}`).start();

		try {
			if (!channel.id) {
				throw new Error(`Channel ID is missing for channel: ${channel}`);
			}

			const maxPages: number = channel.maxPages || this.maxPages;
			if (maxPages <= 0) {
				throw new Error(
					`Max Pages is less than or equal to 0 for channel: ${channel.id}`
				);
			}

			// Get page URLs for concurrent processing
			const pageUrls = await this.generatePageUrls(channel, maxPages);

			if (pageUrls.length === 0) {
				throw new Error(`No valid pages found for channel: ${channel.id}`);
			}

			spinner.text = `[${channelNumber}] Downloading ${pageUrls.length} pages for ${channel.id}`;

			// Process pages concurrently with controlled concurrency
			const pageResults = await this.processPagesConcurrently(
				pageUrls,
				channel.id
			);

			// Extract configs from all pages
			const arrayProxies = this.extractConfigsFromPages(pageResults);

			spinner.succeed(
				`[${channelNumber}] Crawled ${channel.id} with ${arrayProxies.length} configs!`
			);

			// Save results
			await FileFramework.writeHtmlToFile(arrayProxies.join("\n"), {
				prefix: `${channel.id}`,
			});

			return { channelId: channel.id, configCount: arrayProxies.length };
		} catch (error) {
			spinner.fail(
				`[${channelNumber}] Failed to crawl ${channel.id}: ${error.message}`
			);
			throw error;
		}
	}

	// Generate page URLs for concurrent processing
	private async generatePageUrls(
		channel: ChannelsListCsvSchema[number],
		maxPages: number
	): Promise<string[]> {
		const paginatedLink = `${channel.id}`;
		const response = await telegramService.get<string>(paginatedLink, {
			returnConfig: true,
		});

		if (response.status !== HttpStatusCode.Ok) {
			throw new Error(`Failed to get initial page for ${channel.id}`);
		}

		const body = cheerio.load(response.data || "");
		const canonical = body("head link")
			.filter((_i, el) => body(el).attr("rel") === "canonical")
			.attr("href");

		if (!canonical) {
			throw new Error(`Channel doesn't support crawling: ${channel.id}`);
		}

		const lastMessage = body(
			".tgme_widget_message_wrap .js-widget_message"
		).last();
		let nextIndex = Number(lastMessage.attr("data-post")?.split("/")[1]) || 0;

		const pageUrls: string[] = [];
		for (let i = 0; i < maxPages; i++) {
			const url = `${channel.id}${nextIndex === 0 ? "" : `?before=${nextIndex}`}`;
			pageUrls.push(url);
			nextIndex = Math.max(0, nextIndex - 20);
		}

		return pageUrls;
	}

	// Process pages with controlled concurrency
	private async processPagesConcurrently(
		pageUrls: string[],
		channelId: string
	): Promise<Array<{ body: cheerio.CheerioAPI | null; error: string | null }>> {
		const pagePromises = pageUrls.map(async (url, index) => {
			try {
				const response = await telegramService.get<string>(url, {
					returnConfig: true,
				});

				if (response.status !== HttpStatusCode.Ok) {
					return {
						body: null,
						error: `HTTP ${response.status}`,
					};
				}

				return {
					body: cheerio.load(response.data || ""),
					error: null,
				};
			} catch (error) {
				return {
					body: null,
					error: error.message,
				};
			}
		});

		const results = await Promise.allSettled(pagePromises);

		return results.map((result, index) => {
			if (result.status === "fulfilled") {
				return result.value;
			} else {
				console.error(
					`Error processing page ${index + 1} for ${channelId}:`,
					result.reason
				);
				return { body: null, error: result.reason };
			}
		});
	}

	// Extract configs from page results
	private extractConfigsFromPages(
		pageResults: Array<{
			body: cheerio.CheerioAPI | null;
			error: string | null;
		}>
	): string[] {
		const $ = cheerio.load('<div id="all-messages"></div>');
		const arrayProxies: string[] = [];

		// Combine all page data
		pageResults.forEach((result) => {
			if (result.body && !result.error) {
				result.body(".tgme_widget_message_wrap").each((msgIndex, element) => {
					$("#all-messages").append(result.body!.html(element));
				});
			}
		});

		// Extract configs from combined data
		$(".tgme_widget_message_text").each((j, element) => {
			const messageText = $(element);
			const replacedMessage = messageText.html()?.replace(/<br\/?>/g, "\n");
			const tempMessage = cheerio.load(replacedMessage || "");
			const correctMessage = tempMessage.text();
			const lines = correctMessage.trim().split("\n");

			lines.forEach((line) => {
				const protocols = PROTOCOLS.filter((protocol) =>
					line.startsWith(protocol)
				);
				if (protocols.length > 0) {
					arrayProxies.push(line);
				}
			});
		});

		return arrayProxies;
	}

	// Utility function for delays
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	// Enhanced version of existing mainConcurrent with better error handling
	async mainConcurrent(): Promise<void> {
		try {
			if (this.telegram) {
				const fileData = await FileFramework.readFileContent(
					"assets/channels-list.csv"
				);

				const channels =
					FileFramework.parseCSV<ChannelsListCsvSchema>(fileData);
				await telegramService.init();

				// Process channels with controlled concurrency
				const semaphore = new Semaphore(this.maxConcurrency);
				const channelPromises = channels.map((channel, index) =>
					semaphore.acquire().then(async (release) => {
						try {
							return await this.processChannelConcurrent(channel, index + 1);
						} finally {
							release();
						}
					})
				);

				const results = await Promise.allSettled(channelPromises);

				console.log(`\nProcessing complete!`);
				console.log(
					`Successful: ${results.filter((r) => r.status === "fulfilled").length}`
				);
				console.log(
					`Failed: ${results.filter((r) => r.status === "rejected").length}`
				);
			}
		} catch (error) {
			console.error("Error while scraping:", error);
		}
	}

	// ... rest of your existing methods remain the same ...
	private async crawl(
		channelLink?: string,
		hasAllMessagesFlag: boolean = false
	): Promise<void> {}

	private async loadMore(link: string): Promise<cheerio.CheerioAPI> {
		const response = await telegramService.get<string>(link);
		return cheerio.load(response.data);
	}

	private async crawlForV2ray(
		$: cheerio.CheerioAPI,
		channelLink: string,
		hasAllMessagesFlag: boolean
	): Promise<void> {
		// ... existing implementation ...
	}
}

class Semaphore {
	private permits: number;
	private queue: Array<() => void> = [];

	constructor(permits: number) {
		this.permits = permits;
	}

	async acquire(): Promise<() => void> {
		return new Promise((resolve) => {
			if (this.permits > 0) {
				this.permits--;
				resolve(() => this.release());
			} else {
				this.queue.push(() => {
					this.permits--;
					resolve(() => this.release());
				});
			}
		});
	}

	private release(): void {
		this.permits++;
		if (this.queue.length > 0) {
			const next = this.queue.shift()!;
			next();
		}
	}
}
