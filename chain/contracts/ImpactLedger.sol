// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title sprout.io public impact ledger
/// @notice Stores one sealed code (a Merkle root) and the money totals for each batch of receipts.
/// Anyone can read a batch; only the NGO's publisher address can add one, and a batch can never
/// be changed once it's published. There is no money, no token and no personal data in here:
/// just codes and totals, so the public can check receipts without seeing who any kid is.
contract ImpactLedger {
    struct Batch {
        bytes32 root;        // the batch code made from every receipt's fingerprint
        uint64 publishedAt;  // when it was published (seconds since 1970)
        uint128 donated;     // totals in rupees, for the public impact page
        uint128 rewarded;
        uint128 paidOut;
        uint32 receipts;     // how many receipts are sealed in this batch
    }

    /// The only address allowed to publish (whoever deployed the contract: the NGO's server).
    address public immutable publisher;

    /// Batches by their number.
    mapping(uint64 => Batch) public batches;

    /// A public announcement every time a batch is published; explorers and apps listen for it.
    event BatchPublished(
        uint64 indexed batchId,
        bytes32 root,
        uint128 donated,
        uint128 rewarded,
        uint128 paidOut,
        uint32 receipts
    );

    error NotPublisher();
    error AlreadyPublished(uint64 batchId);
    error EmptyRoot();

    constructor() {
        publisher = msg.sender;
    }

    /// Seal a batch. Fails if someone else tries, if the code is empty, or if the batch number was
    /// already used: published batches are permanent.
    function publishBatch(
        uint64 batchId,
        bytes32 root,
        uint128 donated,
        uint128 rewarded,
        uint128 paidOut,
        uint32 receipts
    ) external {
        if (msg.sender != publisher) revert NotPublisher();
        if (root == bytes32(0)) revert EmptyRoot();
        if (batches[batchId].publishedAt != 0) revert AlreadyPublished(batchId);
        batches[batchId] = Batch(root, uint64(block.timestamp), donated, rewarded, paidOut, receipts);
        emit BatchPublished(batchId, root, donated, rewarded, paidOut, receipts);
    }
}
