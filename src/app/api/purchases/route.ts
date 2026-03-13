import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/purchases?buyer=aleo1... — fetch purchases for a buyer
export async function GET(req: NextRequest) {
  const buyer = req.nextUrl.searchParams.get("buyer");

  const purchases = await getPrisma().purchase.findMany({
    where: buyer ? { buyer } : {},
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(purchases);
}

// POST /api/purchases — record a purchase after on-chain tx
export async function POST(req: NextRequest) {
  const body = await req.json();

  const { listingId, buyer, seller, amount, blobHash, txId } = body;

  if (!listingId || !buyer || !txId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const purchase = await getPrisma().purchase.create({
    data: {
      listingId,
      buyer,
      seller,
      amount,
      blobHash,
      txId,
    },
  });

  return NextResponse.json(purchase, { status: 201 });
}
