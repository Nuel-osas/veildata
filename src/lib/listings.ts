/**
 * API client for listings and purchases.
 * Reads/writes to PostgreSQL via Next.js API routes.
 */

export interface ListingRecord {
  id: number;
  listingId: string;
  title: string;
  description: string;
  category: string;
  price: number;
  rowCount: number;
  schemaFields: string;
  seller: string;
  blobId: string;
  hasEncryptionKey: boolean;
  txId: string;
  status: string;
  createdAt: string;
}

export interface PurchaseRecord {
  id: number;
  listingId: string;
  buyer: string;
  seller: string;
  amount: number;
  blobHash: string;
  txId: string;
  status: string;
  createdAt: string;
}

export async function fetchListings(category?: string): Promise<ListingRecord[]> {
  const params = category && category !== "All" ? `?category=${category}` : "";
  const res = await fetch(`/api/listings${params}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchListing(listingId: string): Promise<ListingRecord | null> {
  const res = await fetch(`/api/listings/${listingId}`);
  if (!res.ok) return null;
  return res.json();
}

export async function createListing(data: {
  listingId: string;
  title: string;
  description: string;
  category: string;
  price: number;
  rowCount: number;
  schemaFields: string;
  seller: string;
  blobId: string;
  encryptionKey: string;
  txId: string;
}): Promise<ListingRecord> {
  const res = await fetch("/api/listings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save listing");
  return res.json();
}

export async function fetchEncryptionKey(listingId: string, seller: string): Promise<string | null> {
  const res = await fetch(`/api/listings/${listingId}/key?seller=${seller}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.encryptionKey;
}

export async function fetchPurchases(buyer?: string): Promise<PurchaseRecord[]> {
  const params = buyer ? `?buyer=${buyer}` : "";
  const res = await fetch(`/api/purchases${params}`);
  if (!res.ok) return [];
  return res.json();
}

export async function createPurchase(data: {
  listingId: string;
  buyer: string;
  seller: string;
  amount: number;
  blobHash: string;
  txId: string;
}): Promise<PurchaseRecord> {
  const res = await fetch("/api/purchases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save purchase");
  return res.json();
}
