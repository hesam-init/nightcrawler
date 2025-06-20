import { parse as csvParse } from 'csv-parse/sync';
import * as fs from 'fs';

export class FileFramework {
   public static readFileContent(filePath: string): string {
      try {
         return fs.readFileSync(filePath, 'utf-8');
      } catch (error) {
         console.error(`Error reading file ${filePath}:`, error);
         throw error;
      }
   }

   public static writeToFile(fileContent: string, filePath: string): void {
      try {
         fs.writeFileSync(filePath, fileContent, 'utf-8');
         console.log(`File ${filePath} written successfully`);
      } catch (error) {
         console.error("Error writing file:", error);
      }
   }

   public static parseCSV<T>(content: string): T {
      try {
         const records = csvParse(content, {
            columns: true,
            skip_empty_lines: true
         });

         return records;
      } catch (error) {
         console.error("Error parsing CSV:", error);
         throw error;
      }
   }
}