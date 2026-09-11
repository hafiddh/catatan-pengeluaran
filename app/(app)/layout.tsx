import { redirect } from "next/navigation";
import { requireUser, UnauthorizedError } from "@/lib/server/session";
import { AuthProvider } from "@/lib/client/auth-context";
import AppShell from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      redirect("/login");
    }
    throw err;
  }

  return (
    <AuthProvider user={user}>
      <AppShell user={user}>{children}</AppShell>
    </AuthProvider>
  );
}
