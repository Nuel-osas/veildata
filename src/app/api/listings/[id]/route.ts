import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/listings/[id] — fetch a single listing by listingId
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const listing = await getPrisma().listing.findUnique({
    where: { listingId: id },
  });

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  // Don't expose the encryption key in public listing responses
  const { encryptionKey: _key, ...publicListing } = listing;
  return NextResponse.json(publicListing);
}
