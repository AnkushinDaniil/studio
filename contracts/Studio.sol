// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IStudio.sol";
import "./libraries/CurrencyCalculation.sol";
import "./libraries/TimeCalculation.sol";

error Studio__NotOwner();
error Studio__InsufficientFunding();
error Studio__InvalidTimestamps();
error Studio__TooManyMasters();
error Studio__CallFailed();

/**
 * @title Studio Booking Smart Contract.
 * @author Daniil Ankushin.
 * @notice This smart contract allows users to book time slots in the owner's studio.
 * @dev This contract can be adapted for other types of bookings.
 * @custom:developement This contract is in the development stage.
 */
contract Studio is IStudio {
    using CurrencyCalculation for uint256;
    /**
     * @notice Pionts is the point location of the session: start or end.
     */
    enum Pionts {
        start,
        finish
    }

    /**
     * @notice TimestampWithMaster is a struct that merges a specific timestamp
     * @notice with its master and relates it to a session.
     */
    struct TimestampWithMaster {
        uint256 timestamp;
        address master;
        Pionts point;
    }

    /**
     * @notice The 's_dateToTimestampsWithMaster' map converts the abstract data
     * @notice type 'date' to 'TimestampWithMaster'. The 'date' format is
     * @notice a concatenation of the day, month, and year in the format DDMMYYYY.
     */
    mapping(uint256 => TimestampWithMaster[]) private s_dateToTimestampsWithMaster;

    address private immutable OWNER;
    AggregatorV3Interface private s_priceFeed;
    uint256 private s_pricePerHour;
    uint256 private s_pricePerSecond;
    uint256 private s_minScheduleHour;
    uint256 private s_maxScheduleHour;
    uint256 private s_maxNumberOfMasters;

    modifier onlyOwner() {
        if (msg.sender != OWNER) {
            revert Studio__NotOwner();
        }
        _;
    }

    constructor(
        address priceFeed,
        uint256 pricePerHour,
        uint256 minScheduleHour,
        uint256 maxScheduleHour,
        uint256 maxNumberOfMasters
    ) {
        if (minScheduleHour > maxScheduleHour) {
            revert Studio__InvalidTimestamps();
        }
        s_priceFeed = AggregatorV3Interface(priceFeed);
        OWNER = msg.sender;
        s_pricePerHour = pricePerHour;
        s_pricePerSecond = (pricePerHour * 1e18) / DateTime.SECONDS_PER_HOUR;
        s_minScheduleHour = minScheduleHour;
        s_maxScheduleHour = maxScheduleHour;
        s_maxNumberOfMasters = maxNumberOfMasters;
    }

    /**
     * @notice The bookTimeGap function enables users to reserve a time slot at the studio.
     * @param fromTimestamp The start time of the planned session in seconds (UTC).
     * @param toTimestamp The end time of the planned session in seconds (UTC).
     */
    function bookTimeGap(uint256 fromTimestamp, uint256 toTimestamp) external payable {
        if (
            !TimeCalculation.isValidTimestamps(
                fromTimestamp,
                toTimestamp,
                s_minScheduleHour,
                s_maxScheduleHour
            )
        ) {
            revert Studio__InvalidTimestamps();
        }
        uint256 price = (toTimestamp - fromTimestamp).calculatePrice(s_pricePerSecond, s_priceFeed);
        if (msg.value < price) {
            revert Studio__InsufficientFunding();
        }
        (uint256 year, uint256 month, uint256 day) = DateTime.timestampToDate(fromTimestamp);
        uint256 date = TimeCalculation.yearMonthDayToDate(year, month, day);

        TimestampWithMaster[2] memory timeSlot = createTimeSlot(
            fromTimestamp,
            toTimestamp,
            msg.sender
        );

        insertTimeSlot(date, s_dateToTimestampsWithMaster[date], timeSlot, s_maxNumberOfMasters);

        if (msg.value > price) {
            (bool callSuccess, ) = payable(msg.sender).call{value: msg.value - price}("");
            if (!callSuccess) {
                revert Studio__CallFailed();
            }
        }

        emit TimeSlotBooked(msg.sender, fromTimestamp, toTimestamp);
    }

    function getScheduleFromDate(
        uint256 year,
        uint256 month,
        uint256 day
    ) external view returns (TimestampWithMaster[] memory) {
        return s_dateToTimestampsWithMaster[TimeCalculation.yearMonthDayToDate(year, month, day)];
    }

    /**
     * @notice The insertTimeSlot function is a particular case of the 'merge sorted arrays' algorithm.
     * @param date The 'date' format is a concatenation of the day, month, and year in the format DDMMYYYY.
     * @param daySchedule is an array of TimestampWithMaster for the requested date.
     * @param timeSlot is an array of TimestampWithMaster objects for the planned session.
     * @param timeSlot The array always contains 2 objects.
     * @param maxNumberOfMasters represents the maximum number of masters allowed in the studio at any given time.
     */
    function insertTimeSlot(
        uint256 date,
        TimestampWithMaster[] memory daySchedule,
        TimestampWithMaster[2] memory timeSlot,
        uint256 maxNumberOfMasters
    ) internal {
        s_dateToTimestampsWithMaster[date].push();
        s_dateToTimestampsWithMaster[date].push();

        uint256 mastersCounter;
        uint256 n = 2;
        uint256 m = daySchedule.length;

        while (n > 0 && m > 0) {
            if (daySchedule[m + n - 1].point == Pionts.finish) {
                mastersCounter++;
                if (mastersCounter > maxNumberOfMasters) {
                    revert Studio__TooManyMasters();
                }
            } else {
                mastersCounter--;
            }
            if (daySchedule[m - 1].timestamp < timeSlot[n - 1].timestamp) {
                s_dateToTimestampsWithMaster[date][m + n - 1] = timeSlot[n - 1];
                n--;
            } else {
                s_dateToTimestampsWithMaster[date][m + n - 1] = daySchedule[m - 1];
                m--;
            }
        }

        for (uint256 i = 0; i < n; i++) {
            s_dateToTimestampsWithMaster[date][i] = timeSlot[i];
        }
    }

    /**
     * @notice The createTimeSlot function generates TimestampWithMaster[2]
     * @notice to be included in s_dateToTimestampsWithMaster.
     * @param fromTimestamp The start time of the planned session in seconds (UTC).
     * @param toTimestamp The end time of the planned session in seconds (UTC).
     * @param master The address of the master who sent the transaction.
     */
    function createTimeSlot(
        uint256 fromTimestamp,
        uint256 toTimestamp,
        address master
    ) internal pure returns (TimestampWithMaster[2] memory) {
        return [
            TimestampWithMaster({master: master, timestamp: fromTimestamp, point: Pionts.start}),
            TimestampWithMaster({master: master, timestamp: toTimestamp, point: Pionts.finish})
        ];
    }

    function getOwner() public view returns (address) {
        return OWNER;
    }

    function getPriceFeedAddress() public view returns (address) {
        return address(s_priceFeed);
    }

    function getPricePerHour() public view returns (uint256) {
        return s_pricePerHour;
    }

    function getMinScheduleHour() public view returns (uint256) {
        return s_minScheduleHour;
    }

    function getMaxScheduleHour() public view returns (uint256) {
        return s_maxScheduleHour;
    }

    function getMaxNumberOfMasters() public view returns (uint256) {
        return s_maxNumberOfMasters;
    }

    function setPriceFeedAddress(address priceFeed) public onlyOwner {
        s_priceFeed = AggregatorV3Interface(priceFeed);
    }

    function setPricePerHour(uint256 pricePerHour) public onlyOwner {
        s_pricePerHour = pricePerHour;
        s_pricePerSecond = (pricePerHour * 1e18) / DateTime.SECONDS_PER_HOUR;
    }

    function setMinScheduleHour(uint256 minScheduleHour) public onlyOwner {
        s_minScheduleHour = minScheduleHour;
    }

    function setMaxScheduleHour(uint256 maxScheduleHour) public onlyOwner {
        s_maxScheduleHour = maxScheduleHour;
    }

    function setMaxNumberOfMasters(uint256 maxNumberOfMasters) public onlyOwner {
        s_maxNumberOfMasters = maxNumberOfMasters;
    }
}
