const { network, ethers, deployments } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { expect } = require("chai")
// const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Studio unit tests", () => {
          let studio,
              studioAddress,
              deployer,
              chainId,
              ethUsdPriceFeedAddress,
              pricePerHour,
              minScheduleHour,
              maxScheduleHour,
              maxNumberOfMasters,
              mockV3Aggregator,
              priceFeedAddress
          beforeEach(async () => {
              ;[deployer, otherAccount] = await ethers.getSigners()
              await deployments.fixture(["studio", "mocks"])
              studio = await ethers.getContract("Studio")
              studioAddress = await studio.getAddress()
              chainId = network.config.chainId
              ethUsdPriceFeedAddress = networkConfig[chainId]["usdEthPriceFeed"]
              pricePerHour = networkConfig[chainId]["pricePerHour"]
              minScheduleHour = networkConfig[chainId]["minScheduleHour"]
              maxScheduleHour = networkConfig[chainId]["maxScheduleHour"]
              maxNumberOfMasters = networkConfig[chainId]["maxNumberOfMasters"]

              mockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer)
          })
          describe("constructor", () => {
              it("Should set the right price feed", async () => {
                  expect(await studio.getPriceFeedAddress()).to.equal(
                      await mockV3Aggregator.getAddress()
                  )
              })
              it("Should set the right owner", async () => {
                  expect(await studio.getOwner()).to.equal(deployer.address)
              })
              it("Should set the right price per hour", async () => {
                  expect(await studio.getPricePerHour()).to.equal(pricePerHour)
              })
              it("Should set the right min schedule hour", async () => {
                  expect(await studio.getMinScheduleHour()).to.equal(minScheduleHour)
              })
              it("Should set the right max schedule hour", async () => {
                  expect(await studio.getMaxScheduleHour()).to.equal(maxScheduleHour)
              })
              it("Should set the right max number of masters", async () => {
                  expect(await studio.getMaxNumberOfMasters()).to.equal(maxNumberOfMasters)
              })
          })
      })
