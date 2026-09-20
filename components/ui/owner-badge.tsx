"use client";

import Image from "next/image";
import { HOUSEHOLD_MEMBERS, findMember } from "@/lib/household";

// Satu warna per anggota, diurutkan sesuai HOUSEHOLD_MEMBERS supaya id tidak
// perlu ditulis ulang di sini.
const PALETTE = [
  "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200",
  "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-200",
];

const FALLBACK =
  "bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300";

export function OwnerBadge({ userId }: { userId: string }) {
  const member = findMember(userId);
  if (!member) return null;

  const index = HOUSEHOLD_MEMBERS.findIndex((item) => item.id === userId);
  const tone = PALETTE[index] ?? FALLBACK;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5 text-[11px] font-semibold ${tone}`}
      title={`Dicatat oleh ${member.name}`}
    >
      <Image
        src={member.avatar}
        alt=""
        width={36}
        height={36}
        className="h-5 w-5 rounded-full bg-white object-cover"
      />
      {member.name}
    </span>
  );
}
