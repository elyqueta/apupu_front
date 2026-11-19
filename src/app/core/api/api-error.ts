import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorEnvelope } from './api.models';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string[]> = {},
    readonly requestId = '',
    /** Contexto adicional devolvido pela API (ex.: tarefas abertas). */
    readonly details: unknown = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (typeof value !== 'object' || value === null || !('error' in value)) {
    return false;
  }
  const error = value.error;
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string' &&
    'request_id' in error &&
    typeof error.request_id === 'string'
  );
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (error instanceof HttpErrorResponse) {
    if (isApiErrorEnvelope(error.error)) {
      return new ApiError(
        error.status,
        error.error.error.code,
        error.error.error.message,
        error.error.error.fields ?? {},
        error.error.error.request_id,
        error.error.error.details ?? null,
      );
    }
    return new ApiError(
      error.status,
      error.status === 0 ? 'network_error' : 'unexpected_response',
      error.status === 0
        ? 'Não foi possível contactar o servidor. Verifica a ligação e tenta novamente.'
        : 'O servidor devolveu uma resposta inesperada.',
    );
  }
  return new ApiError(
    0,
    'unexpected_error',
    'Não foi possível concluir a operação. Tenta novamente.',
  );
}
