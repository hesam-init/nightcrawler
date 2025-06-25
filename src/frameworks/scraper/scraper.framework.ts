import { FileFramework } from '@/frameworks/file/file.framework';
import { HttpStatusCode } from 'axios';
import chalk from 'chalk';
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

const PROTCOLS = ["vless", "vmess", "ss", "trojan"]

const telegramService = new TelegramFramework({
   debug: true
});


export class V2RayCollector {
   private telegram: boolean = true;

   private maxPages: number = 1;
   private maxMessages: number = 100;
   private configsNames: string = "@";

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
         // console.log("Starting V2Ray config collection... \n");

         // NOTE: Loop through the channels list
         // const htmlData = await FileFramework.readFileContent("html-logs/meli_proxy.html");

         // const $ = cheerio.load(htmlData);

         // let arrayData: Array<string> = [];

         // $('.tgme_widget_message_text').each((j, element) => {
         //    let messageText = $(element);
         //    let replacedMessage = messageText.html()?.replace(/<br\/?>/g, '\n');
         //    const tempMessage = cheerio.load(replacedMessage || "");
         //    const correctMessage = tempMessage.text();
         //    const lines = Array(correctMessage.trim().split('\n'));

         //    const allLinksShort = lines
         //       .filter(Array.isArray)
         //       .flatMap(items => {
         //          const allProtocolsMatches = items.filter(data => {
         //             return PROTCOLS.some(protocol => data.startsWith(protocol))
         //          })

         //          arrayData.push(...allProtocolsMatches)

         //          return Array(allProtocolsMatches).flat();
         //       });
         // });

         // await FileFramework.writeToFile(arrayData.join("\n"), "data.txt");

         // NOTE: Loop through the channels list
         if (this.telegram) {
            const fileData = await FileFramework.readFileContent("channels.csv");
            const channels = FileFramework.parseCSV<CsvSchema>(fileData);

            await telegramService.init()

            for (const channel of channels) {
               const $ = cheerio.load('<div id="all-messages"></div>');

               let beforeIndex: number = 0;
               let arrayData: Array<string> = [];
               let currentPage: number = 0;
               const maxPages: number = channel.maxPages || this.maxPages;

               console.log(
                  chalk.bgYellow.white.bold(`Crawling ===> ${channel.id} : Max Pages = ${maxPages} \n`),
               );

               while (currentPage < maxPages) {
                  console.log(`Current Page => ${currentPage + 1}`);

                  const paginatedLink = `${channel.id}${beforeIndex === 0 ? "" : `?before=${beforeIndex - 20}`}`;

                  const response = await telegramService.get<string>(paginatedLink, {
                     returnConfig: true
                  });

                  if (response.status !== HttpStatusCode.Ok) {
                     beforeIndex = beforeIndex;

                     continue;
                  }

                  const body = cheerio.load(response.data || "");

                  const canonical = body('head link').filter((i, el) => {
                     return $(el).attr('rel') === "canonical";
                  }).attr("href");


                  if (!canonical) {
                     console.log(
                        chalk.bgRed.white.bold(`Channel dont support crawling ===> ${channel.id} \n`),
                     );

                     break;
                  }

                  body('.tgme_widget_message_wrap').each((index, element) => {
                     $('#all-messages').append(body.html(element));
                  });

                  const messages = body('.tgme_widget_message_wrap').length;
                  const firstMessage = body('.tgme_widget_message_wrap .js-widget_message').first();
                  const lastMessage = body('.tgme_widget_message_wrap .js-widget_message').last();

                  // NOTE: return current page if page not found
                  const nextIndex = Number(lastMessage.attr('data-post')?.split("/")[1]) || beforeIndex;

                  // NOTE: break if next page not exist
                  if (nextIndex <= 20 && nextIndex !== 0) {
                     break;
                  }

                  if (beforeIndex !== nextIndex) {
                     beforeIndex = nextIndex;
                     currentPage++;
                  }
               }

               const proxiestList = $('.tgme_widget_message_text').each((j, element) => {
                  let messageText = $(element);
                  let replacedMessage = messageText.html()?.replace(/<br\/?>/g, '\n');
                  const tempMessage = cheerio.load(replacedMessage || "");
                  const correctMessage = tempMessage.text();
                  const lines = Array(correctMessage.trim().split('\n'));

                  const allLinksShort = lines
                     .filter(Array.isArray)
                     .flatMap(items => {
                        const allProtocolsMatches = items.filter(data => {
                           return PROTCOLS.some(protocol => data.startsWith(protocol))
                        })

                        arrayData.push(...allProtocolsMatches)

                        return Array(allProtocolsMatches).flat();
                     });
               });


               await FileFramework.writeHtmlToFile(arrayData.join("\n"));

               // console.log("\n\n---------------------------------------");
               // console.log(`Crawling ${channel.id}`);

               // console.log(`Crawled ${channel.id}!`);
               // console.log("---------------------------------------\n\n");
            }

         }


         // console.log("Creating output files!");

         // console.log(this.configs);


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

         // console.log("All Done :D");
      } catch (error) {
         console.error("Error in main:", error?.message);
      }
   }

   private async crawl(channelLink?: string, hasAllMessagesFlag: boolean = false): Promise<void> {

   }

   private async loadMore(link: string): Promise<cheerio.CheerioAPI> {
      const response = await telegramService.get<string>(link);

      return cheerio.load(response.data);
   }


   private async crawlForV2ray($: cheerio.CheerioAPI, channelLink: string, hasAllMessagesFlag: boolean): Promise<void> {
      // const data = $('.').last().attr('data-post');
      const messages = $('.tgme_widget_message_wrap').length;
      const lastMessage = $('.tgme_widget_message_wrap .js-widget_message').last();
      const link = lastMessage.attr('data-post');
      const number = Number(link?.split('/')[1]);

      console.log(number);

      if (messages < this.maxMessages && link) {
         const number = Number(link.split('/')[1]);

         $ = await this.getMessages(this.maxMessages, $, number, channelLink);
      }

      // Extract V2Ray configs based on message type
      if (hasAllMessagesFlag) {
         // Get all messages and check for V2Ray configs
         $('.tgme_widget_message_text').each((j, element) => {

            let messageText = $(element).html() || '';
            // console.log(messageText);
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

   private async getMessages(length: number, $: cheerio.CheerioAPI, number: number, channel: string): Promise<cheerio.CheerioAPI> {
      const newDoc = await this.loadMore(channel + "?before=" + number);

      // Merge the documents
      const body1 = $.html();
      const body2 = newDoc.html();
      const combined = cheerio.load(body1 + body2);

      const messages = combined('.js-widget_message_wrap').length;

      if (messages > length) {
         return combined;
      } else {
         const num = number;
         const n = num - 21;
         if (n > 0) {
            const ns = n;

            return await this.getMessages(length, combined, ns, channel);
         } else {
            return combined;
         }
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

   private changeUrlToTelegramWebUrl(input: string): string {
      if (!input.includes("/s/")) {
         const index = input.indexOf("/t.me/");

         console.log(index);


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