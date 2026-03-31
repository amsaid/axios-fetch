/**
 * TypeScript declaration file for sd-axios-fetch.
 *
 * Mirrors the Axios type definitions so any project using `import axios from 'axios'`
 * can swap to `import axios from 'sd-axios-fetch'` without type errors.
 */
export = axios;

declare const axios: axios.AxiosInstance;

declare namespace axios {
  // ── Core ───────────────────────────────────────────────────────

  export interface AxiosRequestConfig<D = any> {
    url?: string;
    method?: Method;
    baseURL?: string;
    transformRequest?: AxiosRequestTransformer | AxiosRequestTransformer[];
    transformResponse?: AxiosResponseTransformer | AxiosResponseTransformer[];
    headers?: AxiosHeaders | RawAxiosHeaders | (Partial<RawAxiosHeaders & AxiosHeaders>)[];
    params?: any;
    paramsSerializer?: ParamsSerializerOptions | ((params: any) => string);
    data?: D;
    timeout?: number;
    timeoutErrorMessage?: string;
    withCredentials?: boolean;
    adapter?: AxiosAdapter;
    auth?: AxiosBasicCredentials;
    responseType?: ResponseType;
    responseEncoding?: string;
    xsrfCookieName?: string;
    xsrfHeaderName?: string;
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
    onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void;
    maxContentLength?: number;
    maxBodyLength?: number;
    validateStatus?: ((status: number) => boolean) | null;
    maxRedirects?: number;
    signal?: AbortSignal;
    cancelToken?: CancelToken;
    decompress?: boolean;
    // Fetch-specific extensions (non-breaking additions)
    cache?: RequestCache;
    mode?: RequestMode;
    referrer?: string;
    referrerPolicy?: ReferrerPolicy;
  }

  export interface AxiosResponse<T = any, D = any> {
    data: T;
    status: number;
    statusText: string;
    headers: AxiosResponseHeaders | RawAxiosResponseHeaders;
    config: AxiosRequestConfig<D>;
    request?: any;
  }

  export interface AxiosError<T = any, D = any> extends Error {
    config: AxiosRequestConfig<D>;
    code?: string;
    request?: any;
    response?: AxiosResponse<T, D>;
    isAxiosError: boolean;
    toJSON(): object;
    cause?: Error;
  }

  export interface AxiosHeaders {
    [key: string]: any;
    toJSON?: () => Record<string, string>;
    set(header: string, value?: string | number | boolean | readonly string[]): AxiosHeaders;
    get(header: string, parser?: RegExp): string | undefined;
    has(header: string, matcher?: RegExp): boolean;
    delete(header: string, matcher?: RegExp): boolean;
    clear(): boolean;
    normalize(format?: boolean): AxiosHeaders;
    concat(...targets: Array<AxiosHeaders | string | Record<string, string> | undefined>): AxiosHeaders;
  }

  export interface AxiosProgressEvent {
    loaded: number;
    total?: number;
    progress?: number;
    bytes: number;
    rate?: number;
    estimated?: number;
    upload?: boolean;
    lengthComputable: boolean;
    event?: ProgressEvent;
  }

  export interface AxiosBasicCredentials {
    username: string;
    password: string;
  }

  export interface ParamsSerializerOptions {
    indexes?: boolean | null;
  }

  // ── Types ──────────────────────────────────────────────────────

  export type Method =
    | 'get' | 'GET'
    | 'delete' | 'DELETE'
    | 'head' | 'HEAD'
    | 'options' | 'OPTIONS'
    | 'post' | 'POST'
    | 'put' | 'PUT'
    | 'patch' | 'PATCH'
    | 'purge' | 'PURGE'
    | 'link' | 'LINK'
    | 'unlink' | 'UNLINK';

  export type ResponseType =
    | 'arraybuffer'
    | 'blob'
    | 'document'
    | 'json'
    | 'text'
    | 'stream'
    | '';

  export type AxiosRequestTransformer = (data: any, headers: AxiosRequestConfig) => any;
  export type AxiosResponseTransformer = (data: any, headers: any, status?: number) => any;
  export type AxiosAdapter = (config: AxiosRequestConfig) => Promise<AxiosResponse>;

  type RawAxiosHeaders = Record<string, string | number | boolean>;
  type RawAxiosResponseHeaders = Record<string, string>;

  // ── CancelToken ────────────────────────────────────────────────

  export class CancelToken {
    constructor(executor: (cancel: Canceler) => void);
    static source(): CancelTokenSource;
    static throwIfRequested(token?: CancelToken): void;
    promise: Promise<Cancel>;
    reason?: Cancel;
    throwIfRequested(): void;
  }

  export interface Canceler {
    (message?: string, config?: AxiosRequestConfig, request?: any): void;
  }

  export interface CancelTokenSource {
    token: CancelToken;
    cancel: Canceler;
  }

  export interface Cancel {
    message: string;
  }

  // ── Error classes ──────────────────────────────────────────────

  export class AxiosError extends Error {
    static fromError(error: unknown, config?: AxiosRequestConfig): AxiosError;
    static timeout(config?: AxiosRequestConfig, request?: any): AxiosError;
    static cancel(message?: string, config?: AxiosRequestConfig, request?: any): AxiosError;
    static badStatus(status: number, statusText: string, config: AxiosRequestConfig, request: any, response: AxiosResponse): AxiosError;
    static isCancel(value: any): boolean;
    static isAxiosError(payload: any): boolean;
  }

  export class CanceledError extends AxiosError { }

  // ── Interceptor ────────────────────────────────────────────────

  export interface AxiosInterceptorManager<V> {
    use(onFulfilled?: ((value: V) => V | Promise<V>), onRejected?: ((error: any) => any)): number;
    eject(id: number): void;
    clear(): void;
  }

  // ── Instance ───────────────────────────────────────────────────

  export interface AxiosInstance extends Axios {
    <T = any, R = AxiosResponse<T>, D = any>(config: AxiosRequestConfig<D>): Promise<R>;
    <T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;

    defaults: AxiosRequestConfig;
    interceptors: {
      request: AxiosInterceptorManager<AxiosRequestConfig>;
      response: AxiosInterceptorManager<AxiosResponse>;
    };

    getUri(config?: AxiosRequestConfig): string;

    get<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    delete<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    head<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    options<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    post<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
    put<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
    patch<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
  }

  // ── Axios base class ───────────────────────────────────────────

  export class Axios {
    constructor(config?: AxiosRequestConfig);
    defaults: AxiosRequestConfig;
    interceptors: {
      request: AxiosInterceptorManager<AxiosRequestConfig>;
      response: AxiosInterceptorManager<AxiosResponse>;
    };
    getUri(config?: AxiosRequestConfig): string;
    request<T = any, R = AxiosResponse<T>, D = any>(config: AxiosRequestConfig<D>): Promise<R>;
    get<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    delete<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    head<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    options<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    post<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
    put<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
    patch<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;

    static all<T>(promises: Array<T | Promise<T>>): Promise<T[]>;
    static spread<T, R>(callback: (...args: T[]) => R): (array: T[]) => R;
    static isCancel(value: any): boolean;
    static isAxiosError(payload: any): boolean;
    static toFormData(source: any, formData?: FormData): FormData;
    static formToJSON(formData: FormData): Record<string, any>;
    static create(config?: AxiosRequestConfig): AxiosInstance;
  }

  // ── Utility functions ──────────────────────────────────────────

  export function isCancel(value: any): boolean;
  export function isAxiosError(payload: any): boolean;
  export function all<T>(promises: Array<T | Promise<T>>): Promise<T[]>;
  export function spread<T, R>(callback: (...args: T[]) => R): (array: T[]) => R;
  export function toFormData(source: any, formData?: FormData): FormData;
  export function formToJSON(formData: FormData): Record<string, any>;
  export function mergeConfig(config1: AxiosRequestConfig, config2: AxiosRequestConfig): AxiosRequestConfig;

  // ── mergeConfig defaults ───────────────────────────────────────

  export const DEFAULTS: AxiosRequestConfig;
}
