const networkConfig = {
    31337: {
        name: "hardhat",
        usdEthPriceFeed: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
        pricePerHour: "5",
        minScheduleHour: "8",
        maxScheduleHour: "22",
        maxNumberOfMasters: "3",
    },
    11155111: {
        name: "sepolia",
        usdEthPriceFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
        pricePerHour: "5",
        minScheduleHour: "8",
        maxScheduleHour: "22",
        maxNumberOfMasters: "3",
    },
}

const developmentChains = ["hardhat", "localhost"]
const DECIMALS = 8
const INITIAL_ANSWER = 200000000000

module.exports = {
    networkConfig,
    developmentChains,
    DECIMALS,
    INITIAL_ANSWER,
}
