import { Resolver } from "dns";
import { promisify } from "util";
import { FileFramework } from "@/frameworks/file/file.framework";

export class DNSBatchResolver {
	private resolver: Resolver;
	private resolve4Async: (hostname: string) => Promise<string[]>;

	constructor(dnsServers: string[] = ["127.0.0.1"]) {
		this.resolver = new Resolver();
		this.resolver.setServers(dnsServers);
		this.resolve4Async = promisify(this.resolver.resolve4.bind(this.resolver));
	}

	async resolveDomain(
		domain: string
	): Promise<{ domain: string; addresses?: string[]; error?: string }> {
		try {
			const addresses = await this.resolve4Async(domain.trim());
			return { domain, addresses };
		} catch (err: any) {
			return { domain, error: err.code || err.message };
		}
	}

	async resolveDomainsWithLimit(
		domains: string[],
		concurrency: number = 8
	): Promise<void> {
		const results: Array<{
			domain: string;
			addresses?: string[];
			error?: string;
		}> = [];

		// Process domains in batches with concurrency limit
		for (let i = 0; i < domains.length; i += concurrency) {
			const batch = domains.slice(i, i + concurrency);
			const batchPromises = batch.map((domain) => this.resolveDomain(domain));

			const batchResults = await Promise.allSettled(batchPromises);

			// Process results and output immediately
			batchResults.forEach((result, index) => {
				if (result.status === "fulfilled") {
					const { domain, addresses, error } = result.value;
					process.stdout.write(`${domain}: `);

					if (error) {
						console.log(error);
					} else {
						console.log(addresses);
					}
				} else {
					const domain = batch[index];
					console.log(`${domain}: ${result.reason}`);
				}
			});
		}
	}

	// Alternative: Use a proper semaphore-style approach for true concurrency control
	async resolveDomainsWithSemaphore(
		domains: string[],
		maxConcurrency: number = 8
	): Promise<void> {
		let activeCount = 0;
		let completedCount = 0;
		let domainIndex = 0;

		return new Promise((resolve) => {
			const processNext = async () => {
				if (domainIndex >= domains.length) {
					if (completedCount >= domains.length) {
						resolve();
					}
					return;
				}

				if (activeCount >= maxConcurrency) {
					return;
				}

				const currentIndex = domainIndex++;
				const domain = domains[currentIndex];
				activeCount++;

				try {
					const result = await this.resolveDomain(String(domain));

					process.stdout.write(`${result.domain}: `);

					if (result.error) {
						console.log(result.error);
					} else {
						console.log(result.addresses);
					}
				} catch (err: any) {
					console.log(`${domain}: ${err.message}`);
				} finally {
					activeCount--;
					completedCount++;

					// Start next batch
					setImmediate(() => {
						processNext();
						processNext(); // Try to fill the concurrency slot
					});
				}
			};

			// Start initial batch
			for (let i = 0; i < Math.min(maxConcurrency, domains.length); i++) {
				processNext();
			}
		});
	}
}
