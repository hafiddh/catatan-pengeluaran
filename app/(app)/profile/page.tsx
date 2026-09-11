// app/(app)/profile/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profil - Pencatatan Pengeluaran",
  description: "Profil Pengguna",
};

export default function ProfilePage() {
  return (
    <main className="min-h-screen container-px py-8">
      <h1 className="text-2xl font-bold">Profil</h1>
    </main>
  );
}
