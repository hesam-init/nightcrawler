import { FileFramework } from '@/frameworks/file/file.framework';
import * as cheerio from 'cheerio';
import type { CsvSchema } from 'types/env';
import { TelegramFramework } from '../axios/telegram.framework';

interface ConfigFileIds {
   [key: string]: number;
}

interface Configs {
   [key: string]: string;
}

interface MyRegex {
   [key: string]: string;
}

const httpService = new TelegramFramework({
   debug: false
})

export class V2RayCollector {
   private maxMessages = 100;
   private configsNames = "@Vip_Security join us";
   private configs: Configs = {
      ss: "",
      vmess: "",
      trojan: "",
      vless: "",
      mixed: ""
   };

   private configFileIds: ConfigFileIds = {
      ss: 0,
      vmess: 0,
      trojan: 0,
      vless: 0,
      mixed: 0
   };

   private myRegex: MyRegex = {
      ss: `(...ss:|^ss:)\\/\\/.+?(%3A%40|#)`,
      vmess: `vmess:\\/\\/.+`,
      trojan: `trojan:\\/\\/.+?(%3A%40|#)`,
      vless: `vless:\\/\\/.+?(%3A%40|#)`
   };

   private sort: boolean;

   constructor(sort: boolean = false) {
      this.sort = sort;
   }

   async main(): Promise<void> {
      try {
         console.log("Starting V2Ray config collection...");

         const fileData = await FileFramework.readFileContent("channels.csv");
         const channels = FileFramework.parseCSV<CsvSchema>(fileData);

         // Loop through the channels list
         for (const channel of channels) {
            // Change URL to Telegram web URL
            channel.url = this.changeUrlToTelegramWebUrl(channel.url);

            const response = await httpService.get<string>(channel.url);

            await FileFramework.writeHtmlToFile(response.data)
            const $ = cheerio.load(response.data);

            console.log("\n\n---------------------------------------");
            console.log(`Crawling ${channel.url}`);

            await this.crawlForV2ray($, channel.url, channel.allMessageFlag);

            console.log(`Crawled ${channel.url}!`);
            console.log("---------------------------------------\n\n");
         }

         console.log("Creating output files!");

         // Process configs
         // for (const [proto, configContent] of Object.entries(this.configs)) {
         //    let lines = this.removeDuplicate(configContent);
         //    lines = this.addConfigNames(lines, proto);

         //    if (this.sort) {
         //       // From latest to oldest mode
         //       const linesArr = lines.split('\n');
         //       const reversed = this.reverse(linesArr);
         //       lines = reversed.join('\n');
         //    } else {
         //       // From oldest to latest mode
         //       const linesArr = lines.split('\n');
         //       const reversed1 = this.reverse(linesArr);
         //       const reversed2 = this.reverse(reversed1);
         //       lines = reversed2.join('\n');
         //    }

         //    lines = lines.trim();
         //    FileFramework.writeToFile(lines, `${proto}_iran.txt`);
         // }

         console.log("All Done :D");
      } catch (error) {
         console.error("Error in main:", error);
      }
   }

   private async loadMore(link: string): Promise<cheerio.CheerioAPI> {
      const response = await httpService.get<string>(link);

      return cheerio.load(response.data);
   }


   private async crawlForV2ray($: cheerio.CheerioAPI, channelLink: string, hasAllMessagesFlag: boolean): Promise<void> {
      // Update DOM to include more messages
      const messages = $('.tgme_widget_message_wrap').length;
      const lastMessage = $('.tgme_widget_message_wrap .js-widget_message').last();
      const link = lastMessage.attr('data-post');

      if (messages < this.maxMessages && link) {
         const number = link.split('/')[1];
         $ = await this.getMessages(this.maxMessages, $, number, channelLink);
      }

      // Extract V2Ray configs based on message type
      if (hasAllMessagesFlag) {
         // Get all messages and check for V2Ray configs
         $('.tgme_widget_message_text').each((j, element) => {
            let messageText = $(element).html() || '';
            let str = messageText.replace(/<br\/?>/g, '\n');
            const tempDoc = cheerio.load(str);
            messageText = tempDoc.text();
            const line = messageText.trim();
            const lines = line.split('\n');

            for (const data of lines) {
               const extractedConfigs = this.extractConfig(data, []).split('\n');
               for (let extractedConfig of extractedConfigs) {
                  extractedConfig = extractedConfig.replace(/ /g, '');
                  if (extractedConfig !== "") {
                     // Check if it is vmess or not
                     const regex = new RegExp(this.myRegex.vmess, 'g');
                     const matches = regex.exec(extractedConfig);

                     if (matches && matches.length > 0) {
                        extractedConfig = this.editVmessPs(extractedConfig, "mixed", false);
                        if (extractedConfig !== "") {
                           this.configs.mixed += extractedConfig + '\n';
                        }
                     } else {
                        this.configs.mixed += extractedConfig + '\n';
                     }
                  }
               }
            }
         });
      } else {
         // Get only messages that are inside code or pre tag
         $('code, pre').each((j, element) => {
            let messageText = $(element).html() || '';
            let str = messageText.replace(/<br\/?>/g, '\n');
            const tempDoc = cheerio.load(str);
            messageText = tempDoc.text();
            const line = messageText.trim();
            const lines = line.split('\n');

            for (const data of lines) {
               const extractedConfigs = this.extractConfig(data, []).split('\n');

               for (const [protoRegex, regexValue] of Object.entries(this.myRegex)) {
                  for (let extractedConfig of extractedConfigs) {
                     const regex = new RegExp(regexValue, 'g');
                     const matches = regex.exec(extractedConfig);

                     if (matches && matches.length > 0) {
                        extractedConfig = extractedConfig.replace(/ /g, '');
                        if (extractedConfig !== "") {
                           if (protoRegex === "vmess") {
                              extractedConfig = this.editVmessPs(extractedConfig, protoRegex, false);
                              if (extractedConfig !== "") {
                                 this.configs[protoRegex] += extractedConfig + '\n';
                              }
                           } else if (protoRegex === "ss") {
                              const prefix = matches[0].split("ss://")[0];
                              if (prefix === "") {
                                 this.configs[protoRegex] += extractedConfig + '\n';
                              }
                           } else {
                              this.configs[protoRegex] += extractedConfig + '\n';
                           }
                        }
                     }
                  }
               }
            }
         });
      }
   }

   private addConfigNames(config: string, configType: string): string {
      const configs = config.split('\n');
      let newConfigs = "";

      for (const [protoRegex, regexValue] of Object.entries(this.myRegex)) {
         for (let extractedConfig of configs) {
            const regex = new RegExp(regexValue, 'g');
            const matches = regex.exec(extractedConfig);

            if (matches && matches.length > 0) {
               extractedConfig = extractedConfig.replace(/ /g, '');

               if (extractedConfig !== "") {
                  if (protoRegex === "vmess") {
                     extractedConfig = this.editVmessPs(extractedConfig, configType, true);
                     if (extractedConfig !== "") {
                        newConfigs += extractedConfig + '\n';
                     }
                  } else if (protoRegex === "ss") {
                     const prefix = matches[0].split("ss://")[0];
                     if (prefix === "") {
                        this.configFileIds[configType] += 1;
                        newConfigs += extractedConfig + this.configsNames + " - " + this.configFileIds[configType] + '\n';
                     }
                  } else {
                     this.configFileIds[configType] += 1;
                     newConfigs += extractedConfig + this.configsNames + " - " + this.configFileIds[configType] + '\n';
                  }
               }
            }
         }
      }

      return newConfigs;
   }

   private extractConfig(txt: string, tempConfigs: string[]): string {
      for (const [protoRegex, regexValue] of Object.entries(this.myRegex)) {
         const regex = new RegExp(regexValue, 'g');
         const matches = regex.exec(txt);
         let extractedConfig = "";

         if (matches && matches.length > 0) {
            if (protoRegex === "ss") {
               const prefix = matches[0].split("ss://")[0];
               if (prefix === "") {
                  extractedConfig = '\n' + matches[0];
               } else if (prefix !== "vle") {
                  const d = matches[0].split("ss://");
                  extractedConfig = '\n' + "ss://" + d[1];
               }
            } else if (protoRegex === "vmess") {
               extractedConfig = '\n' + matches[0];
            } else {
               extractedConfig = '\n' + matches[0];
            }

            tempConfigs.push(extractedConfig);
            txt = txt.replace(matches[0], '');
            return this.extractConfig(txt, tempConfigs);
         }
      }

      return tempConfigs.join('\n');
   }

   private editVmessPs(config: string, fileName: string, addConfigName: boolean): string {
      if (config === "") return "";

      const slice = config.split("vmess://");
      if (slice.length > 1) {
         try {
            const decodedBytes = Buffer.from(slice[1], 'base64').toString('utf-8');
            const data = JSON.parse(decodedBytes);

            if (addConfigName) {
               this.configFileIds[fileName] += 1;
               data.ps = this.configsNames + " - " + this.configFileIds[fileName];
            } else {
               data.ps = "";
            }

            const jsonData = JSON.stringify(data);
            const base64Encoded = Buffer.from(jsonData).toString('base64');

            return "vmess://" + base64Encoded;
         } catch (error) {
            console.error("Error processing vmess config:", error);
            return "";
         }
      }

      return "";
   }

   private async getMessages(length: number, $: cheerio.CheerioAPI, number: string, channel: string): Promise<cheerio.CheerioAPI> {
      const newDoc = await this.loadMore(channel + "?before=" + number);

      // Merge the documents
      const body1 = $.html();
      const body2 = newDoc.html();
      const combined = cheerio.load(body1 + body2);

      const messages = combined('.js-widget_message_wrap').length;

      if (messages > length) {
         return combined;
      } else {
         const num = parseInt(number);
         const n = num - 21;
         if (n > 0) {
            const ns = n.toString();
            return await this.getMessages(length, combined, ns, channel);
         } else {
            return combined;
         }
      }
   }

   // Utility functions
   private changeUrlToTelegramWebUrl(input: string): string {
      if (!input.includes("/s/")) {
         const index = input.indexOf("/t.me/");
         if (index !== -1) {
            const modifiedURL = input.substring(0, index + "/t.me/".length) + "s/" + input.substring(index + "/t.me/".length);
            return modifiedURL;
         }
      }
      return input;
   }

   private reverse<T>(array: T[]): T[] {
      const result = [...array];
      for (let i = 0; i < result.length / 2; i++) {
         const j = result.length - i - 1;
         [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
   }

   private removeDuplicate(config: string): string {
      const lines = config.split('\n');
      const uniqueLines = [...new Set(lines)].sort();
      return uniqueLines.join('\n');
   }
}