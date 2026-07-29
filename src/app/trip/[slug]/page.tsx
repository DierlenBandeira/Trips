import { PublicTrip } from "@/components/PublicTrip";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PublicTripPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <PublicTrip slug={(await params).slug} />;
}
