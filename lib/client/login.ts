// lib/client/login.ts
import { apiFetch, getErrorMessage } from "./api";

export type BackendUser = {
  id: string;
  email: string;
  name?: string;
  picture?: string;
};

export async function loginWithGoogle(credential: string): Promise<BackendUser> {
  if (!credential) {
    throw new Error("Credential Google tidak ditemukan");
  }

  const res = await apiFetch("/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });

  if (!res.ok) {
    throw new Error(
      await getErrorMessage(res, "Terjadi kesalahan saat login dengan Google"),
    );
  }

  const data = (await res.json()) as { user: BackendUser };
  return data.user;
}
