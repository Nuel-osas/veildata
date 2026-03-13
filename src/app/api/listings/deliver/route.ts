import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/listings/deliver — seller delivers key to buyer
export async function POST(req: NextRequest) {
  const { listingId, seller } = await req.json();

  if (!listingId || !seller) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const prisma = getPrisma();

  // Verify the seller owns this listing
  const listing = await prisma.listing.findFirst({
    where: { listingId, seller },
  });
  if (!listing) {
    return NextResponse.json({ error: "Listing not found or not your listing" }, { status: 404 });
  }

  // Mark all purchases for this listing as delivered
  await prisma.purchase.updateMany({
    where: { listingId, status: "escrowed" },
    data: { status: "delivered" },
  });

  // Update listing status
  await prisma.listing.updateMany({
    where: { listingId },
    data: { status: "delivered" },
  });

  return NextResponse.json({ success: true });
}
