import { HttpHandler, HttpResponse, HttpParams } from '@angular/common/http';
import { fakeAsync, tick } from '@angular/core/testing';
import { EMPTY, of, throwError, timer } from 'rxjs';
import { catchError, mapTo, mergeMap } from 'rxjs/operators';
import { HttpCacheInterceptor } from '../httpCacheInterceptor';
import {
  httpCacheManager,
  keySerializer,
  httpRequest,
  config,
  frame,
  ttl,
  cacheBucket,
  CustomHttpParamsCodec
} from './mocks/mocks';

describe('HttpCacheInterceptor', () => {
  let httpCacheInterceptor: HttpCacheInterceptor;
  let handler: HttpHandler;
  let request = (params, method = 'GET', url = 'api/mock') =>
    httpRequest(method, { params: new HttpParams({ fromObject: params }) }, url);
  const httpHandler = (response = {}): HttpHandler => ({
    handle: jest.fn(() => timer(frame).pipe(mapTo(new HttpResponse({ body: response }))))
  });
  const call = (req, times = 2, delay = frame) => {
    for (let i = 0; i < times; i++) {
      httpCacheInterceptor.intercept(req, handler).subscribe();
      tick(delay);
    }
  };

  beforeEach(() => {
    handler = httpHandler();
    httpCacheInterceptor = new HttpCacheInterceptor(httpCacheManager(), keySerializer(), config);
    expect.hasAssertions();
  });

  it('should cache a request', fakeAsync(() => {
    call(request({ cache$: true }));
    expect(handler.handle).toHaveBeenCalledTimes(1);
  }));

  it('should not cache when cache$ is falsy', fakeAsync(() => {
    call(request({ cache$: false }));
    expect(handler.handle).toHaveBeenCalledTimes(2);
  }));

  it('should not cache request of type POST', fakeAsync(() => {
    call(request({}, 'POST'));
    expect(handler.handle).toHaveBeenCalledTimes(2);
  }));

  it('should cache request of type POST when cache$ is implicitly true', fakeAsync(() => {
    call(request({ cache$: true }, 'POST'));
    expect(handler.handle).toHaveBeenCalledTimes(1);
  }));

  it('should not cache the request by default on explicit strategy', fakeAsync(() => {
    call(request({}));
    expect(handler.handle).toHaveBeenCalledTimes(2);
  }));

  it('should cache a return a serialized request when passing a serializer', fakeAsync(() => {
    const responseSerializer = jest.fn(v => 'serialized');
    const cacheManager: any = httpCacheManager({ ...config, responseSerializer });
    httpCacheInterceptor = new HttpCacheInterceptor(cacheManager, keySerializer(), config);
    call(request({ cache$: true }));
    expect(handler.handle).toHaveBeenCalledTimes(1);
    /* The serializer is called when adding the value to the cache and when retrieving it */
    expect(responseSerializer).toHaveBeenCalledTimes(2);
    expect(cacheManager.storage.get('api/mock').body).toBe('serialized');
  }));

  it('should cache the request by default on implicit strategy', fakeAsync(() => {
    httpCacheInterceptor = new HttpCacheInterceptor(
      httpCacheManager({ ...config, strategy: 'implicit' }),
      keySerializer(),
      config
    );
    call(request({}));
    expect(handler.handle).toHaveBeenCalledTimes(1);
  }));

  it('should not cache the request on implicit strategy and cache$ if falsy', fakeAsync(() => {
    httpCacheInterceptor = new HttpCacheInterceptor(
      httpCacheManager({ ...config, strategy: 'implicit' }),
      keySerializer(),
      config
    );
    call(request({ cache$: false }));
    expect(handler.handle).toHaveBeenCalledTimes(2);
  }));

  it('should return a cached request', fakeAsync(() => {
    const cacheSpy = spyOn((httpCacheInterceptor as any).httpCacheManager, 'get');
    call(request({ cache$: true, paramA: true }));
    expect(cacheSpy).toHaveBeenCalledTimes(1);
  }));

  it('should return a queued request', fakeAsync(() => {
    const cacheSpy = spyOn((httpCacheInterceptor as any).httpCacheManager.queue, 'get').and.callThrough();
    call(request({ cache$: true }), 2, 0);
    expect(cacheSpy).toHaveBeenCalledTimes(1);
    tick(frame);
  }));

  it('should not queue requests that error', fakeAsync(() => {
    const handler = {
      handle: jest.fn(() =>
        timer(frame).pipe(
          mergeMap(() => {
            return throwError('Not Found');
          })
        )
      )
    };
    const queueSpy = spyOn((httpCacheInterceptor as any).httpCacheManager.queue, 'delete').and.callThrough();

    httpCacheInterceptor
      .intercept(request({ cache$: true }), handler)
      .pipe(
        catchError(error => {
          return EMPTY;
        })
      )
      .subscribe();
    tick(frame);

    expect(queueSpy).toHaveBeenCalledTimes(1);
  }));

  it('should refetch after ttl has passed', fakeAsync(() => {
    call(request({ cache$: true }), 2, ttl + frame);
    expect(handler.handle).toHaveBeenCalledTimes(2);
  }));

  it('should not cache a request of same url and different params', fakeAsync(() => {
    call(request({ cache$: true, paramA: true }), 1);
    call(request({ cache$: true, paramA: false }), 1);
    expect(handler.handle).toHaveBeenCalledTimes(2);
  }));

  it('should cache a request of same url and same params', fakeAsync(() => {
    call(request({ cache$: true, paramA: true }), 2);
    expect(handler.handle).toHaveBeenCalledTimes(1);
  }));

  it('should cache a request of same url and same params in queue ', fakeAsync(() => {
    call(request({ cache$: true, paramA: true }), 2, 0);
    expect(handler.handle).toHaveBeenCalledTimes(1);
    tick(frame);
  }));

  it('should fetch twice for different url', fakeAsync(() => {
    call(request({ cache$: true }, 'GET', 'url1'), 1);
    call(request({ cache$: true }, 'GET', 'url2'), 1);
    tick(frame);
    expect(handler.handle).toHaveBeenCalledTimes(2);
  }));

  it('should add a request to cacheBucket', fakeAsync(() => {
    const bucket = cacheBucket();
    spyOn(bucket, 'add');
    call(request({ cache$: true, bucket$: bucket, key$: 'foo' }), 1);
    expect(bucket.add).toHaveBeenCalledWith('foo');
  }));

  it('should use parameterCodec from request', fakeAsync(() => {
    const testParam = 'te3/s-+d+_asd:';
    const expectedParamString = new HttpParams({
      encoder: new CustomHttpParamsCodec(),
      fromObject: { testParam }
    }).toString();

    call(request({ cache$: true, testParam, parameterCodec$: new CustomHttpParamsCodec() }), 1);

    const params = (handler.handle as jest.Mock).mock.calls[0][0].params;
    expect(params.toString()).toBe(expectedParamString);
  }));

  it('should use default codec if neigher config nor request provides custom param codec', fakeAsync(() => {
    const testParam = 'te3/s-+d+_asd:';
    const expectedParamString = new HttpParams({ fromObject: { testParam } }).toString();

    call(request({ cache$: true, testParam }), 1);

    const params = (handler.handle as jest.Mock).mock.calls[0][0].params;
    expect(params.toString()).toBe(expectedParamString);
  }));
});
