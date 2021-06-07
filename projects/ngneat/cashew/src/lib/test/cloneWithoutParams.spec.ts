import { HttpParams } from '@angular/common/http';
import { cloneWithoutParams } from '../cloneWithoutParams';
import { CustomHttpParamsCodec, httpRequest } from './mocks/mocks';

describe('cloneWithoutParams', () => {
  let request = (params, method = 'GET', url = 'api/mock') =>
    httpRequest(method, { params: new HttpParams({ fromObject: params }) }, url);

  it('should encode cloned params with angular default http params codec', () => {
    const params = { param: '+/:_- encoded' };
    const clone = cloneWithoutParams(request(params), '');

    expect(clone.params.toString()).toBe(new HttpParams({ fromObject: params }).toString());
  });

  it('should encode cloned params with custom http params codec', () => {
    const params = { param: '+/:_- encoded' };
    const parameterCodec = new CustomHttpParamsCodec();

    const clone = cloneWithoutParams(request(params), '', parameterCodec);

    expect(clone.params.toString()).toBe(new HttpParams({ fromObject: params, encoder: parameterCodec }).toString());
  });
});
