// app/(app)/laporan/page.tsx
import type { Metadata } from "next";
import { LaporanPage } from "@/components/laporan/laporan";

export const metadata: Metadata = {
  title: "Laporan - Pencatatan Pengeluaran",
};

export default function Laporan() {
  return <LaporanPage />;
}
