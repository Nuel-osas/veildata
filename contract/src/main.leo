import credits.aleo;

program veildatamarketv2.aleo {

    @noupgrade
    async constructor() {}

    // ============================
    // Data Types
    // ============================

    struct ListingMeta {
        category: field,
        row_count: u64,
        schema_hash: field,
        price: u64,
        seller: address,
    }

    record Listing {
        owner: address,
        listing_id: field,
        blob_hash: field,
        price: u64,
        metadata_hash: field,
        encryption_key_hash: field,
    }

    record BuyerEscrow {
        owner: address,
        listing_id: field,
        buyer: address,
        seller: address,
        amount: u64,
        blob_hash: field,
    }

    record SellerNote {
        owner: address,
        listing_id: field,
        buyer: address,
        amount: u64,
        blob_hash: field,
    }

    record AccessGrant {
        owner: address,
        listing_id: field,
        blob_id_1: field,
        blob_id_2: field,
        decryption_key_1: field,
        decryption_key_2: field,
        seller: address,
    }

    // ============================
    // Public State
    // ============================

    mapping listings: field => ListingMeta;
    mapping listing_status: field => u8;
    mapping seller_sales: field => u64;
    mapping total_listings: u8 => u64;
    mapping escrow_balances: field => u64;
    mapping escrow_deadlines: field => u32; // block height deadline for seller to deliver

    // Delivery window: ~7200 blocks ≈ 24 hours at ~12s/block
    const DELIVERY_WINDOW: u32 = 7200u32;

    // ============================
    // Transitions
    // ============================

    // Seller creates listing + deposits collateral (private credits -> program's public balance)
    async transition create_listing(
        listing_id: field,
        blob_hash: field,
        price: u64,
        metadata_hash: field,
        encryption_key_hash: field,
        deposit_payment: credits.aleo/credits,
        deposit_amount: u64,
        category: field,
        row_count: u64,
        schema_hash: field,
    ) -> (Listing, credits.aleo/credits, Future) {
        assert(price > 0u64);
        assert(deposit_amount > 0u64);

        // Move deposit from seller's private credits to program's public balance
        let (change, deposit_future): (credits.aleo/credits, Future) =
            credits.aleo/transfer_private_to_public(deposit_payment, self.address, deposit_amount);

        let listing: Listing = Listing {
            owner: self.caller,
            listing_id: listing_id,
            blob_hash: blob_hash,
            price: price,
            metadata_hash: metadata_hash,
            encryption_key_hash: encryption_key_hash,
        };

        let f: Future = finalize_create_listing(
            deposit_future, listing_id, category, row_count,
            schema_hash, price, self.caller, deposit_amount
        );
        return (listing, change, f);
    }

    async function finalize_create_listing(
        deposit_future: Future,
        listing_id: field,
        category: field,
        row_count: u64,
        schema_hash: field,
        price: u64,
        seller: address,
        deposit_amount: u64,
    ) {
        deposit_future.await();

        let exists: bool = listing_status.contains(listing_id);
        assert(!exists);

        listing_status.set(listing_id, 1u8);

        let meta: ListingMeta = ListingMeta {
            category: category,
            row_count: row_count,
            schema_hash: schema_hash,
            price: price,
            seller: seller,
        };
        listings.set(listing_id, meta);
        escrow_balances.set(listing_id, deposit_amount);

        let current_total: u64 = total_listings.get_or_use(0u8, 0u64);
        total_listings.set(0u8, current_total + 1u64);
    }

    // Buyer purchases — private credits go to program's public balance as escrow
    async transition purchase(
        listing_id: field,
        seller: address,
        amount: u64,
        blob_hash: field,
        payment: credits.aleo/credits,
    ) -> (BuyerEscrow, SellerNote, credits.aleo/credits, Future) {
        assert(amount > 0u64);

        // Move buyer's payment to program's public balance
        let (change, payment_future): (credits.aleo/credits, Future) =
            credits.aleo/transfer_private_to_public(payment, self.address, amount);

        let escrow: BuyerEscrow = BuyerEscrow {
            owner: self.caller,
            listing_id: listing_id,
            buyer: self.caller,
            seller: seller,
            amount: amount,
            blob_hash: blob_hash,
        };

        let note: SellerNote = SellerNote {
            owner: seller,
            listing_id: listing_id,
            buyer: self.caller,
            amount: amount,
            blob_hash: blob_hash,
        };

        let f: Future = finalize_purchase(payment_future, listing_id, amount);
        return (escrow, note, change, f);
    }

    async function finalize_purchase(
        payment_future: Future,
        listing_id: field,
        amount: u64,
    ) {
        payment_future.await();

        let status: u8 = listing_status.get(listing_id);
        assert_eq(status, 1u8);
        listing_status.set(listing_id, 2u8);

        // Add payment to escrow balance
        let current: u64 = escrow_balances.get(listing_id);
        escrow_balances.set(listing_id, current + amount);

        // Set delivery deadline: current block + 7200 (~24h)
        let deadline: u32 = block.height + DELIVERY_WINDOW;
        escrow_deadlines.set(listing_id, deadline);
    }

    // Seller delivers decryption key to buyer
    transition deliver(
        note: SellerNote,
        blob_id_1: field,
        blob_id_2: field,
        decryption_key_1: field,
        decryption_key_2: field,
    ) -> AccessGrant {
        return AccessGrant {
            owner: note.buyer,
            listing_id: note.listing_id,
            blob_id_1: blob_id_1,
            blob_id_2: blob_id_2,
            decryption_key_1: decryption_key_1,
            decryption_key_2: decryption_key_2,
            seller: self.caller,
        };
    }

    // Buyer confirms — releases escrowed funds to seller's public balance
    async transition confirm_receipt(
        escrow: BuyerEscrow,
    ) -> Future {
        let seller_hash: field = BHP256::hash_to_field(escrow.seller);

        // Transfer from program's public balance to seller's public balance
        let release_future: Future =
            credits.aleo/transfer_public(escrow.seller, escrow.amount);

        let f: Future = finalize_confirm_receipt(
            release_future, escrow.listing_id, escrow.amount, seller_hash
        );
        return f;
    }

    async function finalize_confirm_receipt(
        release_future: Future,
        listing_id: field,
        amount: u64,
        seller_hash: field,
    ) {
        release_future.await();

        listing_status.set(listing_id, 3u8);

        // Reduce escrow balance
        let escrowed: u64 = escrow_balances.get(listing_id);
        escrow_balances.set(listing_id, escrowed - amount);

        // Increment seller reputation
        let current_sales: u64 = seller_sales.get_or_use(seller_hash, 0u64);
        seller_sales.set(seller_hash, current_sales + 1u64);
    }

    // Buyer disputes — returns payment to buyer's public balance
    async transition dispute(
        escrow: BuyerEscrow,
    ) -> Future {
        // Return buyer's funds from program's public balance
        let refund_future: Future =
            credits.aleo/transfer_public(escrow.buyer, escrow.amount);

        let f: Future = finalize_dispute(refund_future, escrow.listing_id, escrow.amount);
        return f;
    }

    async function finalize_dispute(
        refund_future: Future,
        listing_id: field,
        amount: u64,
    ) {
        refund_future.await();

        listing_status.set(listing_id, 4u8);

        let escrowed: u64 = escrow_balances.get(listing_id);
        escrow_balances.set(listing_id, escrowed - amount);
    }

    // Buyer claims refund after seller misses the delivery deadline
    async transition claim_timeout_refund(
        escrow: BuyerEscrow,
    ) -> Future {
        // Refund buyer from program's public balance
        let refund_future: Future =
            credits.aleo/transfer_public(escrow.buyer, escrow.amount);

        let f: Future = finalize_claim_timeout_refund(
            refund_future, escrow.listing_id, escrow.amount
        );
        return f;
    }

    async function finalize_claim_timeout_refund(
        refund_future: Future,
        listing_id: field,
        amount: u64,
    ) {
        refund_future.await();

        // Must still be in "purchased" status (2 = purchased, not yet delivered/confirmed/disputed)
        let status: u8 = listing_status.get(listing_id);
        assert_eq(status, 2u8);

        // Must be past the deadline
        let deadline: u32 = escrow_deadlines.get(listing_id);
        assert(block.height >= deadline);

        // Mark as timed out (status 5)
        listing_status.set(listing_id, 5u8);

        // Reduce escrow balance
        let escrowed: u64 = escrow_balances.get(listing_id);
        escrow_balances.set(listing_id, escrowed - amount);
    }
}
