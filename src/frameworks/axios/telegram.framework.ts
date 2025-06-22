import Axios, {
   type AxiosError,
   type AxiosInstance,
   type AxiosRequestConfig,
   type AxiosResponse,
   type CreateAxiosDefaults,
   type InternalAxiosRequestConfig
} from "axios";
import chalk from "chalk";
import type { ApiResponse } from "./telegram.types";

export type CustomAxiosRequestConfig = AxiosRequestConfig & {
   errorMessage?: string;
   returnConfig?: boolean;
};

const defaultConfig: Partial<CustomAxiosRequestConfig> = {
   errorMessage: "Error",
};


export type ServiceConfig = {
   debug?: boolean;
};

export class TelegramFramework {
   public http: AxiosInstance;

   private defaultConfig: CreateAxiosDefaults = {
      baseURL: process.env.TELEGRAM_BASE_URL,
      timeout: 6000,
   }

   public debugMode = false;
   public sessionCookie = "";

   constructor(config?: ServiceConfig) {
      this.debugMode = config?.debug || false;

      if (process.env.PROXY_URL) {
         console.log(
            chalk.bgGreen.green.bold(`Proxy : ${process.env.PROXY_URL} \n`),
         );

         const url = new URL(process.env.PROXY_URL);

         this.defaultConfig.proxy = {
            host: url.hostname,
            port: parseInt(url.port),
            protocol: url.protocol.replace(":", "") as "http" | "https",
         };
      }

      this.http = Axios.create(this.defaultConfig);

      this.http.interceptors.request.use(
         this.handleRequest,
         this.handleRequestError
      );

      this.http.interceptors.response.use(
         this.handleSuccessResponse,
         this.handleErrorResponse
      );
   }

   public setSessionCookie = (cookie: string) => {
      this.sessionCookie = cookie;
   };

   private handleRequest = (config: InternalAxiosRequestConfig) => {
      config.headers.Cookie = this.sessionCookie || undefined;

      if (this.debugMode) {
         console.log("Request Config:", config.url);
      }

      return config;
   };

   private handleRequestError = (error: AxiosError) => {
      return Promise.reject(error);
   };

   private handleSuccessResponse = (response: AxiosResponse<ApiResponse>) => {
      const config = response.config as CustomAxiosRequestConfig;
      const result = response.data;

      return response;
   };

   private handleErrorResponse = (error: AxiosError<ApiResponse>) => {
      const config = error.config as CustomAxiosRequestConfig;
      const result = error.response?.data;

      // return Promise.reject(error);

      console.error(
         chalk.bgRed.white.bold(`ERROR while fetching ${config.url} \n`),
      );

      return {};
   };

   public async get<T>(
      url: string,
      config?: CustomAxiosRequestConfig
   ): Promise<ApiResponse<T>> {
      const finalConfig = { ...defaultConfig, ...config };
      const response = await this.http.get(url, finalConfig);

      return {
         data: response.data,
         status: response.status,
         config: config?.returnConfig ? response : undefined,
      };
   }

   public async post<T>(
      url: string,
      data: unknown,
      config?: CustomAxiosRequestConfig
   ): Promise<ApiResponse<T>> {
      const finalConfig = { ...defaultConfig, ...config };

      const response = await this.http.post(
         url,
         data,
         finalConfig
      );

      return {
         data: response.data,
         status: response.data,
         config: config?.returnConfig ? response : undefined,
      };
   }

   public async put<T>(
      url: string,
      data: unknown,
      config?: CustomAxiosRequestConfig
   ) {
      const finalConfig = { ...defaultConfig, ...config };

      const response = await this.http.put<ApiResponse<T>>(
         url,
         data,
         finalConfig
      );

      return response.data;
   }
}