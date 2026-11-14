import { ProtectedRoute } from "@/components/auth/protected-route";
import { RoomsView } from "@/components/social/rooms-view";

export default function RoomsPage() {
  return (
    <ProtectedRoute>
      <RoomsView />
    </ProtectedRoute>
  );
}