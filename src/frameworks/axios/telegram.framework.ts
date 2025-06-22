import Axios, {
   type AxiosError,
   type AxiosInstance,
   type AxiosProxyConfig,
   type AxiosRequestConfig,
   type AxiosResponse,
   type InternalAxiosRequestConfig,
} from "axios";
import chalk from "chalk";
import type { ApiResponse } from "./telegram.types";

export type CustomAxiosRequestConfig = AxiosRequestConfig & {
   showSuccessToast?: boolean;
   successMessage?: string;
   showErrorToast?: boolean;
   errorMessage?: string;
   fullResponse?: boolean;
   xml?: boolean;
};

const defaultConfig: Partial<CustomAxiosRequestConfig> = {
   showSuccessToast: true,
   successMessage: "Success",
   showErrorToast: true,
   errorMessage: "Error",
};


export type ServiceConfig = {
   debug?: boolean;
};

const requestTimeout = 15000;

export class TelegramFramework {
   private baseUrl = process.env.TELEGRAM_BASE_URL;

   private proxy?: AxiosProxyConfig;
   public http: AxiosInstance;
   public debugMode = false;
   public sessionCookie = "";

   constructor(config?: ServiceConfig) {
      this.debugMode = config?.debug || false;

      if (process.env.PROXY_URL) {
         console.log(
            chalk.bgGreen.green.bold(`Proxy : ${process.env.PROXY_URL} \n`),
         );

         const url = new URL(process.env.PROXY_URL);

         this.proxy = {
            host: url.hostname,
            port: parseInt(url.port),
            protocol: url.protocol.replace(":", "") as "http" | "https",
         };
      }

      this.http = Axios.create({
         baseURL: this.baseUrl || "",
         timeout: requestTimeout,
         proxy: this.proxy
      });

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

      return Promise.reject(error);
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
         // fullResponse: config?.fullResponse ? response : undefined,
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
         fullResponse: config?.fullResponse ? response : undefined,
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