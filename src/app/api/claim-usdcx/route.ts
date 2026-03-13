import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { exec } from "child_process";
import { promisify } from "util";

export const dynamic = "force-dynamic";
const execAsync = promisify(exec);

const DEPLOYER_KEY = process.env.ALEO_PRIVATE_KEY;
const CLAIM_AMOUNT = "3000000u128"; // 3 USDCx (6 decimals)
const LEO_PROJECT_PATH = process.env.LEO_PROJECT_PATH || "/Users/emmanuelosadebe/Downloads/akeindo/veildata";

// POST /api/claim-usdcx — faucet: sends 3 USDCx to requester (one-time per wallet)
export async function POST(req: NextRequest) {
  const { address } = await req.json();

  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  if (!DEPLOYER_KEY) {
    return NextResponse.json({ error: "Faucet not configured" }, { status: 500 });
  }

  const prisma = getPrisma();

  // Check if already claimed
  const existing = await prisma.purchase.findFirst({
    where: { buyer: address, listingId: "faucet_claim" },
  });
  if (existing) {
    return NextResponse.json({ error: "Already claimed" }, { status: 409 });
  }

  try {
    // Execute transfer from deployer wallet to claimer
    const cmd = `cd ${LEO_PROJECT_PATH} && leo execute --private-key ${DEPLOYER_KEY} --network testnet --endpoint https://api.explorer.provable.com/v1 --broadcast --yes test_usdcx_stablecoin.aleo/transfer_public ${address} ${CLAIM_AMOUNT} 2>&1`;

    const { stdout } = await execAsync(cmd, { timeout: 120000 });

    // Extract tx ID from output
    const txMatch = stdout.match(/transaction ID: '(at1[a-z0-9]+)'/);
    const txId = txMatch ? txMatch[1] : "pending";

    // Record the claim
    await prisma.purchase.create({
      data: {
        listingId: "faucet_claim",
        buyer: address,
        seller: "faucet",
        amount: 3,
        blobHash: "faucet",
        txId,
      },
    });

    return NextResponse.json({ success: true, txId });
  } catch (err) {
    console.error("Faucet transfer failed:", err);
    return NextResponse.json({ error: "Faucet transfer failed. Try again later." }, { status: 500 });
  }
}
