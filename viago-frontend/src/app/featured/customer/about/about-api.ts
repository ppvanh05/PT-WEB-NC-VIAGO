export async function aboutRequest<T>(
  path: string,
  body?: object | FormData,
  signal?: AbortSignal,
): Promise<T> {
  const multipart = body instanceof FormData;
  const response = await fetch('/customer/about' + path, {
    method: body ? 'POST' : 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body && !multipart ? { 'Content-Type': 'application/json' } : {}),
    },
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(30000)])
      : AbortSignal.timeout(30000),
    ...(body ? { body: multipart ? body : JSON.stringify(body) } : {}),
  });
  if (!/json/i.test(response.headers.get('content-type') || ''))
    throw new Error('Chưa kết nối được dịch vụ. Vui lòng thử lại.');
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      Array.isArray(data.message)
        ? data.message.join('. ')
        : typeof data.message === 'string'
          ? data.message
          : 'Không thực hiện được yêu cầu.',
    );
  return data as T;
}
