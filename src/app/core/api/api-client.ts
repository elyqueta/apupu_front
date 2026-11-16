import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable, tap } from 'rxjs';
import { ApiEnvelope, ApiPage } from './api.models';
import { API_BASE_URL } from './api-config';
import { CsrfTokenStore } from './api.interceptor';

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly csrf = inject(CsrfTokenStore);

  get<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
    return this.unwrap(
      this.http.get<ApiEnvelope<T>>(this.url(path), { params: this.params(query) }),
      path,
    );
  }

  getPage<T>(path: string, query?: Record<string, string | number | undefined>): Promise<ApiPage<T>> {
    return firstValueFrom(
      this.http.get<ApiPage<T>>(this.url(path), { params: this.params(query) }),
    );
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.unwrap(this.http.post<ApiEnvelope<T>>(this.url(path), body ?? {}), path);
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.unwrap(this.http.patch<ApiEnvelope<T>>(this.url(path), body), path);
  }

  put<T>(path: string, body: unknown): Promise<T> {
    return this.unwrap(this.http.put<ApiEnvelope<T>>(this.url(path), body), path);
  }

  async delete(path: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(this.url(path)));
  }

  async postNoContent(path: string, body?: unknown): Promise<void> {
    await firstValueFrom(this.http.post<void>(this.url(path), body ?? {}));
  }

  private unwrap<T>(request: Observable<ApiEnvelope<T>>, path: string): Promise<T> {
    return firstValueFrom(
      request.pipe(
        tap((response) => {
          const data: unknown = response.data;
          if (
            typeof data === 'object' &&
            data !== null &&
            'csrf_token' in data &&
            typeof data.csrf_token === 'string'
          ) {
            const eventId =
              path === '/host/session' &&
              'event' in data &&
              typeof data.event === 'object' &&
              data.event !== null &&
              'id' in data.event &&
              typeof data.event.id === 'string'
                ? data.event.id
                : null;
            this.csrf.set(
              data.csrf_token,
              eventId ? `/host/events/${encodeURIComponent(eventId)}` : path,
            );
          }
        }),
      ),
    ).then((response) => response.data);
  }

  private url(path: string): string {
    return `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private params(query?: Record<string, string | number | undefined>): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}
