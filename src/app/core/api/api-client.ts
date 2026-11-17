import { HttpClient, HttpEventType, HttpParams, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { filter, firstValueFrom, map, Observable, Subscription, tap } from 'rxjs';
import { ApiEnvelope, ApiPage } from './api.models';
import { API_BASE_URL } from './api-config';
import { CsrfTokenStore } from './api.interceptor';

export interface UploadOptions {
  /** Percentagem de upload (0–100). */
  onProgress?: (percent: number) => void;
}

export interface UploadHandle<T> {
  promise: Promise<T>;
  /** Cancela o pedido em curso. */
  cancel: () => void;
}

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

  getPage<T>(
    path: string,
    query?: Record<string, string | number | undefined>,
  ): Promise<ApiPage<T>> {
    return firstValueFrom(
      this.http.get<ApiPage<T>>(this.url(path), { params: this.params(query) }),
    );
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.unwrap(this.http.post<ApiEnvelope<T>>(this.url(path), body ?? {}), path);
  }

  /** `POST` com `multipart/form-data` (o `HttpClient` define o boundary). */
  postForm<T>(path: string, body: FormData): Promise<T> {
    return this.unwrap(this.http.post<ApiEnvelope<T>>(this.url(path), body), path);
  }

  /**
   * `POST` multipart com progresso de upload e possibilidade de cancelar.
   * O cancelamento interrompe o pedido no browser; o backend só grava a capa
   * no fim, pelo que a operação fica idempotente.
   */
  postFormWithProgress<T>(
    path: string,
    body: FormData,
    options: UploadOptions = {},
  ): UploadHandle<T> {
    let subscription: Subscription | null = null;
    let rejectRequest: ((reason?: unknown) => void) | null = null;
    const promise = new Promise<T>((resolve, reject) => {
      rejectRequest = reject;
      const request = new HttpRequest('POST', this.url(path), body, { reportProgress: true });
      subscription = this.http
        .request<ApiEnvelope<T>>(request)
        .pipe(
          tap((event) => {
            if (event.type === HttpEventType.UploadProgress && event.total) {
              const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
              options.onProgress?.(percent);
            }
          }),
          filter((event): event is HttpResponse<ApiEnvelope<T>> => event instanceof HttpResponse),
          map((response) => response.body as ApiEnvelope<T>),
          tap((response) => this.rememberCsrf(path, response)),
          map((response) => response.data),
        )
        .subscribe({ next: resolve, error: reject });
    });

    return {
      promise,
      cancel: () => {
        subscription?.unsubscribe();
        rejectRequest?.(new DOMException('Upload cancelado.', 'AbortError'));
        options.onProgress?.(0);
      },
    };
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

  /** `DELETE` que devolve um recurso no envelope `{ data }`. */
  deleteWithData<T>(path: string): Promise<T> {
    return this.unwrap(this.http.delete<ApiEnvelope<T>>(this.url(path)), path);
  }

  async postNoContent(path: string, body?: unknown): Promise<void> {
    await firstValueFrom(this.http.post<void>(this.url(path), body ?? {}));
  }

  private unwrap<T>(request: Observable<ApiEnvelope<T>>, path: string): Promise<T> {
    return firstValueFrom(request.pipe(tap((response) => this.rememberCsrf(path, response)))).then(
      (response) => response.data,
    );
  }

  private rememberCsrf<T>(path: string, response: ApiEnvelope<T>): void {
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
