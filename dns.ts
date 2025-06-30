import type { DohListCsvSchema } from "types/env";
import { DNSBatchResolver } from "@/frameworks/dns/dns.framework";
import { FileFramework } from "@/frameworks/file/file.framework";

async function main() {
	try {
		const fileContent = await FileFramework.readFileContent(
			"assets/doh-list.csv"
		);

		const dohList = FileFramework.parseCSV<DohListCsvSchema>(fileContent);

		const domains = dohList.map((doh) => {
			return doh.url;
		});

		console.log(domains);

		if (domains.length === 0) {
			console.log("No domains found in dns.list");
			return;
		}

		console.log(
			`Processing ${domains.length} domains with concurrency limit...`
		);

		const resolver = new DNSBatchResolver(["127.0.0.1"]);
		const concurrency = 16;

		// Use semaphore approach for better concurrency control
		await resolver.resolveDomainsWithSemaphore(domains, concurrency);

		console.log("\nDNS resolution completed.");
	} catch (error: any) {
		console.error("Error:", error.message);
		process.exit(1);
	}
}

// Run if this file is executed directly
if (require.main === module) {
	main().catch(console.error);
}
