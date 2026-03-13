/**
 * Aleo contract interaction helpers.
 * Builds TransactionOptions for the veildatamarket.aleo program,
 * compatible with the Provable Shield wallet adapter.
 */

import { TransactionOptions } from "@provablehq/aleo-types";

const PROGRAM_ID = process.env.NEXT_PUBLIC_ALEO_PROGRAM_ID || "veildatamarket.aleo";
const FEE = 500_000; // 0.5 ALEO in microcredits

/**
 * Hash a string to a field element using a simple approach.
 */
export function stringToField(str: string): string {
  let hash = BigInt(0);
  for (let i = 0; i < str.length; i++) {
    hash = (hash * BigInt(31) + BigInt(str.charCodeAt(i))) % BigInt("8444461749428370424248824938781546531375899335154063827935233455917409239041");
  }
  return hash.toString() + "field";
}

/**
 * Build a create_listing transaction.
 */
export function buildCreateListingTx(
  params: {
    listingId: string;
    blobHash: string;
    price: number;
    metadataHash: string;
    encryptionKeyHash: string;
    depositAmount: number;
    category: string;
    rowCount: number;
    schemaHash: string;
  }
): TransactionOptions {
  return {
    program: PROGRAM_ID,
    function: "create_listing",
    inputs: [
      params.listingId,
      params.blobHash,
      params.price.toString() + "u64",
      params.metadataHash,
      params.encryptionKeyHash,
      params.depositAmount.toString() + "u64",
      params.category,
      params.rowCount.toString() + "u64",
      params.schemaHash,
    ],
    fee: FEE,
  };
}

/**
 * Build a purchase transaction.
 */
export function buildPurchaseTx(
  params: {
    listingId: string;
    seller: string;
    amount: number;
    blobHash: string;
  }
): TransactionOptions {
  return {
    program: PROGRAM_ID,
    function: "purchase",
    inputs: [
      params.listingId,
      params.seller,
      params.amount.toString() + "u64",
      params.blobHash,
    ],
    fee: FEE,
  };
}

/**
 * Build a deliver transaction (seller sends decryption key to buyer).
 */
export function buildDeliverTx(
  params: {
    sellerNote: string;
    blobId1: string;
    blobId2: string;
    decryptionKey1: string;
    decryptionKey2: string;
  }
): TransactionOptions {
  return {
    program: PROGRAM_ID,
    function: "deliver",
    inputs: [
      params.sellerNote,
      params.blobId1,
      params.blobId2,
      params.decryptionKey1,
      params.decryptionKey2,
    ],
    fee: FEE,
  };
}

/**
 * Build a confirm_receipt transaction (buyer releases payment).
 */
export function buildConfirmReceiptTx(
  escrowRecord: string
): TransactionOptions {
  return {
    program: PROGRAM_ID,
    function: "confirm_receipt",
    inputs: [escrowRecord],
    fee: FEE,
  };
}

/**
 * Build a dispute transaction.
 */
export function buildDisputeTx(
  escrowRecord: string
): TransactionOptions {
  return {
    program: PROGRAM_ID,
    function: "dispute",
    inputs: [escrowRecord],
    fee: FEE,
  };
}
