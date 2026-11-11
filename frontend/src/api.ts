export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(body.error || 'Yêu cầu thất bại.');
  }
  return response.json() as Promise<T>;
}

export const post = <T>(url: string, body?: unknown) => api<T>(url, { method: 'POST', body: JSON.stringify(body ?? {}) });
export const put = <T>(url: string, body: unknown) => api<T>(url, { method: 'PUT', body: JSON.stringify(body) });
