// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

library CurrencyCalculation {
    /**
     * @notice The getPrice function returns the exchange rate between Ethereum and US dollars.
     * @param priceFeed releases AggregatorV3Interface with the address of the price feed smart contract.
     */
    function getPrice(AggregatorV3Interface priceFeed) internal view returns (uint256) {
        (, int256 answer, , , ) = priceFeed.latestRoundData();
        return uint256(answer * 1e10); // 1* 10 ** 10 == 10_000_000_000
    }

    /**
     * @notice The usdToWei function converts USD to ETH.
     * @param usdAmount USD amount to be converted into ETH.
     * @param usdInEth ETH/USD exchange rate.
     */
    function usdToWei(uint256 usdAmount, uint256 usdInEth) internal pure returns (uint256) {
        uint256 ethAmountInUsd = usdAmount / (usdInEth / 1e18);
        return ethAmountInUsd;
    }

    /**
     * @notice The calculatePrice function determines the necessary amount of wei to book the requested time slot.
     * @param diffSeconds Session length in seconds.
     */
    function calculatePrice(
        uint256 diffSeconds,
        uint256 pricePerSecond,
        AggregatorV3Interface priceFeed
    ) internal view returns (uint256) {
        uint256 priceUsd = pricePerSecond * diffSeconds;
        uint256 usdInEth = getPrice(priceFeed);
        uint256 priceWei = usdToWei(priceUsd, usdInEth);
        return priceWei;
    }
}
