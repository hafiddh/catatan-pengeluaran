// app/(app)/list/page.tsx
import type { Metadata } from "next";
import { ListNotesPage } from "@/components/list/list";

export const metadata: Metadata = {
  title: "List - Pencatatan Pengeluaran",
};

export default function ListPage() {
  return <ListNotesPage />;
}
