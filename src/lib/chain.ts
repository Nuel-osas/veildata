/**
 * On-chain data reading helpers.
 * Reads mappings from the deployed veildata.aleo program via the Aleo REST API.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_ALEO_API || "https://api.explorer.provable.com/v1";
const PROGRAM_ID =
  process.env.NEXT_PUBLIC_ALEO_PROGRAM_ID || "veildatamarketv9.aleo";
const NETWORK = process.env.NEXT_PUBLIC_ALEO_NETWORK || "testnet";

/**
 * Read a mapping value from the program.
 */
export async function readMapping(
  mappingName: string,
  key: string
): Promise<string | null> {
  const url = `${API_BASE}/${NETWORK}/program/${PROGRAM_ID}/mapping/${mappingName}/${key}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const text = await res.text();
  if (text === "null" || !text) return null;
  return text.replace(/"/g, "");
}

/**
 * Get listing metadata from the `listings` mapping.
 */
export async function getListingMeta(listingId: string) {
  const raw = await readMapping("listings", listingId);
  if (!raw) return null;

  // Parse the struct: { category: ..., row_count: ..., schema_hash: ..., price: ..., seller: ... }
  const parse = (key: string) => {
    const re = new RegExp(`${key}:\\s*([^,}]+)`);
    const match = raw.match(re);
    return match ? match[1].trim() : "";
  };

  return {
    category: parse("category"),
    rowCount: parseInt(parse("row_count").replace("u64", "")),
    schemaHash: parse("schema_hash"),
    price: parseInt(parse("price").replace("u64", "")),
    seller: parse("seller"),
  };
}

/**
 * Get listing status (1=active, 2=purchased, 3=confirmed, 4=disputed, 5=timed_out).
 */
export async function getListingStatus(listingId: string): Promise<number | null> {
  const raw = await readMapping("listing_status", listingId);
  if (!raw) return null;
  return parseInt(raw.replace("u8", ""));
}

/**
 * Get the escrow balance for a listing.
 */
export async function getEscrowBalance(listingId: string): Promise<number | null> {
  const raw = await readMapping("escrow_balances", listingId);
  if (!raw) return null;
  return parseInt(raw.replace("u64", ""));
}

/**
 * Get total listings count.
 */
export async function getTotalListings(): Promise<number> {
  const raw = await readMapping("total_listings", "0u8");
  if (!raw) return 0;
  return parseInt(raw.replace("u64", ""));
}

/**
 * Get seller's total sales count.
 */
export async function getSellerSales(sellerHash: string): Promise<number> {
  const raw = await readMapping("seller_sales", sellerHash);
  if (!raw) return 0;
  return parseInt(raw.replace("u64", ""));
}

/**
 * Get the escrow deadline (block height) for a listing.
 */
export async function getEscrowDeadline(listingId: string): Promise<number | null> {
  const raw = await readMapping("escrow_deadlines", listingId);
  if (!raw) return null;
  return parseInt(raw.replace("u32", ""));
}

/**
 * Status label helper.
 */
export function statusLabel(status: number): string {
  switch (status) {
    case 1: return "Active";
    case 2: return "In Escrow";
    case 3: return "Completed";
    case 4: return "Disputed";
    case 5: return "Timed Out";
    default: return "Unknown";
  }
}
