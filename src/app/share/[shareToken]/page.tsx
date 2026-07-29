import { PublicTrip } from "@/components/PublicTrip";

export default async function SharePage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  return <PublicTrip mode="legacy" shareToken={(await params).shareToken} />;
}
