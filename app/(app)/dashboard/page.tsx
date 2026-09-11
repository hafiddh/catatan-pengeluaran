// app/(app)/dashboard/page.tsx
import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/dashboard";

export const metadata: Metadata = {
  title: "Dashboard - Pencatatan Pengeluaran",
};

export default function DashboardPage() {
  return <Dashboard />;
}
