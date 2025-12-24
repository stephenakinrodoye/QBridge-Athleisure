"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { iamFetch } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await iamFetch("/auth/me");
      if (!res.ok) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      setMe(data.user);
    })();
  }, [router]);

  if (!me) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="mt-2">Logged in as: {me.fullName} ({me.role})</p>
    </div>
  );
}
