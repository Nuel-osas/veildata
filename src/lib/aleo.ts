/**
 * Aleo contract interaction helpers.
 * Builds TransactionOptions for the veildatamarketv7.aleo program,
 * compatible with the Provable Shield wallet adapter.
 */

import { TransactionOptions } from "@provablehq/aleo-types";

const PROGRAM_ID = process.env.NEXT_PUBLIC_ALEO_PROGRAM_ID || "veildatamarketv8.aleo";
const FEE = 500_000; // 0.5 ALEO in microcredits
// Program address for veildatamarketv7.aleo (escrow destination)
const PROGRAM_ADDRESS = "aleo17kc2tkll7plruvg4kvd9p93udknx977dldrw7me02znh5naf0u8sf5zd88";
// Pool address (receives platform listing fees)
const POOL_ADDRESS = "aleo12m9nrm9fqvvfj6sm7mqw5quwklqldfedu8kv43rnp33v09aqlvgq5hck26";
// Platform fee: 0.2 ALEO = 200_000 microcredits
const PLATFORM_FEE = 200_000;
// USDCx has 6 decimals
const USDCX_DECIMALS = 1_000_000;

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
 * Pays 1 ALEO platform fee (credits record auto-resolved by wallet).
 */
export function buildCreateListingTx(
  params: {
    listingId: string;
    blobHash: string;
    price: number;
    metadataHash: string;
    encryptionKeyHash: string;
    category: string;
    rowCount: number;
    schemaHash: string;
  }
): TransactionOptions {
  // v6: No credits record needed. All 8 params are plain inputs.
  // Platform fee (0.2 ALEO) is paid separately via credits.aleo/transfer_public.
  return {
    program: PROGRAM_ID,
    function: "create_listing",
    inputs: [
      params.listingId,
      params.blobHash,
      (params.price * USDCX_DECIMALS).toString() + "u128",
      params.metadataHash,
      params.encryptionKeyHash,
      params.category,
      params.rowCount.toString() + "u64",
      params.schemaHash,
    ],
    fee: FEE,
    privateFee: false,
  };
}

/**
 * Build a platform fee payment transaction (0.2 ALEO to pool).
 * Called before create_listing — public transfer, no private records needed.
 */
export function buildPlatformFeeTx(): TransactionOptions {
  return {
    program: "credits.aleo",
    function: "transfer_public",
    inputs: [
      POOL_ADDRESS,
      PLATFORM_FEE.toString() + "u64",
    ],
    fee: FEE,
    privateFee: false,
  };
}

/**
 * Build a purchase transaction via the contract.
 * Calls veildatamarketv8.aleo/purchase which sends USDCx directly to the seller
 * via transfer_public_as_signer, with ZK privacy for the buyer.
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
      (params.amount * USDCX_DECIMALS).toString() + "u128",
      params.blobHash,
    ],
    fee: FEE,
    privateFee: false,
  };
}

/**
 * Build a deliver transaction (seller sends decryption key to buyer).
 * The SellerNote record is auto-resolved by the wallet.
 */
export function buildDeliverTx(
  params: {
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
      params.blobId1,
      params.blobId2,
      params.decryptionKey1,
      params.decryptionKey2,
    ],
    fee: FEE,
    privateFee: false,
  };
}

/**
 * Build a confirm_receipt transaction (buyer releases USDCx to seller).
 * The BuyerEscrow record is auto-resolved by the wallet.
 */
export function buildConfirmReceiptTx(): TransactionOptions {
  return {
    program: PROGRAM_ID,
    function: "confirm_receipt",
    inputs: [],
    fee: FEE,
    privateFee: false,
  };
}

/**
 * Build a dispute transaction.
 * The BuyerEscrow record is auto-resolved by the wallet.
 */
export function buildDisputeTx(): TransactionOptions {
  return {
    program: PROGRAM_ID,
    function: "dispute",
    inputs: [],
    fee: FEE,
    privateFee: false,
  };
}

/**
 * Build a claim_timeout_refund transaction (buyer reclaims after deadline).
 * The BuyerEscrow record is auto-resolved by the wallet.
 */
export function buildClaimTimeoutRefundTx(): TransactionOptions {
  return {
    program: PROGRAM_ID,
    function: "claim_timeout_refund",
    inputs: [],
    fee: FEE,
    privateFee: false,
  };
}

/**
 * Build a vault storage purchase transaction.
 * Sends USDCx to the program address (1 USDCx = 100MB).
 */
export function buildBuyVaultStorageTx(quantity: number = 1): TransactionOptions {
  const onChainAmount = quantity * USDCX_DECIMALS;
  return {
    program: "test_usdcx_stablecoin.aleo",
    function: "transfer_public",
    inputs: [
      PROGRAM_ADDRESS,
      onChainAmount.toString() + "u128",
    ],
    fee: FEE,
    privateFee: false,
  };
}

/**
 * Build a claim_test_usdcx transaction (reviewer claims 3 USDCx faucet).
 * One-time per wallet.
 */
export function buildClaimTestUsdcxTx(): TransactionOptions {
  return {
    program: PROGRAM_ID,
    function: "claim_test_usdcx",
    inputs: [],
    fee: FEE,
    privateFee: false,
  };
}

/**
 * Convert public ALEO to a private credits record.
 * Needed for create_listing which requires a credits record for the platform fee.
 */
export function buildConvertToPrivateTx(
  recipient: string,
  amountMicrocredits: number
): TransactionOptions {
  return {
    program: "credits.aleo",
    function: "transfer_public_to_private",
    inputs: [
      recipient,
      amountMicrocredits.toString() + "u64",
    ],
    fee: FEE,
    privateFee: false,
  };
}
