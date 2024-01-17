// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@quant-finance/solidity-datetime/contracts/DateTime.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./PriceConverter.sol";

error Studio__NotOwner();
error Studio__InsufficientFunding();
error Studio__InvalidTime();
error Studio__InvalidTimestamps();
error Studio__TooManyMasters();

contract Studio {
    using PriceConverter for uint256;

    struct Hour {
        address[] _addresses;
    }
    struct Day {
        Hour[] _hours;
    }
    struct Month {
        Day[] _days;
    }
    struct Year {
        Month[] _months;
    }
    mapping(uint256 => Year) private _years;

    mapping(address => uint256[2][]) private s_addressToTimestamps;
    mapping(uint256 => address[]) private s_hourToAddresses;

    address private immutable i_owner;
    AggregatorV3Interface private s_priceFeed;
    uint256 private s_pricePerHour;
    uint256 private s_minScheduleHour;
    uint256 private s_maxScheduleHour;
    uint256 private s_maxNumberOfMasters;

    modifier onlyOwner() {
        if (msg.sender != i_owner) {
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
            revert Studio__InvalidTime();
        }
        s_priceFeed = AggregatorV3Interface(priceFeed);
        i_owner = msg.sender;
        s_pricePerHour = pricePerHour;
        s_minScheduleHour = minScheduleHour;
        s_maxScheduleHour = maxScheduleHour;
        s_maxNumberOfMasters = maxNumberOfMasters;
    }

    function bookTimeGap(uint256 fromTimestamp, uint256 toTimestamp) public payable {
        if (!isValidTimestamps(fromTimestamp, toTimestamp)) {
            revert Studio__InvalidTimestamps();
        }
        (uint256 year, uint256 month, uint256 day) = DateTime.timestampToDate(fromTimestamp);
        uint256 fromHour = DateTime.getHour(fromTimestamp);
        uint256 toHour = DateTime.getHour(toTimestamp);
        if (!isValidHours(fromHour, toHour)) {
            revert Studio__InvalidTime();
        }
        uint256 diffHours = DateTime.diffHours(fromTimestamp, toTimestamp);
        uint256 price = calculatePrice(diffHours);
        if (msg.value.getConversionRate(s_priceFeed) < price) {
            revert Studio__InsufficientFunding();
        }
        for (uint h = fromHour; h < toHour; h++) {
            if (getScheduleFromDateAndHour(year, month, day, h).length > s_maxNumberOfMasters) {
                revert Studio__TooManyMasters();
            } else {
                _years[year]._months[month]._days[day]._hours[h]._addresses.push(msg.sender);
                s_addressToTimestamps[msg.sender].push(
                    [
                        (fromTimestamp / DateTime.SECONDS_PER_HOUR) * DateTime.SECONDS_PER_HOUR,
                        (toTimestamp / DateTime.SECONDS_PER_HOUR) * DateTime.SECONDS_PER_HOUR
                    ]
                );
            }
        }
    }

    function calculatePrice(uint256 diffHours) public view returns (uint256) {
        return s_pricePerHour * diffHours;
    }

    function isValidHours(uint256 fromHour, uint256 toHour) public view returns (bool) {
        return fromHour < toHour && fromHour >= s_minScheduleHour && toHour <= s_maxScheduleHour;
    }

    function isValidTimestamps(
        uint256 fromTimestamp,
        uint256 toTimestamp
    ) public view returns (bool) {
        return
            fromTimestamp > block.timestamp &&
            fromTimestamp < toTimestamp &&
            DateTime.diffHours(fromTimestamp, toTimestamp) < 24;
    }

    function getScheduleFromYear(uint256 year) public view returns (Month[] memory) {
        return _years[year]._months;
    }

    function getScheduleFromYearAndMonth(
        uint256 year,
        uint256 month
    ) public view returns (Day[] memory) {
        return getScheduleFromYear(year)[month]._days;
    }

    function getScheduleFromDate(
        uint256 year,
        uint256 month,
        uint256 day
    ) public view returns (Hour[] memory) {
        return getScheduleFromYearAndMonth(year, month)[day]._hours;
    }

    function getScheduleFromDateAndHour(
        uint256 year,
        uint256 month,
        uint256 day,
        uint256 hour
    ) public view returns (address[] memory) {
        return getScheduleFromDate(year, month, day)[hour]._addresses;
    }

    // function getScheduleFromTimestampGap(
    //     uint256 fromTimestamp,
    //     uint256 toTimestamp
    // ) public view returns (Year[] memory) {
    //     (uint256 fromYear, uint256 fromMonth, uint256 fromDay) = DateTime.timestampToDate(
    //         fromTimestamp
    //     );
    //     (uint256 toYear, uint256 toMonth, uint256 toDay) = DateTime.timestampToDate(fromTimestamp);
    //     uint256 fromHour = DateTime.getHour(fromTimestamp);
    //     uint256 toHour = DateTime.getHour(toTimestamp);
    //     // mapping(uint256 => Year) memory res;
    //     Year[toYear - fromYear] memory res;
    //     for (uint256 year = fromYear; year <= toYear; year++) {
    //         uint256 leftMonth;
    //         uint256 rightMonth;
    //         if (year == fromYear) {
    //             leftMonth = fromMonth;
    //             rightMonth = getScheduleFromYear(year).length;
    //         } else if (year == toYear) {
    //             leftMonth = 0;
    //             rightMonth = toMonth;
    //         } else {
    //             res.push(Year(getScheduleFromYear(year)));
    //         }
    //     }
    // }

    // mapping(address => uint256[2][]) private s_addressToTimestamps;
    // function getLastNTimestampsFromAddress(address master, uint256 n) public view returns (uint256[2][] memory) {
    //     uint256 length = s_addressToTimestamps[master].length;
    //     uint256[2][n] memory res;
    // }
    // mapping(uint256 => address[]) private s_hourToAddresses;

    function getOwner() public view returns (address) {
        return i_owner;
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
