import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-chai-matchers"
import "hardhat-gas-reporter"
import "hardhat-contract-sizer"
import "dotenv"
import "solidity-coverage"
import "@nomicfoundation/hardhat-ethers"
import "hardhat-deploy"
import "hardhat-deploy-ethers"
import "@nomiclabs/hardhat-etherscan"

/** @type import('hardhat/config').HardhatUserConfig */
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || ""
const SEPOLIA_RPC_URL =
    process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY"
const PRIVATE_KEY =
    process.env.PRIVATE_KEY || "0x11ee3108a03081fe260ecdc106554d09d9d1209bcafd46942b10e02943effc4a"
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || ""
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL || ""

const config: HardhatUserConfig = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            chainId: 31337,
            // forking: { url: MAINNET_RPC_URL },
        },
        sepolia: {
            url: SEPOLIA_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 11155111,
            // blockConfirmations: 6,
        },
    },
    solidity: {
        compilers: [
            {
                version: "0.8.20",
            },
        ],
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
        // customChains: [], // uncomment this line if you are getting a TypeError: customChains is not iterable
    },
    gasReporter: {
        enabled: true,
        currency: "USD",
        outputFile: "gas-report.txt",
        noColors: true,
        coinmarketcap: COINMARKETCAP_API_KEY,
    },
    namedAccounts: {
        deployer: {
            default: 0, // here this will by default take the first account as deployer
            1: 0, // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
        },
    },
    mocha: {
        timeout: 500000, // 500 seconds
    },
}

export default config