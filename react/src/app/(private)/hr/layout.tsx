import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth";

export default async function HrLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.mustChangePassword) redirect("/change-password");
  if (actor.role !== "hr" && actor.role !== "admin") redirect("/today");
  return children;
}
