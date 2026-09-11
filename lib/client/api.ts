let refreshInFlight: Promise<boolean> | null = null;

async function parseMessage(response: Response): Promise<string> {
  try {
    const data = await response.clone().json();
    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message;
    }
  } catch {
    // ignore non-json payload
  }
  return "";
}

async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

function redirectToLogin(): void {
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const requestInit: RequestInit = { ...init, credentials: "include" };

  let response = await fetch(`/api${path}`, requestInit);

  if (response.status === 401) {
    const message = await parseMessage(response);
    if (message === "JWT tidak valid") {
      const refreshed = await refreshSession();
      if (refreshed) {
        response = await fetch(`/api${path}`, requestInit);
      }
      if (!refreshed || response.status === 401) {
        redirectToLogin();
      }
    }
  }

  return response;
}

export async function getErrorMessage(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  return (await parseMessage(response)) || fallbackMessage;
}
