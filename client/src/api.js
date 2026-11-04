export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
export const TOKEN_KEY = "signcms_token";

/** Returns a fetch wrapper that adds the auth header and throws readable errors. */
export function createApi(token) {
  return async function api(path, options = {}) {
    const isForm = options.body instanceof FormData;
    const response = await fetch(API_URL + path, {
      ...options,
      headers: {
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(options.headers || {}),
      },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Request failed");
    return body;
  };
}
