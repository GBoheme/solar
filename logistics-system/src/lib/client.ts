"use client";

// أدوات الاتصال بالخادم من جهة المتصفح

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  let data: unknown = null;
  try {
    data = await res.json();
  } catch { /* استجابات غير JSON */ }
  if (!res.ok) {
    const msg = (data as { error?: string })?.error || `خطأ في الخادم (${res.status})`;
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

export const apiGet = <T = unknown>(url: string) => request<T>(url);
export const apiPost = <T = unknown>(url: string, body?: unknown) =>
  request<T>(url, {
    method: "POST",
    headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
  });
export const apiPatch = <T = unknown>(url: string, body?: unknown) =>
  request<T>(url, {
    method: "PATCH",
    headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
  });
export const apiDelete = <T = unknown>(url: string, body?: unknown) =>
  request<T>(url, {
    method: "DELETE",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
