import { TodayPage } from "@/features/attendance/today-page";
import { getActor } from "@/lib/auth";
export default async function TodayRoute() {
  const actor = await getActor();
  return <TodayPage employeeId={actor?.employeeId ?? ""} />;
}
