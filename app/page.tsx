import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default function Page() {
  return (
    <ProtectedRoute>
      <DashboardView />
    </ProtectedRoute>
  );
}