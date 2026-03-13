import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/listings/[id]/key?seller=aleo1... — fetch encryption key for a listing (seller only)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const seller = req.nextUrl.searchParams.get("seller");

  if (!seller) {
    return NextResponse.json({ error: "Missing seller address" }, { status: 400 });
  }

  const listing = await getPrisma().listing.findUnique({
    where: { listingId: id },
    select: { seller: true, encryptionKey: true },
  });

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  if (listing.seller !== seller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({ encryptionKey: listing.encryptionKey });
}
