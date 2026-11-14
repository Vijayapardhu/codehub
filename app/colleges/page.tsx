import { ProtectedRoute } from "@/components/auth/protected-route";
import { CollegesView } from "@/components/social/colleges-view";

export default function CollegesPage() {
  return (
    <ProtectedRoute>
      <CollegesView />
    </ProtectedRoute>
  );
}