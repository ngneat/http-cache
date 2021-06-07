import { HttpCacheGuard } from '../httpCacheGuard';
import { HttpCacheManager } from '../httpCacheManager.service';
import { HttpCacheStorage } from '../httpCacheStorage';
import { RequestsQueue } from '../requestsQueue';
import { TTLManager } from '../ttlManager';
import {
  config,
  requestQueue,
  httpCacheStorage,
  httpCacheGuard,
  ttlManager as makeTTL,
  cacheBucket
} from './mocks/mocks';
import Spy = jasmine.Spy;

describe('HttpCacheManager', () => {
  let httpCache: HttpCacheManager;
  let queue: RequestsQueue;
  let storage: HttpCacheStorage;
  let guard: HttpCacheGuard;
  let ttlManager: TTLManager;

  beforeEach(() => {
    queue = requestQueue();
    storage = httpCacheStorage();
    guard = httpCacheGuard();
    ttlManager = makeTTL();

    httpCache = new HttpCacheManager(queue, storage, guard, ttlManager, config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    let has: Spy;
    let isValid: Spy;
    let storageDelete: Spy;

    beforeEach(() => {
      has = spyOn(storage, 'has');
      isValid = spyOn(ttlManager, 'isValid');
      storageDelete = spyOn(storage, 'delete');
    });

    it('should return true when cache is valid', () => {
      has.and.returnValue(true);
      isValid.and.returnValue(true);
      expect(httpCache.validate('valid key')).toBeTruthy();
    });
    it('should return false when cache is invalid', () => {
      has.and.returnValue(true);
      isValid.and.returnValue(false);
      expect(httpCache.validate('invalid key')).toBeFalsy();
    });
    it('should return false when key is not exist', () => {
      has.and.returnValue(false);
      isValid.and.returnValue(true);
      expect(httpCache.validate('invalid key')).toBeFalsy();
    });
    it('should call delete from storage when key is valid', () => {
      has.and.returnValue(false);
      isValid.and.returnValue(false);
      httpCache.validate('valid key');
      expect(storage.delete).toHaveBeenCalledWith('valid key');
    });
  });

  describe('add', () => {
    it('should add key to bucket', () => {
      const bucket = cacheBucket();
      spyOn(bucket, 'add');
      httpCache.set('key', {}, { bucket: bucket });
      expect(bucket.add).toHaveBeenCalledWith('key');
    });
    it('should set the key', () => {
      spyOn(storage, 'set');
      spyOn(ttlManager, 'set');
      httpCache.set('key', {}, {});
      expect(storage.set).toHaveBeenCalled();
      expect(ttlManager.set).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete the key from storage and ttl', () => {
      spyOn(storage, 'delete');
      spyOn(ttlManager, 'delete');
      httpCache.delete('key');
      expect(storage.delete).toHaveBeenCalledWith('key');
      expect(ttlManager.delete).toHaveBeenCalledWith('key');
    });
    it('should clear a given cache bucket', () => {
      const bucket = cacheBucket();
      spyOn(bucket, 'clear');
      httpCache.delete(bucket);
      expect(bucket.clear).toHaveBeenCalled();
    });
    it('should delete every key of the bucket', () => {
      spyOn(httpCache, 'delete').and.callThrough();
      const bucket = cacheBucket();
      bucket.add('a');
      bucket.add('b');
      bucket.add('c');
      httpCache.delete(bucket);
      expect(httpCache.delete).toHaveBeenCalledTimes(4);
    });
  });

  describe('get', () => {
    it('should return the cached value by default', () => {
      httpCache.set('a', 'value');
      expect(httpCache.get('a').body).toBe('value');
    });
    it('should pass the cached value through the serializer', () => {
      const responseSerializer = jest.fn(v => 'serialized');
      const httpCache: any = new HttpCacheManager(queue, storage, guard, ttlManager, { ...config, responseSerializer });
      httpCache.set('a', 'value');
      const serialized = httpCache.get('a');
      const newResponse = serialized !== httpCache.storage.get('a');
      expect(responseSerializer).toHaveBeenCalledTimes(1);
      expect(serialized.body).toBe('serialized');
      expect(newResponse).toBe(true);
    });
  });
});
