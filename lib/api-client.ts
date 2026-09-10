export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { cache: 'no-store', signal });
  const body = await response.json();
  if (!response.ok) throw new ApiError(body.error || 'Não foi possível carregar os registros.', response.status);
  return body as T;
}
