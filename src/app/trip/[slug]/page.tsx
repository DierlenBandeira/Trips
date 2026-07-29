import { PublicTrip } from "@/components/PublicTrip";

export default async function PublicTripPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ share?: string | string[] }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const shareToken =
    typeof query.share === "string" ? query.share : undefined;
  return <PublicTrip mode="slug" slug={slug} shareToken={shareToken} />;
}
