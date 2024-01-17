const { network } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log, get } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    const pricePerHour = networkConfig[chainId]["pricePerHour"]
    const minScheduleHour = networkConfig[chainId]["minScheduleHour"]
    const maxScheduleHour = networkConfig[chainId]["maxScheduleHour"]
    const maxNumberOfMasters = networkConfig[chainId]["maxNumberOfMasters"]

    let ethUsdPriceFeedAddress
    if (developmentChains.includes(network.name)) {
        const ethUsdAggregator = await get("MockV3Aggregator")
        ethUsdPriceFeedAddress = ethUsdAggregator.address
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
    }

    const args = [
        ethUsdPriceFeedAddress,
        pricePerHour,
        minScheduleHour,
        maxScheduleHour,
        maxNumberOfMasters,
    ]
    const studio = await deploy("Studio", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        await verify(studio.address, args)
    }

    log("-------------------------------")
}

module.exports.tags = ["all", "studio"]
