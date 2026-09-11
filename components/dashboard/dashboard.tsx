"use client";

import { useState } from "react";
import { PemasukanForm } from "./pemasukan-form";
import { PengeluaranForm } from "./pengeluaran-form";
import {
  TransactionTypeTabs,
  type TransactionType,
} from "./transaction-type-tabs";

export const Dashboard = () => {
  const [transactionType, setTransactionType] =
    useState<TransactionType>("pengeluaran");

  return (
    <main className="pt-5">
      <section className="w-full max-w-2xl rounded-2xl bg-white border border-gray-200 shadow-lg p-6 dark:bg-slate-900 dark:border-slate-700">
        <TransactionTypeTabs
          value={transactionType}
          onChange={setTransactionType}
        />

        {transactionType === "pengeluaran" ? (
          <PengeluaranForm />
        ) : (
          <PemasukanForm />
        )}
      </section>
    </main>
  );
};
