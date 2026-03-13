"use client";

import { useState, useRef, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { motion } from "framer-motion";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import Footer from "@/components/shared/Footer";
import { buildClaimTestUsdcxTx, buildBuyVaultStorageTx, buildConvertToPrivateTx, executeWithRetry } from "@/lib/aleo";
import {
  fetchListings,
  fetchPurchases,
  fetchListing,
  ListingRecord,
  PurchaseRecord,
} from "@/lib/listings";
import { encryptFile, decryptBlob, packKey, unpackKey } from "@/lib/crypto";
import { uploadToWalrus, fetchFromWalrus } from "@/lib/walrus";
import {
  fetchVaultStorage,
  fetchVaultFiles,
  saveVaultFile,
  recordStoragePurchase,
  fetchVaultFileKey,
  VaultStorageInfo,
  VaultFileRecord,
} from "@/lib/vault";
import Link from "next/link";

type Tab = "purchases" | "listings" | "vault";

const WALRUS_CREATOR = process.env.NEXT_PUBLIC_WALRUS_CREATOR_ADDRESS || "";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + " " + units[i];
}

export default function DashboardPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>("purchases");
  const { address, executeTransaction, connected } = useWallet();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [myListings, setMyListings] = useState<ListingRecord[]>([]);
  const [myPurchases, setMyPurchases] = useState<PurchaseRecord[]>([]);
  const [aleoBalance, setAleoBalance] = useState<string>("—");
  const [usdcxBalance, setUsdcxBalance] = useState<string>("—");

  // Vault state
  const [vaultStorage, setVaultStorage] = useState<VaultStorageInfo>({ totalBytes: 0, usedBytes: 0, remainingBytes: 0 });
  const [vaultFiles, setVaultFiles] = useState<VaultFileRecord[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  useEffect(() => {
    fetchListings().then(setMyListings);
    if (address) {
      fetchPurchases(address).then(setMyPurchases);
      fetchVaultStorage(address).then(setVaultStorage);
      fetchVaultFiles(address).then(setVaultFiles);

      const apiBase = process.env.NEXT_PUBLIC_ALEO_API || "https://api.explorer.provable.com/v1";
      const network = process.env.NEXT_PUBLIC_ALEO_NETWORK || "testnet";

      // Fetch ALEO public balance
      fetch(`${apiBase}/${network}/program/credits.aleo/mapping/account/${address}`)
        .then((r) => r.text())
        .then((raw) => {
          if (raw && raw !== "null") {
            const microcredits = parseInt(raw.replace(/"/g, "").replace("u64", ""));
            setAleoBalance((microcredits / 1_000_000).toFixed(2));
          } else {
            setAleoBalance("0");
          }
        })
        .catch(() => setAleoBalance("—"));

      // Fetch USDCx public balance
      fetch(`${apiBase}/${network}/program/test_usdcx_stablecoin.aleo/mapping/balances/${address}`)
        .then((r) => r.text())
        .then((raw) => {
          if (raw && raw !== "null") {
            const amount = parseInt(raw.replace(/"/g, "").replace("u128", ""));
            setUsdcxBalance((amount / 1_000_000).toFixed(2));
          } else {
            setUsdcxBalance("0");
          }
        })
        .catch(() => setUsdcxBalance("—"));
    }
  }, [address]);

  const refreshVault = async () => {
    if (!address) return;
    const [storage, files] = await Promise.all([
      fetchVaultStorage(address),
      fetchVaultFiles(address),
    ]);
    setVaultStorage(storage);
    setVaultFiles(files);
  };

  const userListings = address
    ? myListings.filter((l) => l.seller === address)
    : myListings;

  const totalEarned = userListings.reduce((sum, l) => sum + l.price, 0);
  const totalSpent = myPurchases.reduce((sum, p) => sum + p.amount, 0);

  useGSAP(
    () => {
      gsap.from(".dash-header", { y: 30, opacity: 0, duration: 0.7, ease: "power3.out", delay: 0.2 });
      gsap.from(".dash-stats", { y: 40, opacity: 0, duration: 0.7, ease: "power3.out", stagger: 0.1, delay: 0.3 });
      gsap.from(".dash-content", { y: 50, opacity: 0, duration: 0.7, ease: "power3.out", delay: 0.5 });
    },
    { scope: pageRef }
  );

  const [convertStatus, setConvertStatus] = useState<"idle" | "success" | "error" | "insufficient">("idle");

  const handleConvertToPrivate = async () => {
    if (!address || !executeTransaction) return;
    setActionLoading("convert");
    setConvertStatus("idle");

    // Check if user has enough public ALEO (need 2 ALEO + fee buffer)
    const currentBalance = parseFloat(aleoBalance);
    if (isNaN(currentBalance) || currentBalance < 2.5) {
      setConvertStatus("insufficient");
      setTimeout(() => setConvertStatus("idle"), 5000);
      setActionLoading(null);
      return;
    }

    try {
      // Convert 2 ALEO to private (enough for platform fee + buffer)
      const tx = buildConvertToPrivateTx(address, 2_000_000);
      await executeWithRetry(executeTransaction, tx);
      setConvertStatus("success");
      setTimeout(() => setConvertStatus("idle"), 5000);
    } catch (err) {
      console.error("Convert to private failed:", err);
      setConvertStatus("error");
      setTimeout(() => setConvertStatus("idle"), 5000);
    }
    setActionLoading(null);
  };

  const [claimStatus, setClaimStatus] = useState<"idle" | "success" | "error" | "already">("idle");

  const handleClaimUsdcx = async () => {
    if (!address) return;
    setActionLoading("claim-usdcx");
    setClaimStatus("idle");
    try {
      const res = await fetch("/api/claim-usdcx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (!res.ok) {
        setClaimStatus(data.error === "Already claimed" ? "already" : "error");
        throw new Error(data.error || "Claim failed");
      }
      setClaimStatus("success");
      // Auto-hide after 5 seconds
      setTimeout(() => setClaimStatus("idle"), 5000);
    } catch (err) {
      console.error("Claim USDCx failed:", err);
      if (claimStatus === "idle") setClaimStatus("error");
      setTimeout(() => setClaimStatus("idle"), 5000);
    }
    setActionLoading(null);
  };

  // Vault handlers

  const handleBuyStorage = async (quantity: number = 1) => {
    if (!address || !executeTransaction) return;
    setActionLoading("buy-storage");
    try {
      const programAddress = "aleo17kc2tkll7plruvg4kvd9p93udknx977dldrw7me02znh5naf0u8sf5zd88";
      const apiBase = process.env.NEXT_PUBLIC_ALEO_API || "https://api.explorer.provable.com/v1";
      const network = process.env.NEXT_PUBLIC_ALEO_NETWORK || "testnet";

      // Step 1: Send USDCx to program address
      const tx = buildBuyVaultStorageTx(quantity);
      const result = await executeWithRetry(executeTransaction, tx);
      if (!result?.transactionId) {
        throw new Error("Storage payment was rejected or not confirmed");
      }

      // Step 2: Poll for on-chain confirmation (up to 60 seconds)
      const beforeRes = await fetch(`${apiBase}/${network}/program/test_usdcx_stablecoin.aleo/mapping/balances/${programAddress}`);
      const beforeRaw = await beforeRes.text();
      const beforeBalance = beforeRaw && beforeRaw !== "null" ? parseInt(beforeRaw.replace(/"/g, "").replace("u128", "")) : 0;

      let confirmed = false;
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const res = await fetch(`${apiBase}/${network}/program/test_usdcx_stablecoin.aleo/mapping/balances/${programAddress}`);
        const raw = await res.text();
        const currentBalance = raw && raw !== "null" ? parseInt(raw.replace(/"/g, "").replace("u128", "")) : 0;
        if (currentBalance > beforeBalance) {
          confirmed = true;
          break;
        }
      }

      if (!confirmed) {
        throw new Error("Payment not confirmed on-chain. Please check your wallet balance and try again.");
      }

      // Step 3: Record purchase in DB
      await recordStoragePurchase({ owner: address, txId: result.transactionId, quantity });
      await refreshVault();
    } catch (err) {
      console.error("Buy storage failed:", err);
    }
    setActionLoading(null);
  };

  const handleUploadFile = async () => {
    if (!address || !uploadFile) return;
    setActionLoading("upload");
    try {
      if (uploadFile.size > vaultStorage.remainingBytes) {
        setUploadProgress("Not enough storage. Buy more space first.");
        setActionLoading(null);
        return;
      }

      setUploadProgress("Encrypting file...");
      const encrypted = await encryptFile(uploadFile);

      setUploadProgress("Uploading to Walrus...");
      const uploadResult = await uploadToWalrus(
        encrypted.encryptedBlob,
        WALRUS_CREATOR
      );

      setUploadProgress("Saving to vault...");
      const packedKey = packKey(encrypted.key, encrypted.iv);
      await saveVaultFile({
        owner: address,
        fileName: uploadFile.name,
        fileSize: uploadFile.size,
        blobId: uploadResult.blobId,
        encryptionKey: packedKey,
      });

      await refreshVault();
      setUploadFile(null);
      setUploadProgress(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      console.error("Upload failed:", err);
      setUploadProgress(message);
    }
    setActionLoading(null);
  };

  const handleDownloadFile = async (file: VaultFileRecord) => {
    if (!address) return;
    setActionLoading(`download-${file.id}`);
    try {
      const fullFile = await fetchVaultFileKey(file.id, address);
      if (!fullFile?.encryptionKey) throw new Error("Could not retrieve encryption key");

      const { key, iv } = unpackKey(fullFile.encryptionKey);

      const encryptedData = await fetchFromWalrus(file.blobId);

      const decrypted = await decryptBlob(encryptedData, key, iv);

      const blob = new Blob([decrypted]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
    setActionLoading(null);
  };

  const handleDownloadPurchase = async (purchase: PurchaseRecord) => {
    if (!address) return;
    setActionLoading(`download-purchase-${purchase.txId}`);
    try {
      // Fetch listing details to get blobId and title
      const listing = await fetchListing(purchase.listingId);
      if (!listing) throw new Error("Listing not found");

      // Fetch decryption key
      const keyRes = await fetch(`/api/listings/${purchase.listingId}/key?address=${address}`);
      if (!keyRes.ok) {
        const data = await keyRes.json();
        throw new Error(data.error || "Could not retrieve decryption key");
      }
      const { encryptionKey } = await keyRes.json();
      const { key, iv } = unpackKey(encryptionKey);

      // Fetch and decrypt
      const encryptedData = await fetchFromWalrus(listing.blobId);
      const decrypted = await decryptBlob(encryptedData, key, iv);

      // Trigger download
      const blob = new Blob([decrypted]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${listing.title.replace(/\s+/g, "_")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
    setActionLoading(null);
  };

  const usagePercent = vaultStorage.totalBytes > 0
    ? Math.min(100, (vaultStorage.usedBytes / vaultStorage.totalBytes) * 100)
    : 0;

  return (
    <div ref={pageRef}>
      <main className="min-h-screen pt-28 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="dash-header mb-10">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-accent uppercase tracking-widest">
                  Dashboard
                </span>
                <h1 className="text-4xl md:text-5xl font-bold mt-3">
                  Your activity
                </h1>
                {!connected && (
                  <p className="text-muted mt-2 text-sm">
                    Connect Shield Wallet to see your activity.
                  </p>
                )}
              </div>
              {connected && (
                <div className="flex gap-2">
                  <motion.button
                    onClick={handleConvertToPrivate}
                    disabled={actionLoading === "convert"}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-5 py-2.5 border border-accent/30 text-accent text-sm font-semibold rounded-full disabled:opacity-50"
                  >
                    {actionLoading === "convert" ? "Converting..." : "Get 2 Private ALEO"}
                  </motion.button>
                  <motion.button
                    onClick={handleClaimUsdcx}
                    disabled={actionLoading === "claim-usdcx"}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-5 py-2.5 bg-accent text-black text-sm font-semibold rounded-full disabled:opacity-50"
                  >
                    {actionLoading === "claim-usdcx" ? "Claiming..." : "Claim 3 USDCx"}
                  </motion.button>
                </div>
              )}
            </div>
          </div>

          {/* Convert to Private Status */}
          {convertStatus !== "idle" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mb-6 p-4 rounded-xl text-sm font-medium ${
                convertStatus === "success"
                  ? "bg-green-500/10 border border-green-500/20 text-green-400"
                  : convertStatus === "insufficient"
                  ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-400"
                  : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}
            >
              {convertStatus === "success" && "2 ALEO converted to private successfully! You can now list data on the marketplace."}
              {convertStatus === "insufficient" && "Insufficient public ALEO. You need at least 2.5 ALEO to convert. Fund your wallet first."}
              {convertStatus === "error" && "Convert to private failed. Please try again."}
            </motion.div>
          )}

          {/* Claim Status */}
          {claimStatus !== "idle" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mb-6 p-4 rounded-xl text-sm font-medium ${
                claimStatus === "success"
                  ? "bg-green-500/10 border border-green-500/20 text-green-400"
                  : claimStatus === "already"
                  ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-400"
                  : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}
            >
              {claimStatus === "success" && "3 USDCx claimed successfully! Check your wallet balance."}
              {claimStatus === "already" && "You've already claimed your 3 USDCx."}
              {claimStatus === "error" && "Claim failed. Please try again later."}
            </motion.div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { label: "ALEO Balance", value: `${aleoBalance} ALEO` },
              { label: "USDCx Balance", value: `${usdcxBalance} USDCx` },
              { label: "Listings", value: userListings.length.toString() },
              { label: "Purchases", value: myPurchases.length.toString() },
            ].map((stat) => (
              <div key={stat.label} className="dash-stats glass-card rounded-xl p-5">
                <span className="text-xs text-muted">{stat.label}</span>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="dash-content">
            <div className="flex gap-1 border-b border-border mb-8">
              {(["purchases", "listings", "vault"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                    tab === t
                      ? "border-accent text-accent"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Purchases Tab */}
            {tab === "purchases" && (
              <div className="space-y-4">
                {myPurchases.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-muted mb-4">No purchases yet.</p>
                    <Link
                      href="/marketplace"
                      className="text-accent hover:underline text-sm"
                    >
                      Browse the marketplace
                    </Link>
                  </div>
                ) : (
                  myPurchases.map((p) => (
                    <motion.div
                      key={p.txId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <h3 className="font-semibold">Listing {p.listingId.slice(0, 12)}...</h3>
                        <p className="text-xs text-muted mt-1">
                          {new Date(p.createdAt).toLocaleDateString()} · Tx: {p.txId.slice(0, 16)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-accent font-bold">{p.amount} USDCx</span>
                        <span className="text-xs font-mono px-2.5 py-1 rounded-full text-green-400 bg-green-400/10">
                          completed
                        </span>
                        <motion.button
                          onClick={() => handleDownloadPurchase(p)}
                          disabled={actionLoading === `download-purchase-${p.txId}`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-4 py-2 bg-accent text-black text-xs font-semibold rounded-full disabled:opacity-50"
                        >
                          {actionLoading === `download-purchase-${p.txId}` ? "Decrypting..." : "Download"}
                        </motion.button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* Listings Tab */}
            {tab === "listings" && (
              <div className="space-y-4">
                {userListings.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-muted mb-4">You haven&apos;t listed any data yet.</p>
                    <Link
                      href="/sell"
                      className="inline-block px-6 py-3 bg-accent text-black font-semibold rounded-full hover:bg-accent-dim transition-colors"
                    >
                      List Your Data
                    </Link>
                  </div>
                ) : (
                  userListings.map((l) => (
                    <motion.div
                      key={l.listingId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <Link href={`/listing/${l.listingId}`} className="font-semibold hover:text-accent transition-colors">
                          {l.title}
                        </Link>
                        <p className="text-xs text-muted mt-1">
                          {new Date(l.createdAt).toLocaleDateString()} · {l.category}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-accent font-bold">{l.price} USDCx</span>
                        <span className={`text-xs font-mono px-2.5 py-1 rounded-full ${
                          l.status === "active"
                            ? "text-green-400 bg-green-400/10"
                            : l.status === "delivered"
                            ? "text-blue-400 bg-blue-400/10"
                            : "text-yellow-400 bg-yellow-400/10"
                        }`}>
                          {l.status}
                        </span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* Vault Tab */}
            {tab === "vault" && (
              <div className="space-y-6">
                {/* Storage Meter */}
                <div className="glass-card rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">Vault Storage</h3>
                      <p className="text-xs text-muted mt-1">
                        {formatBytes(vaultStorage.usedBytes)} of {formatBytes(vaultStorage.totalBytes)} used
                      </p>
                    </div>
                    <motion.button
                      onClick={() => handleBuyStorage(1)}
                      disabled={actionLoading === "buy-storage"}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-5 py-2.5 bg-accent text-black text-sm font-semibold rounded-full disabled:opacity-50"
                    >
                      {actionLoading === "buy-storage" ? "Buying..." : "Buy 100MB — 1 USDCx"}
                    </motion.button>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-500"
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted">
                    <span>{formatBytes(vaultStorage.remainingBytes)} remaining</span>
                    <span>{usagePercent.toFixed(1)}%</span>
                  </div>
                </div>

                {/* Upload Section */}
                {vaultStorage.totalBytes > 0 && (
                  <div className="glass-card rounded-xl p-6">
                    <h3 className="font-semibold mb-4">Upload File</h3>
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                      <label className="flex-1 w-full cursor-pointer" htmlFor="vault-file-input">
                        <input
                          type="file"
                          onChange={(e) => {
                            setUploadFile(e.target.files?.[0] || null);
                            setUploadProgress(null);
                          }}
                          className="hidden"
                          id="vault-file-input"
                        />
                        <div className="border border-dashed border-border rounded-lg p-4 text-center hover:border-accent/50 transition-colors">
                          {uploadFile ? (
                            <div>
                              <p className="text-sm font-medium">{uploadFile.name}</p>
                              <p className="text-xs text-muted mt-1">{formatBytes(uploadFile.size)}</p>
                            </div>
                          ) : (
                            <p className="text-sm text-muted">Click to select a file</p>
                          )}
                        </div>
                      </label>
                      <motion.button
                        onClick={handleUploadFile}
                        disabled={!uploadFile || actionLoading === "upload"}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-6 py-3 bg-accent text-black text-sm font-semibold rounded-full disabled:opacity-50 whitespace-nowrap"
                      >
                        {actionLoading === "upload" ? "Uploading..." : "Encrypt & Upload"}
                      </motion.button>
                    </div>
                    {uploadProgress && (
                      <p className="text-xs text-muted mt-3">{uploadProgress}</p>
                    )}
                  </div>
                )}

                {/* File List */}
                <div>
                  <h3 className="font-semibold mb-4">Your Files</h3>
                  {vaultFiles.length === 0 ? (
                    <div className="text-center py-16">
                      <p className="text-muted mb-2">No files in your vault yet.</p>
                      {vaultStorage.totalBytes === 0 && (
                        <p className="text-xs text-muted">Buy storage to start uploading files.</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {vaultFiles.map((file) => (
                        <motion.div
                          key={file.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="glass-card rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent text-sm font-bold">
                              {file.fileName.split(".").pop()?.toUpperCase().slice(0, 3) || "FILE"}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{file.fileName}</p>
                              <p className="text-xs text-muted mt-0.5">
                                {formatBytes(file.fileSize)} · {new Date(file.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <motion.button
                            onClick={() => handleDownloadFile(file)}
                            disabled={actionLoading === `download-${file.id}`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-4 py-2 bg-accent text-black text-xs font-semibold rounded-full disabled:opacity-50"
                          >
                            {actionLoading === `download-${file.id}` ? "Decrypting..." : "Download"}
                          </motion.button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
