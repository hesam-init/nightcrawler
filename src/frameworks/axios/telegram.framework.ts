import Axios, {
	type AxiosError,
	type AxiosInstance,
	type AxiosRequestConfig,
	type AxiosResponse,
	type CreateAxiosDefaults,
	type InternalAxiosRequestConfig,
} from "axios";
import chalk from "chalk";
import ora from "ora";
import { env } from "@/bootstrap/env";
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

	private proxyTestTimeout: number = 3000;
	private defaultConfig: CreateAxiosDefaults = {
		baseURL: env.TELEGRAM_BASE_URL,
		timeout: 6000,
	};

	public debugMode: boolean = false;
	public sessionCookie: string = "";

	constructor(config?: ServiceConfig) {
		this.debugMode = config?.debug || false;

		if (env.PROXY_URL) {
			const url = new URL(env.PROXY_URL);

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

	public async init() {
		if (env.PROXY_URL) {
			const proxyTest = await this.testProxy();

			if (!proxyTest) {
				process.exit(0);
			}
		}
	}

	private async testProxy() {
		const spinner = ora(`Testing Proxy ${env.PROXY_URL}`).start();

		const proxyInstance = Axios.create({
			...this.defaultConfig,
			timeout: this.proxyTestTimeout,
		});

		try {
			const response = await proxyInstance.get("/");

			spinner.succeed(`Proxy Test Success ${response.status}`);

			return true;
		} catch (_error) {
			const error = _error as AxiosError;

			spinner.fail("Proxy Test Failed");

			// console.error(
			// 	chalk.bgRed.white.bold(
			// 		`Proxy Test Failed: ${(error as Error).message}\n`
			// 	)
			// );

			return false;
		}
	}

	public setSessionCookie = (cookie: string) => {
		this.sessionCookie = cookie;
	};

	private handleRequest = (config: InternalAxiosRequestConfig) => {
		config.headers.Cookie = this.sessionCookie || undefined;

		if (this.debugMode) {
			console.log("Request Config:", {
				url: config.url,
				method: config.method,
				baseURL: config.baseURL,
				// headers: config.headers,
			});
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
			chalk.bgRed.white.bold(`\nERROR while fetching ${config.url} \n`)
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

		const response = await this.http.post(url, data, finalConfig);

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
