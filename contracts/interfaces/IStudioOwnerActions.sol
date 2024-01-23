// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IStudioOwnerActions {
    function setPriceFeedAddress(address priceFeed) external;

    function setPricePerHour(uint256 pricePerHour) external;

    function setMinScheduleHour(uint256 minScheduleHour) external;

    function setMaxScheduleHour(uint256 maxScheduleHour) external;

    function setMaxNumberOfMasters(uint256 maxNumberOfMasters) external;
}
