import { DefaultHttpCacheGuard } from '../httpCacheGuard';
import { httpRequest } from './mocks/mocks';

describe('DefaultHttpCacheGuard', () => {
  let defaultHttpCache: DefaultHttpCacheGuard;
  beforeEach(() => {
    defaultHttpCache = new DefaultHttpCacheGuard();
  });
  it('should not accept requests of method POST', () => {
    expect(defaultHttpCache.canActivate(httpRequest())).toBeTruthy();
    expect(defaultHttpCache.canActivate(httpRequest('POST'))).toBeFalsy();
  });
  it('should not accept requests of responseType blob', () => {
    expect(defaultHttpCache.canActivate(httpRequest('GET', { responseType: 'blob' }))).toBeFalsy();
  });
  it('should accept requests of method GET and responseType json', () => {
    expect(defaultHttpCache.canActivate(httpRequest('GET', { responseType: 'json' }))).toBeTruthy();
  });
});
