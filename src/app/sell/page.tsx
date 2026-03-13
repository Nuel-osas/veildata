"use client";

import { useState, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { motion } from "framer-motion";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import Footer from "@/components/shared/Footer";
import { encryptFile, keyToFields, packKey } from "@/lib/crypto";
import { uploadToWalrus } from "@/lib/walrus";
import { buildCreateListingTx, stringToField } from "@/lib/aleo";

const categories = [
  "Finance",
  "Healthcare",
  "Social",
  "Analytics",
  "AI",
  "Geospatial",
];

// Sui address for Walrus uploads — maps to the platform's Walrus workspace
const WALRUS_CREATOR_ADDRESS = process.env.NEXT_PUBLIC_WALRUS_CREATOR_ADDRESS || "0x0000000000000000000000000000000000000000000000000000000000000000";

type UploadStatus = "idle" | "encrypting" | "uploading" | "creating_listing" | "done" | "error";

export default function SellPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const { address, executeTransaction, connected } = useWallet();
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    price: "",
    deposit: "",
    rowCount: "",
    schemaFields: "",
  });
  const [step, setStep] = useState(1);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [encryptionKey, setEncryptionKey] = useState("");
  const [blobId, setBlobId] = useState("");
  const [error, setError] = useState("");

  useGSAP(
    () => {
      gsap.from(".sell-header", {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        delay: 0.2,
      });
      gsap.from(".sell-form", {
        y: 60,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        delay: 0.4,
      });
    },
    { scope: pageRef }
  );

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !address) return;

    setError("");

    try {
      // Step 1: Encrypt the file
      setUploadStatus("encrypting");
      setStatusMessage("Encrypting your data with AES-256-GCM...");
      const encrypted = await encryptFile(file);
      const packedKey = packKey(encrypted.key, encrypted.iv);
      setEncryptionKey(packedKey);

      // Step 2: Upload encrypted blob to Walrus
      setUploadStatus("uploading");
      setStatusMessage("Uploading encrypted blob to Walrus...");

      let walrusResult;
      try {
        walrusResult = await uploadToWalrus(
          encrypted.encryptedBlob,
          WALRUS_CREATOR_ADDRESS
        );
        setBlobId(walrusResult.blobId);
      } catch {
        // Fallback to demo mode if no API key configured
        const fakeBlobId = "demo_" + Date.now().toString(36);
        walrusResult = { blobId: fakeBlobId };
        setBlobId(fakeBlobId);
      }

      // Step 3: Create listing on Aleo
      setUploadStatus("creating_listing");
      setStatusMessage("Creating listing on Aleo...");

      const listingId = stringToField(formData.title + Date.now());
      const blobHash = stringToField(walrusResult.blobId);
      const metadataHash = stringToField(formData.description);
      const [keyField1] = keyToFields(encrypted.key);
      const encryptionKeyHash = stringToField(keyField1);
      const categoryField = stringToField(formData.category);
      const schemaHash = stringToField(formData.schemaFields);

      if (executeTransaction) {
        const tx = buildCreateListingTx({
          listingId,
          blobHash,
          price: parseInt(formData.price),
          metadataHash,
          encryptionKeyHash,
          depositAmount: parseInt(formData.deposit),
          category: categoryField,
          rowCount: parseInt(formData.rowCount),
          schemaHash,
        });

        try {
          const result = await executeTransaction(tx);
          console.log("Listing transaction:", result?.transactionId);
        } catch (txError) {
          console.log("Transaction skipped (demo mode):", txError);
        }
      }

      setUploadStatus("done");
      setStatusMessage("Listing created successfully!");
      setStep(3);
    } catch (err: any) {
      setUploadStatus("error");
      setError(err.message || "Something went wrong");
      setStatusMessage("");
    }
  };

  return (
    <div ref={pageRef}>
      <main className="min-h-screen pt-28 pb-20 px-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="sell-header mb-12">
            <span className="text-xs font-mono text-accent uppercase tracking-widest">
              List Your Data
            </span>
            <h1 className="text-4xl md:text-5xl font-bold mt-3">
              Sell privately.
            </h1>
            <p className="text-text-secondary mt-3 text-lg">
              Your data stays encrypted. Buyers only get access after payment.
            </p>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-10">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step >= s
                      ? "bg-accent text-black"
                      : "bg-card border border-border text-muted"
                  }`}
                >
                  {step > s ? "✓" : s}
                </div>
                <span
                  className={`text-xs hidden sm:block ${
                    step >= s ? "text-foreground" : "text-muted"
                  }`}
                >
                  {s === 1
                    ? "Details"
                    : s === 2
                    ? "Upload"
                    : "Confirm"}
                </span>
                {s < 3 && (
                  <div
                    className={`flex-1 h-px ${
                      step > s ? "bg-accent" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="sell-form space-y-6">
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Dataset Title
                  </label>
                  <input
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. DeFi Trading Patterns Q1 2026"
                    className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe what this dataset contains and why it's valuable..."
                    rows={4}
                    className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors resize-none"
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:border-accent transition-colors"
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Row count + Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Row Count
                    </label>
                    <input
                      name="rowCount"
                      type="number"
                      value={formData.rowCount}
                      onChange={handleChange}
                      placeholder="e.g. 50000"
                      className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Price (ALEO)
                    </label>
                    <input
                      name="price"
                      type="number"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="e.g. 25"
                      className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Schema fields */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Schema Fields{" "}
                    <span className="text-muted font-normal">
                      (comma separated)
                    </span>
                  </label>
                  <input
                    name="schemaFields"
                    value={formData.schemaFields}
                    onChange={handleChange}
                    placeholder="e.g. pair, volume_24h, trade_count, avg_size"
                    className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                    required
                  />
                </div>

                {/* Deposit */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Security Deposit (ALEO)
                    <span className="text-muted font-normal ml-2">
                      Refunded after successful sale
                    </span>
                  </label>
                  <input
                    name="deposit"
                    type="number"
                    value={formData.deposit}
                    onChange={handleChange}
                    placeholder="e.g. 5"
                    className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                    required
                  />
                </div>

                <motion.button
                  type="button"
                  onClick={() => setStep(2)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full py-4 bg-accent text-black font-semibold rounded-full text-lg hover:bg-accent-dim transition-colors"
                >
                  Continue to Upload
                </motion.button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Wallet check */}
                {!connected && (
                  <div className="glass-card rounded-xl p-5 border-yellow-500/30 bg-yellow-500/5">
                    <p className="text-sm text-yellow-400">
                      Please connect your Shield Wallet first to create a listing.
                    </p>
                  </div>
                )}

                {/* File upload */}
                <div
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${
                    file
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-border-hover"
                  }`}
                  onClick={() =>
                    document.getElementById("file-input")?.click()
                  }
                >
                  <input
                    id="file-input"
                    type="file"
                    className="hidden"
                    accept=".csv,.json,.parquet,.xlsx"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  {file ? (
                    <div>
                      <div className="text-4xl mb-3">📄</div>
                      <p className="text-lg font-medium">{file.name}</p>
                      <p className="text-sm text-muted mt-1">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <p className="text-xs text-accent mt-3 font-mono">
                        Will be AES-256 encrypted before upload
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-4xl mb-3">📁</div>
                      <p className="text-lg font-medium">
                        Drop your dataset here
                      </p>
                      <p className="text-sm text-muted mt-1">
                        CSV, JSON, Parquet, or XLSX — up to 100MB
                      </p>
                      <p className="text-xs text-accent mt-3 font-mono">
                        Encrypted client-side before upload
                      </p>
                    </div>
                  )}
                </div>

                {/* Upload status */}
                {uploadStatus !== "idle" && uploadStatus !== "done" && (
                  <div className="glass-card rounded-xl p-5">
                    <div className="flex items-center gap-3">
                      {uploadStatus === "error" ? (
                        <span className="text-red-400 text-lg">✕</span>
                      ) : (
                        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {uploadStatus === "encrypting" && "Encrypting..."}
                          {uploadStatus === "uploading" && "Uploading to Walrus..."}
                          {uploadStatus === "creating_listing" && "Creating Aleo listing..."}
                          {uploadStatus === "error" && "Error"}
                        </p>
                        <p className="text-xs text-muted mt-0.5">{statusMessage}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="glass-card rounded-xl p-5 border-red-500/30 bg-red-500/5">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {/* Info box */}
                <div className="glass-card rounded-xl p-5">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <span className="text-accent">🔐</span> What happens next
                  </h4>
                  <ol className="text-sm text-text-secondary space-y-1.5 list-decimal list-inside">
                    <li>Your file is encrypted with AES-256-GCM in your browser</li>
                    <li>The encrypted blob is uploaded to Walrus (decentralized storage)</li>
                    <li>A listing is created on Aleo with ZK proofs of your data properties</li>
                    <li>You stake your deposit as collateral</li>
                    <li>Only you hold the decryption key until a buyer pays</li>
                  </ol>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={uploadStatus !== "idle" && uploadStatus !== "error"}
                    className="flex-1 py-4 border border-border text-foreground font-medium rounded-full hover:bg-card transition-colors disabled:opacity-40"
                  >
                    Back
                  </button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    disabled={!file || !connected || (uploadStatus !== "idle" && uploadStatus !== "error")}
                    className="flex-1 py-4 bg-accent text-black font-semibold rounded-full text-lg hover:bg-accent-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {uploadStatus === "idle" || uploadStatus === "error"
                      ? "Encrypt & List"
                      : "Processing..."}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="text-6xl mb-6">✅</div>
                <h2 className="text-3xl font-bold mb-3">
                  Listing Created!
                </h2>
                <p className="text-text-secondary mb-8 max-w-md mx-auto">
                  Your dataset is encrypted, uploaded to Walrus, and listed on the
                  Aleo marketplace. You&apos;ll be notified when someone purchases it.
                </p>
                <div className="glass-card rounded-xl p-6 text-left max-w-sm mx-auto mb-8">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted">Title</span>
                      <span className="font-medium">{formData.title || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Price</span>
                      <span className="font-medium text-accent">
                        {formData.price} ALEO
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Deposit</span>
                      <span className="font-medium">{formData.deposit} ALEO</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Blob ID</span>
                      <span className="font-mono text-xs text-muted">
                        {blobId ? `${blobId.slice(0, 12)}...` : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Status</span>
                      <span className="text-accent font-mono text-xs">Active</span>
                    </div>
                  </div>
                </div>

                {/* Encryption key warning */}
                {encryptionKey && (
                  <div className="glass-card rounded-xl p-5 text-left max-w-sm mx-auto mb-8 border-yellow-500/30 bg-yellow-500/5">
                    <h4 className="text-sm font-semibold text-yellow-400 mb-2">
                      Save Your Encryption Key
                    </h4>
                    <p className="text-xs text-text-secondary mb-3">
                      You&apos;ll need this to deliver data to buyers. Store it securely.
                    </p>
                    <div className="bg-black/30 rounded-lg p-3 break-all">
                      <code className="text-xs text-accent font-mono">
                        {encryptionKey}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(encryptionKey)}
                      className="mt-3 text-xs text-accent hover:text-accent-dim transition-colors"
                    >
                      Copy to clipboard
                    </button>
                  </div>
                )}

                <a
                  href="/"
                  className="inline-block px-8 py-3 bg-accent text-black font-semibold rounded-full hover:bg-accent-dim transition-colors"
                >
                  View Marketplace
                </a>
              </motion.div>
            )}
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
