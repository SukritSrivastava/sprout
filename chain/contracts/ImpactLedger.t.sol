// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ImpactLedger} from "./ImpactLedger.sol";

// The few test helpers ("cheatcodes") Hardhat's test runner provides at this fixed address.
interface Vm {
    function prank(address sender) external;
    function expectRevert(bytes calldata revertData) external;
    function warp(uint256 newTimestamp) external;
}

/// Tests for ImpactLedger. Run with `npm run test -w chain` (or `npx hardhat test` in chain/).
/// Every function starting with `test` is one test; it fails if it reverts unexpectedly.
contract ImpactLedgerTest {
    Vm constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);
    ImpactLedger ledger;
    bytes32 constant ROOT = keccak256("sample batch");

    function setUp() public {
        ledger = new ImpactLedger(); // this test contract is the publisher
    }

    function testPublisherIsTheDeployer() public view {
        require(ledger.publisher() == address(this), "deployer should be the publisher");
    }

    function testPublishStoresTheBatch() public {
        vm.warp(1_800_000_000);
        ledger.publishBatch(1, ROOT, 3000, 550, 600, 6);
        (bytes32 root, uint64 at, uint128 donated, uint128 rewarded, uint128 paidOut, uint32 receipts) =
            ledger.batches(1);
        require(root == ROOT, "root");
        require(at == 1_800_000_000, "time");
        require(donated == 3000 && rewarded == 550 && paidOut == 600, "totals");
        require(receipts == 6, "receipts");
    }

    function testStrangersCannotPublish() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert(abi.encodeWithSelector(ImpactLedger.NotPublisher.selector));
        ledger.publishBatch(1, ROOT, 1, 1, 1, 1);
    }

    function testABatchCanNeverBeChanged() public {
        ledger.publishBatch(7, ROOT, 1, 1, 1, 1);
        vm.expectRevert(abi.encodeWithSelector(ImpactLedger.AlreadyPublished.selector, uint64(7)));
        ledger.publishBatch(7, keccak256("edited"), 999, 1, 1, 1);
    }

    function testEmptyRootIsRejected() public {
        vm.expectRevert(abi.encodeWithSelector(ImpactLedger.EmptyRoot.selector));
        ledger.publishBatch(1, bytes32(0), 1, 1, 1, 1);
    }

    function testUnpublishedBatchesAreEmpty() public view {
        (bytes32 root,,,,,) = ledger.batches(42);
        require(root == bytes32(0), "should be empty");
    }
}
