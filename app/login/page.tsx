import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser, UnauthorizedError } from "@/lib/server/session";
import { LoginWithGoogleProvider } from "@/components/login/login-with-google-provider";

export const metadata: Metadata = {
  title: "Login - Pencatatan Pengeluaran",
  description: "Pencatatan Pengeluaran - AngelSuicide",
};

export default async function LoginPage() {
  try {
    await requireUser();
    redirect("/dashboard");
  } catch (err) {
    if (!(err instanceof UnauthorizedError)) {
      throw err;
    }
  }

  return <LoginWithGoogleProvider />;
}
