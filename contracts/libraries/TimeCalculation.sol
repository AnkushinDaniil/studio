// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;
import "@quant-finance/solidity-datetime/contracts/DateTime.sol";

library TimeCalculation {
    /**
     * @notice The isValidHours function checks the validity of a time slot in relation to a schedule.
     * @param fromHour The studio's opening hour has been approved by the owner.
     * @param toHour The studio's closing hour has been approved by the owner.
     */
    function isValidHours(
        uint256 fromHour,
        uint256 toHour,
        uint256 minScheduleHour,
        uint256 maxScheduleHour
    ) internal pure returns (bool) {
        return fromHour < toHour && fromHour >= minScheduleHour && toHour <= maxScheduleHour;
    }

    function isValidTimestamps(
        uint256 fromTimestamp,
        uint256 toTimestamp,
        uint256 minScheduleHour,
        uint256 maxScheduleHour
    ) internal view returns (bool) {
        return
            isValidHours(
                DateTime.getHour(fromTimestamp),
                DateTime.getHour(toTimestamp),
                minScheduleHour,
                maxScheduleHour
            ) &&
            fromTimestamp > block.timestamp &&
            fromTimestamp < toTimestamp &&
            DateTime.diffHours(fromTimestamp, toTimestamp) < 24;
    }

    function yearMonthDayToDate(
        uint256 year,
        uint256 month,
        uint256 day
    ) internal pure returns (uint256) {
        return day + month * 1e2 + year * 1e4;
    }
}
