import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiClient } from './api-client';

describe('ApiClient', () => {
  let api: ApiClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ApiClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('preserves the data and pagination fields of paginated responses', async () => {
    const pagePromise = api.getPage<{ id: string }>('/host/events', {
      page: 1,
      page_size: 100,
    });
    const request = http.expectOne(
      (req) => req.url.endsWith('/host/events') && req.params.get('page_size') === '100',
    );
    const page = {
      data: [{ id: 'event-1' }],
      pagination: { page: 1, page_size: 100, total: 1, total_pages: 1 },
    };

    request.flush(page);

    await expect(pagePromise).resolves.toEqual(page);
  });
});
