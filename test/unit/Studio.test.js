const { network, ethers, deployments } = require("hardhat")
const { time } = require("@nomicfoundation/hardhat-network-helpers")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { expect } = require("chai")
// const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs")

const SECONDS_PER_HOUR = 60 * 60
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR

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
              priceFeedAddress,
              currentTimestamp
          beforeEach(async () => {
              ;[deployer, otherAccount] = await ethers.getSigners()
              await deployments.fixture(["studio", "mocks"])
              studio = await ethers.getContract("Studio", deployer)
              studioAddress = await studio.getAddress()
              chainId = network.config.chainId
              ethUsdPriceFeedAddress = networkConfig[chainId]["usdEthPriceFeed"]
              pricePerHour = networkConfig[chainId]["pricePerHour"]
              minScheduleHour = networkConfig[chainId]["minScheduleHour"]
              maxScheduleHour = networkConfig[chainId]["maxScheduleHour"]
              maxNumberOfMasters = networkConfig[chainId]["maxNumberOfMasters"]

              mockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer)
              currentTimestamp = await time.latest()
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
          describe("bookTimeGap", () => {
              it("Should revert if timestamps are invalid", async () => {
                  const tests = [
                      [
                          currentTimestamp - 5 * SECONDS_PER_HOUR,
                          currentTimestamp - 2 * SECONDS_PER_HOUR,
                      ],
                      [
                          currentTimestamp - 2 * SECONDS_PER_HOUR,
                          currentTimestamp + 2 * SECONDS_PER_HOUR,
                      ],
                      [
                          currentTimestamp + 2 * SECONDS_PER_HOUR,
                          currentTimestamp - 2 * SECONDS_PER_HOUR,
                      ],
                  ]
                  for (const timestamps of tests) {
                      expect(
                          studio.bookTimeGap(timestamps[0], timestamps[1])
                      ).to.be.revertedWithCustomError(studio, "Studio__InvalidTimestamps")
                  }
              })
              it("Should revert if hours are invalid", async () => {
                  const roundTimestamp =
                      currentTimestamp - (currentTimestamp % SECONDS_PER_DAY) + SECONDS_PER_DAY
                  const minScheduleTimestamp = roundTimestamp + minScheduleHour
                  const maxScheduleTimestamp = roundTimestamp + maxScheduleHour

                  const tests = [
                      [
                          minScheduleTimestamp - 2 * SECONDS_PER_HOUR,
                          maxScheduleTimestamp - 2 * SECONDS_PER_HOUR,
                      ],
                      [
                          minScheduleTimestamp + 2 * SECONDS_PER_HOUR,
                          maxScheduleTimestamp + 2 * SECONDS_PER_HOUR,
                      ],
                      [
                          minScheduleTimestamp - 2 * SECONDS_PER_HOUR,
                          maxScheduleTimestamp + 2 * SECONDS_PER_HOUR,
                      ],
                  ]
                  for (const timestamps of tests) {
                      expect(
                          studio.bookTimeGap(timestamps[0], timestamps[1])
                      ).to.be.revertedWithCustomError(studio, "Studio__InvalidTime")
                  }
              })
              //   it("Should revert if not enough money", async () => {
              //       const roundTimestamp =
              //           currentTimestamp - (currentTimestamp % SECONDS_PER_DAY) + SECONDS_PER_DAY
              //       const minScheduleTimestamp = roundTimestamp + minScheduleHour
              //       const maxScheduleTimestamp = roundTimestamp + maxScheduleHour

              //       const tests = [
              //           [
              //               minScheduleTimestamp - 2 * SECONDS_PER_HOUR,
              //               maxScheduleTimestamp - 2 * SECONDS_PER_HOUR,
              //           ],
              //           [
              //               minScheduleTimestamp + 2 * SECONDS_PER_HOUR,
              //               maxScheduleTimestamp + 2 * SECONDS_PER_HOUR,
              //           ],
              //           [
              //               minScheduleTimestamp - 2 * SECONDS_PER_HOUR,
              //               maxScheduleTimestamp + 2 * SECONDS_PER_HOUR,
              //           ],
              //       ]
              //       for (const timestamps of tests) {
              //           expect(
              //               studio.bookTimeGap(timestamps[0], timestamps[1])
              //           ).to.be.revertedWithCustomError(studio, "Studio__InvalidTime")
              //       }
              //   })
          })
      })
