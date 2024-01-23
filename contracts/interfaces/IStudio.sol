// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IStudioEvents.sol";
import "./IStudioOwnerActions.sol";

interface IStudio is IStudioEvents, IStudioOwnerActions {
    function bookTimeGap(uint256 fromTimestamp, uint256 toTimestamp) external payable;

    function getOwner() external returns (address);

    function getPriceFeedAddress() external returns (address);

    function getPricePerHour() external returns (uint256);

    function getMinScheduleHour() external returns (uint256);

    function getMaxScheduleHour() external returns (uint256);

    function getMaxNumberOfMasters() external returns (uint256);
}
