export const IAM_URL = process.env.NEXT_PUBLIC_IAM_URL!;
export const CHAT_URL = process.env.NEXT_PUBLIC_CHAT_URL!;

export async function iamFetch(path: string, options: RequestInit = {}) {
  return fetch(`${IAM_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
}

export async function chatFetch(path: string, options: RequestInit = {}) {
  return fetch(`${CHAT_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
}
