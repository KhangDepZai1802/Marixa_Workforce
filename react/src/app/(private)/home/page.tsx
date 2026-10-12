import { getActor } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WorkspaceHome } from "@/features/workspace/workspace-home";

export default async function HomePage() {
  const actor = await getActor();
  if (!actor) redirect("/login");
  return <WorkspaceHome role={actor.role} employeeId={actor.employeeId} />;
}
