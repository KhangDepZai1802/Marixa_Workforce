import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getActor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PrivateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const actor = await getActor().catch(() => null);
  if (!actor) redirect("/login");
  if (actor.mustChangePassword) redirect("/change-password");
  return <AppShell role={actor.role}>{children}</AppShell>;
}
