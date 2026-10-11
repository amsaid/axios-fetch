/**
 * TypeScript declarations for sd-axios-fetch.
 *
 * Modelled on the Axios 1.x `index.d.ts` so a project using
 * `import axios from 'axios'` can swap to `import axios from 'sd-axios-fetch'`
 * without type changes. Fetch-specific extras are additive.
 */

// ── DOM-lib-free primitives ──────────────────────────────────────
// Declared locally so the package type-checks in Node-only projects that do
// not include the `dom` lib. When `dom` *is* present these module-local names
// shadow the globals and stay structurally compatible.

export type RequestCache =
  | 'default' | 'no-store' | 'reload' | 'no-cache' | 'force-cache' | 'only-if-cached';

export type RequestMode = 'navigate' | 'same-origin' | 'no-cors' | 'cors';

export type ReferrerPolicy =
  | '' | 'no-referrer' | 'no-referrer-when-downgrade' | 'origin'
  | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin'
  | 'strict-origin-when-cross-origin' | 'unsafe-url';

export interface ProgressEvent<T = any> {
  lengthComputable: boolean;
  loaded: number;
  total: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HTMLFormElement = any;

// ── Headers ──────────────────────────────────────────────────────

export type AxiosHeaderValue = AxiosHeaders | string | string[] | number | boolean | null;

interface RawAxiosHeadersObject {
  [key: string]: any;
}

type AxiosHeaderMatcher = string | RegExp | ((this: AxiosHeaders, value: string, name: string) => boolean);
type AxiosHeaderParser = (this: AxiosHeaders, value: AxiosHeaderValue, header: string) => any;

export class AxiosHeaders {
  constructor(headers?: RawAxiosHeadersObject | AxiosHeaders | string | Headers);

  [key: string]: any;

  set(headerName?: string | RawAxiosHeadersObject | AxiosHeaders | Headers, value?: AxiosHeaderValue, rewrite?: boolean | AxiosHeaderMatcher): AxiosHeaders;

  get(headerName: string, parser: RegExp): RegExpExecArray | null;
  get(headerName: string, matcher?: true | AxiosHeaderParser): AxiosHeaderValue;

  has(header: string, matcher?: AxiosHeaderMatcher): boolean;

  delete(header: string | string[], matcher?: AxiosHeaderMatcher): boolean;

  clear(matcher?: AxiosHeaderMatcher): boolean;

  normalize(format?: boolean): AxiosHeaders;

  concat(...targets: Array<AxiosHeaders | RawAxiosHeadersObject | string | undefined | null>): AxiosHeaders;

  toJSON(asStrings?: boolean): RawAxiosHeadersObject;

  toString(): string;

  getContentType(): string | undefined;
  setContentType(contentType?: string | false, rewrite?: boolean): AxiosHeaders;

  getContentLength(): string | undefined;
  setContentLength(value?: string | number, rewrite?: boolean): AxiosHeaders;

  getAccept(): string | undefined;
  setAccept(value?: string, rewrite?: boolean): AxiosHeaders;

  getAuthorization(): string | undefined;
  setAuthorization(value?: string, rewrite?: boolean): AxiosHeaders;

  [Symbol.iterator](): IterableIterator<[string, AxiosHeaderValue]>;

  static from(thing?: RawAxiosHeadersObject | AxiosHeaders | string | Headers): AxiosHeaders;
  static concat(first: RawAxiosHeadersObject | AxiosHeaders | string | undefined, ...targets: Array<RawAxiosHeadersObject | AxiosHeaders | string | undefined>): AxiosHeaders;
  static accessor(header: string | string[]): typeof AxiosHeaders;
}

export type RawAxiosRequestHeaders = Record<string, any>;

export type AxiosRequestHeaders = RawAxiosRequestHeaders & AxiosHeaders;

export type RawAxiosResponseHeaders = Record<string, any>;

export type AxiosResponseHeaders = RawAxiosResponseHeaders & AxiosHeaders;

// ── Transformers / serializers ───────────────────────────────────

export interface AxiosRequestTransformer {
  (this: AxiosRequestConfig, data: any, headers: AxiosRequestHeaders): any;
}

export interface AxiosResponseTransformer {
  (this: AxiosRequestConfig, data: any, headers: AxiosResponseHeaders, status?: number): any;
}

export interface AxiosAdapter {
  (config: AxiosRequestConfig): Promise<AxiosResponse>;
}

export interface AxiosBasicCredentials {
  username: string;
  password: string;
}

export interface FormDataVisitorHelpers {
  defaultVisitor: (value: any, key: string, path: string[], helpers: FormDataVisitorHelpers) => boolean;
  convertValue: (value: any) => any;
  isVisitable: (value: any) => boolean;
}

export interface SerializerVisitor {
  (this: FormData, value: any, key: string, path: string[], helpers: FormDataVisitorHelpers): boolean;
}

export interface SerializerOptions {
  visitor?: SerializerVisitor;
  dots?: boolean;
  metaTokens?: boolean;
  indexes?: boolean | null;
}

export interface FormSerializerOptions extends SerializerOptions {
}

export interface ParamEncoder {
  (value: any, defaultEncoder: (value: any) => any): any;
}

export interface ParamsSerializerOptions extends SerializerOptions {
  encode?: ParamEncoder;
  serialize?: (this: AxiosRequestConfig, params: any, options?: ParamsSerializerOptions) => string;
}

// ── Progress ─────────────────────────────────────────────────────

export interface AxiosProgressEvent {
  loaded: number;
  total?: number;
  progress?: number;
  bytes: number;
  rate?: number;
  estimated?: number;
  upload?: boolean;
  download?: boolean;
  lengthComputable: boolean;
  event?: ProgressEvent | { lengthComputable: boolean; total: number | null; loaded: number };
}

// ── Config ───────────────────────────────────────────────────────

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
  | 'formData'
  | 'response'
  | '';

export type responseEncoding =
  | 'ascii' | 'ASCII' | 'ansi' | 'ANSI' | 'binary' | 'BINARY'
  | 'base64' | 'BASE64' | 'base64url' | 'BASE64URL'
  | 'hex' | 'HEX' | 'latin1' | 'LATIN1' | 'ucs-2' | 'UCS-2'
  | 'ucs2' | 'UCS2' | 'utf-8' | 'UTF-8' | 'utf8' | 'UTF8'
  | 'utf16le' | 'UTF16LE';

export interface TransitionalOptions {
  silentJSONParsing?: boolean;
  forcedJSONParsing?: boolean;
  clarifyTimeoutError?: boolean;
}

export interface GenericAbortSignal {
  readonly aborted: boolean;
  onabort?: ((...args: any) => any) | null;
  addEventListener?: (...args: any) => any;
  removeEventListener?: (...args: any) => any;
}

export interface AxiosRequestConfig<D = any> {
  url?: string;
  method?: Method | (string & {});
  baseURL?: string;
  transformRequest?: AxiosRequestTransformer | AxiosRequestTransformer[];
  transformResponse?: AxiosResponseTransformer | AxiosResponseTransformer[];
  headers?: (RawAxiosRequestHeaders & MethodsHeaders) | AxiosHeaders;
  params?: any;
  paramsSerializer?: ParamsSerializerOptions | CustomParamsSerializer;
  data?: D;
  timeout?: number;
  timeoutErrorMessage?: string;
  withCredentials?: boolean;
  withXSRFToken?: boolean | ((config: InternalAxiosRequestConfig) => boolean);
  adapter?: AxiosAdapter | string | string[];
  auth?: AxiosBasicCredentials;
  responseType?: ResponseType;
  responseEncoding?: responseEncoding | string;
  xsrfCookieName?: string;
  xsrfHeaderName?: string;
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
  onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void;
  maxContentLength?: number;
  maxBodyLength?: number;
  validateStatus?: ((status: number) => boolean) | null;
  maxRedirects?: number;
  signal?: AbortSignal | GenericAbortSignal;
  cancelToken?: CancelToken;
  decompress?: boolean;
  transitional?: TransitionalOptions;
  env?: { FormData?: any; Blob?: any; [key: string]: any };
  formSerializer?: FormSerializerOptions;
  beforeRedirect?: (options: any, responseDetails: any) => void;
  // Fetch-specific extensions (non-breaking additions)
  cache?: RequestCache;
  mode?: RequestMode;
  referrer?: string;
  referrerPolicy?: ReferrerPolicy;
  integrity?: string;
  keepalive?: boolean;
}

type MethodsHeaders = Partial<{
  [Key in Method as Lowercase<Key>]: AxiosHeaders;
} & { common: AxiosHeaders }>;

export interface CustomParamsSerializer {
  (params: Record<string, any>, options?: ParamsSerializerOptions): string;
}

export type RawAxiosRequestConfig<D = any> = AxiosRequestConfig<D>;

export interface InternalAxiosRequestConfig<D = any> extends AxiosRequestConfig<D> {
  headers: AxiosHeaders;
}

export interface HeadersDefaults {
  common: AxiosRequestHeaders;
  delete: AxiosRequestHeaders;
  get: AxiosRequestHeaders;
  head: AxiosRequestHeaders;
  post: AxiosRequestHeaders;
  put: AxiosRequestHeaders;
  patch: AxiosRequestHeaders;
  options?: AxiosRequestHeaders;
  [key: string]: AxiosRequestHeaders | undefined;
}
export interface AxiosDefaults<D = any> extends Omit<AxiosRequestConfig<D>, 'headers'> {
  headers: HeadersDefaults;
}

export interface CreateAxiosDefaults<D = any> extends Omit<AxiosRequestConfig<D>, 'headers'> {
  headers?: RawAxiosRequestHeaders | Partial<HeadersDefaults>;
}

// ── Response ─────────────────────────────────────────────────────

export interface AxiosResponse<T = any, D = any> {
  data: T;
  status: number;
  statusText: string;
  headers: AxiosResponseHeaders;
  config: InternalAxiosRequestConfig<D>;
  request?: any;
}

export type AxiosPromise<T = any> = Promise<AxiosResponse<T>>;

// ── Errors ───────────────────────────────────────────────────────

export class AxiosError<T = unknown, D = any> extends Error {
  constructor(
    message?: string,
    code?: string,
    config?: InternalAxiosRequestConfig<D>,
    request?: any,
    response?: AxiosResponse<T, D>,
  );

  config?: InternalAxiosRequestConfig<D>;
  code?: string;
  request?: any;
  response?: AxiosResponse<T, D>;
  status?: number | null;
  cause?: Error;
  isAxiosError: boolean;

  static from<T = unknown, D = any>(
    error: Error | unknown,
    code?: string,
    config?: InternalAxiosRequestConfig<D>,
    request?: any,
    response?: AxiosResponse<T, D>,
    customProps?: object,
  ): AxiosError<T, D>;

  static timeout(config?: InternalAxiosRequestConfig, request?: any): AxiosError;
  static cancel(message?: string, config?: InternalAxiosRequestConfig, request?: any): AxiosError;
  static badStatus(status: number, statusText: string, config: InternalAxiosRequestConfig, request: any, response: AxiosResponse): AxiosError;
  static badConfig(message: string, config?: InternalAxiosRequestConfig): AxiosError;
  static fromError(error: Error | unknown, config?: InternalAxiosRequestConfig, request?: any, response?: AxiosResponse, code?: string): AxiosError;
  static isCancel(value: any): value is Cancel;
  static isAxiosError(payload: any): payload is AxiosError;

  static readonly ERR_BAD_OPTION_VALUE: 'ERR_BAD_OPTION_VALUE';
  static readonly ERR_BAD_OPTION: 'ERR_BAD_OPTION';
  static readonly ECONNABORTED: 'ECONNABORTED';
  static readonly ETIMEDOUT: 'ETIMEDOUT';
  static readonly ERR_NETWORK: 'ERR_NETWORK';
  static readonly ERR_FR_TOO_MANY_REDIRECTS: 'ERR_FR_TOO_MANY_REDIRECTS';
  static readonly ERR_DEPRECATED: 'ERR_DEPRECATED';
  static readonly ERR_BAD_RESPONSE: 'ERR_BAD_RESPONSE';
  static readonly ERR_BAD_REQUEST: 'ERR_BAD_REQUEST';
  static readonly ERR_CANCELED: 'ERR_CANCELED';
  static readonly ERR_NOT_SUPPORT: 'ERR_NOT_SUPPORT';
  static readonly ERR_INVALID_URL: 'ERR_INVALID_URL';

  toJSON(): object;
}

export class CanceledError<T = unknown> extends AxiosError<T> {
  __CANCEL__: boolean;
}

// ── CancelToken ──────────────────────────────────────────────────

export interface CancelStatic {
  new (message?: string): Cancel;
}

export interface Cancel {
  message?: string;
  __CANCEL__?: boolean;
}

export interface Canceler {
  (message?: string, config?: InternalAxiosRequestConfig, request?: any): void;
}

export interface CancelTokenStatic {
  new (executor: (cancel: Canceler) => void): CancelToken;
  source(): CancelTokenSource;
  throwIfRequested(token?: CancelToken): void;
}

export interface CancelToken {
  promise: Promise<Cancel>;
  reason?: Cancel;
  throwIfRequested(): void;
  subscribe(listener: (reason: Cancel) => void): () => void;
  unsubscribe(listener: (reason: Cancel) => void): void;
  toAbortSignal(): AbortSignal;
}

export interface CancelTokenSource {
  token: CancelToken;
  cancel: Canceler;
}

export const CancelToken: CancelTokenStatic;

// ── Interceptors ─────────────────────────────────────────────────

export interface AxiosInterceptorOptions {
  synchronous?: boolean;
  runWhen?: (config: InternalAxiosRequestConfig) => boolean;
}

export interface AxiosInterceptorManager<V> {
  use(onFulfilled?: ((value: V) => V | Promise<V>) | null, onRejected?: ((error: any) => any) | null, options?: AxiosInterceptorOptions): number;
  eject(id: number): void;
  clear(): void;
}

// ── Instance & class ─────────────────────────────────────────────

export class Axios {
  constructor(config?: AxiosRequestConfig);

  defaults: AxiosDefaults;
  interceptors: {
    request: AxiosInterceptorManager<InternalAxiosRequestConfig>;
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
  postForm<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
  putForm<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
  patchForm<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;

  static all<T>(promises: Array<T | Promise<T>>): Promise<Awaited<T>[]>;
  static spread<T, R>(callback: (...args: T[]) => R): (array: T[]) => R;
  static isCancel(value: any): value is Cancel;
  static isAxiosError(payload: any): payload is AxiosError;
  static toFormData(source: any, formData?: FormData, options?: FormSerializerOptions): FormData;
  static formToJSON(formData: FormData | HTMLFormElement): Record<string, any>;
  static create(config?: CreateAxiosDefaults): AxiosInstance;
}

export interface AxiosInstance extends Axios {
  <T = any, R = AxiosResponse<T>, D = any>(config: AxiosRequestConfig<D>): Promise<R>;
  <T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;

  defaults: AxiosDefaults;
  interceptors: {
    request: AxiosInterceptorManager<InternalAxiosRequestConfig>;
    response: AxiosInterceptorManager<AxiosResponse>;
  };

  create(config?: CreateAxiosDefaults): AxiosInstance;
}

// ── The default export ───────────────────────────────────────────

export interface AxiosStatic extends AxiosInstance {
  Axios: typeof Axios;
  AxiosError: typeof AxiosError;
  AxiosHeaders: typeof AxiosHeaders;
  CanceledError: typeof CanceledError;
  Cancel: typeof CanceledError;
  CancelToken: CancelTokenStatic;
  VERSION: string;
  isCancel(value: any): value is Cancel;
  isAxiosError(payload: any): payload is AxiosError;
  all<T>(promises: Array<T | Promise<T>>): Promise<Awaited<T>[]>;
  spread<T, R>(callback: (...args: T[]) => R): (array: T[]) => R;
  toFormData(source: any, formData?: FormData, options?: FormSerializerOptions): FormData;
  formToJSON(formData: FormData | HTMLFormElement): Record<string, any>;
  mergeConfig(config1: AxiosRequestConfig, config2?: AxiosRequestConfig): AxiosRequestConfig;
  HttpStatusCode: typeof HttpStatusCode;
  // ESM default-export compatibility
  default: AxiosStatic;
}

// ── HTTP status codes ────────────────────────────────────────────

export enum HttpStatusCode {
  Continue = 100,
  SwitchingProtocols = 101,
  Processing = 102,
  EarlyHints = 103,
  Ok = 200,
  Created = 201,
  Accepted = 202,
  NonAuthoritativeInformation = 203,
  NoContent = 204,
  ResetContent = 205,
  PartialContent = 206,
  MultiStatus = 207,
  AlreadyReported = 208,
  ImUsed = 226,
  MultipleChoices = 300,
  MovedPermanently = 301,
  Found = 302,
  SeeOther = 303,
  NotModified = 304,
  UseProxy = 305,
  Unused = 306,
  TemporaryRedirect = 307,
  PermanentRedirect = 308,
  BadRequest = 400,
  Unauthorized = 401,
  PaymentRequired = 402,
  Forbidden = 403,
  NotFound = 404,
  MethodNotAllowed = 405,
  NotAcceptable = 406,
  ProxyAuthenticationRequired = 407,
  RequestTimeout = 408,
  Conflict = 409,
  Gone = 410,
  LengthRequired = 411,
  PreconditionFailed = 412,
  PayloadTooLarge = 413,
  UriTooLong = 414,
  UnsupportedMediaType = 415,
  RangeNotSatisfiable = 416,
  ExpectationFailed = 417,
  ImATeapot = 418,
  MisdirectedRequest = 421,
  UnprocessableEntity = 422,
  Locked = 423,
  FailedDependency = 424,
  TooEarly = 425,
  UpgradeRequired = 426,
  PreconditionRequired = 428,
  TooManyRequests = 429,
  RequestHeaderFieldsTooLarge = 431,
  UnavailableForLegalReasons = 451,
  InternalServerError = 500,
  NotImplemented = 501,
  BadGateway = 502,
  ServiceUnavailable = 503,
  GatewayTimeout = 504,
  HttpVersionNotSupported = 505,
  VariantAlsoNegotiates = 506,
  InsufficientStorage = 507,
  LoopDetected = 508,
  NotExtended = 510,
  NetworkAuthenticationRequired = 511,
}

declare const axios: AxiosStatic;
export default axios;

// ── Named exports / utility functions ────────────────────────────

export function isCancel(value: any): value is Cancel;
export function isAxiosError(payload: any): payload is AxiosError;
export function all<T>(promises: Array<T | Promise<T>>): Promise<Awaited<T>[]>;
export function spread<T, R>(callback: (...args: T[]) => R): (array: T[]) => R;
export function toFormData(source: any, formData?: FormData, options?: FormSerializerOptions): FormData;
export function formToJSON(formData: FormData | HTMLFormElement): Record<string, any>;
export function mergeConfig(config1: AxiosRequestConfig, config2?: AxiosRequestConfig): AxiosRequestConfig;

export const VERSION: string;
export const DEFAULTS: AxiosDefaults;