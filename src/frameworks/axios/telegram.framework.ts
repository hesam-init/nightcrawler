import Axios, {
   type AxiosError,
   type AxiosInstance,
   type AxiosRequestConfig,
   type AxiosResponse,
   type InternalAxiosRequestConfig,
} from "axios";
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

const requestTimeout = 15000;

export type ServiceConfig = {
   debug?: boolean;
   xml?: boolean;
};

export class HttpService {
   public http: AxiosInstance;
   private baseUrl = process.env.MODEM_IP;

   public debugMode = false;
   public xmlMode = false;

   public sessionCookie = "";
   public verificationToken = "";

   constructor(config?: ServiceConfig) {
      this.debugMode = config?.debug || false;
      this.xmlMode = config?.xml || false;

      this.http = Axios.create({
         baseURL: `${this.baseUrl}`,
         timeout: requestTimeout,
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

   public setVerificationToken = (token: string) => {
      this.verificationToken = token;
   };

   private handleRequest = (config: InternalAxiosRequestConfig) => {
      config.headers.Cookie = this.sessionCookie || undefined;

      config.headers.__RequestVerificationToken =
         this.verificationToken || undefined;

      if (this.xmlMode) {
         config.headers["Content-Type"] = "application/xml";
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

      if (this.debugMode) {
         console.log(response);
      }

      return {
         data: response.data,
         status: response.status,
         fullResponse: config?.fullResponse ? response : undefined,
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