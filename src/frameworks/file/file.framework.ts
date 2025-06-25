import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parse as csvParse } from "csv-parse/sync";

interface FileWriteOptions {
	prefix?: string;
	directory?: string;
	extension?: string;
}

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class FileFramework {
	public static async readFileContent(filePath: string): Promise<string> {
		try {
			return fs.readFile(filePath, "utf-8");
		} catch (error) {
			console.error(`Error reading file ${filePath}:`, error);
			throw error;
		}
	}

	public static async writeHtmlToFile<T = string>(
		data: T,
		options: FileWriteOptions = {}
	): Promise<string> {
		try {
			const {
				prefix = "data",
				directory = "html-logs",
				extension = "html",
			} = options;

			const logsDir = path.join(process.cwd(), directory);
			await fs.mkdir(logsDir, { recursive: true });

			const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
			const filename = `${prefix}-${timestamp}.${extension}`;
			const filepath = path.join(logsDir, filename);

			await fs.writeFile(filepath, String(data), "utf-8");

			console.log(`Data written to: ${filepath}`);
			return filepath;
		} catch (error) {
			console.error("Error writing file:", error);
			throw error;
		}
	}

	public static async writeToFile(
		fileContent: string,
		filePath: string
	): Promise<void> {
		try {
			await fs.writeFile(filePath, fileContent, "utf-8");
			console.log(`File ${filePath} written successfully`);
		} catch (error) {
			console.error("Error writing file:", error);
		}
	}

	public static parseCSV<T>(content: string): T {
		try {
			const records = csvParse(content, {
				columns: true,
				skip_empty_lines: true,
			});

			return records;
		} catch (error) {
			console.error("Error parsing CSV:", error);
			throw error;
		}
	}
}
