import { TripPlanner } from "@/components/TripPlanner";

export default async function TripPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  return <TripPlanner tripId={(await params).tripId} />;
}
