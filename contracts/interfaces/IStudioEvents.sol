// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Studio Booking Smart Contract.
 * @author Daniil Ankushin.
 * @notice This smart contract allows users to book time slots in the owner's studio.
 * @dev This contract can be adapted for other types of bookings.
 * @custom:developement This contract is in the development stage.
 */
interface IStudioEvents {
    /**
     *
     * @param master The address of the master who sent the transaction.
     * @param fromTimestamp The start time of the planned session in seconds (UTC).
     * @param toTimestamp The end time of the planned session in seconds (UTC).
     */
    event TimeSlotBooked(
        address indexed master,
        uint256 indexed fromTimestamp,
        uint256 indexed toTimestamp
    );
}
