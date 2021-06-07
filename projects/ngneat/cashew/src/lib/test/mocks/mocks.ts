import { HttpRequest, HttpResponse, HttpHeaders, HttpParams, HttpParameterCodec } from '@angular/common/http';
import { CacheBucket } from '../../cacheBucket';
import { defaultConfig } from '../../httpCacheConfig';
import { DefaultHttpCacheGuard } from '../../httpCacheGuard';
import { HttpCacheManager } from '../../httpCacheManager.service';
import { DefaultHttpCacheStorage } from '../../httpCacheStorage';
import { DefaultKeySerializer } from '../../keySerializer';
import { RequestsQueue } from '../../requestsQueue';
import { DefaultTTLManager } from '../../ttlManager';

export interface HttpOptions {
  headers?: HttpHeaders;
  reportProgress?: boolean;
  params?: HttpParams;
  responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
  withCredentials?: boolean;
}

export const frame = 1000;
export const config = defaultConfig;
export const ttl = config.ttl;

export const httpRequest = (method: string = 'GET', options: HttpOptions = {}, url: string = 'api/mock') =>
  new HttpRequest(method, url, {}, options);
export const httpResponse = () => new HttpResponse();
export const requestQueue = () => new RequestsQueue();
export const cacheBucket = () => new CacheBucket();
export const httpCacheStorage = () => new DefaultHttpCacheStorage();
export const httpCacheGuard = () => new DefaultHttpCacheGuard();
export const ttlManager = (conf = config) => new DefaultTTLManager(conf);
export const keySerializer = () => new DefaultKeySerializer();
export const httpCacheManager = (conf = config) =>
  new HttpCacheManager(requestQueue(), httpCacheStorage(), httpCacheGuard(), ttlManager(conf), conf);
export function localStorageMock() {
  const localStorageMock = (function() {
    let store = {};
    return {
      getItem: function(key) {
        return store[key];
      },
      setItem: function(key, value) {
        store[key] = value.toString();
      },
      clear: function() {
        store = {};
      },
      removeItem: function(key) {
        delete store[key];
      }
    };
  })();
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });
}
export class CustomHttpParamsCodec implements HttpParameterCodec {
  public decodeKey(key: string): string {
    return decodeURIComponent(key);
  }
  public decodeValue(value: string): string {
    return decodeURIComponent(value);
  }
  public encodeKey(key: string): string {
    return encodeURIComponent(key);
  }
  public encodeValue(value: string): string {
    return encodeURIComponent(value);
  }
}
