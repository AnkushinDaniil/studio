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
              accounts,
              chainId,
              ethUsdPriceFeedAddress,
              pricePerHour,
              weiPerHour,
              minScheduleHour,
              maxScheduleHour,
              maxNumberOfMasters,
              mockV3Aggregator
          beforeEach(async () => {
              accounts = await ethers.getSigners()
              await deployments.fixture(["studio", "mocks"])

              studio = await ethers.getContract("Studio", accounts[0])
              mockV3Aggregator = await ethers.getContract("MockV3Aggregator", accounts[0])
              const usdInEth = (await mockV3Aggregator.latestRoundData())[1] * BigInt(1e10)

              studioAddress = await studio.getAddress()
              chainId = network.config.chainId
              ethUsdPriceFeedAddress = networkConfig[chainId]["usdEthPriceFeed"]
              pricePerHour = BigInt(networkConfig[chainId]["pricePerHour"])
              weiPerHour = (pricePerHour * BigInt(1e18)) / (usdInEth / BigInt(1e18))

              minScheduleHour = Number(networkConfig[chainId]["minScheduleHour"])
              maxScheduleHour = Number(networkConfig[chainId]["maxScheduleHour"])
              maxNumberOfMasters = Number(networkConfig[chainId]["maxNumberOfMasters"])

              mockV3Aggregator = await ethers.getContract("MockV3Aggregator", accounts[0])
          })
          describe("constructor", () => {
              it("Should set the right price feed", async () => {
                  expect(await studio.getPriceFeedAddress()).to.equal(
                      await mockV3Aggregator.getAddress()
                  )
              })
              it("Should set the right owner", async () => {
                  expect(await studio.getOwner()).to.equal(accounts[0].address)
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
              let currentTimestamp,
                  minScheduleTimestamp,
                  maxScheduleTimestamp,
                  fromTimestamp,
                  toTimestamp,
                  price
              beforeEach(async () => {
                  currentTimestamp = await time.latest()
                  const roundTimestamp =
                      currentTimestamp - (currentTimestamp % SECONDS_PER_DAY) + SECONDS_PER_DAY
                  minScheduleTimestamp = roundTimestamp + minScheduleHour * SECONDS_PER_HOUR
                  maxScheduleTimestamp = roundTimestamp + maxScheduleHour * SECONDS_PER_HOUR
                  fromTimestamp = minScheduleTimestamp + 2 * SECONDS_PER_HOUR
                  toTimestamp = maxScheduleTimestamp - 2 * SECONDS_PER_HOUR
                  price =
                      (BigInt(toTimestamp - fromTimestamp) * weiPerHour) / BigInt(SECONDS_PER_HOUR)
                  for (let i = 0; i < maxNumberOfMasters; i++) {
                      await studio.addMasterToWhitelist(accounts[i])
                  }
              })
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
                      await expect(
                          studio.bookTimeGap(timestamps[0], timestamps[1])
                      ).to.be.revertedWithCustomError(studio, "Studio__InvalidTimestamps")
                  }
              })
              it("Should revert if hours are invalid", async () => {
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
                      await expect(
                          studio.bookTimeGap(timestamps[0], timestamps[1])
                      ).to.be.revertedWithCustomError(studio, "Studio__InvalidTimestamps")
                  }
              })
              it("Should revert if not enough money", async () => {
                  await expect(
                      studio.bookTimeGap(fromTimestamp, toTimestamp)
                  ).to.be.revertedWithCustomError(studio, "Studio__InsufficientFunding")
                  expect(
                      studio.bookTimeGap(fromTimestamp, toTimestamp, {
                          value: price - 1n,
                      })
                  ).to.be.revertedWithCustomError(studio, "Studio__InsufficientFunding")
              })
              it("Should revert if master isn't in whitelist", async () => {
                  await expect(
                      studio
                          .connect(accounts[maxNumberOfMasters])
                          .bookTimeGap(fromTimestamp, toTimestamp, { value: price })
                  ).to.be.revertedWithCustomError(studio, "Studio__NotInWhitelist")
              })
              it("Should revert if too many masters", async () => {
                  studio.addMasterToWhitelist(accounts[maxNumberOfMasters])
                  for (let i = 0; i < maxNumberOfMasters; i++) {
                      await studio
                          .connect(accounts[i])
                          .bookTimeGap(fromTimestamp, toTimestamp, { value: price })
                  }

                  await expect(
                      studio
                          .connect(accounts[maxNumberOfMasters])
                          .bookTimeGap(fromTimestamp, toTimestamp, { value: price })
                  ).to.be.revertedWithCustomError(studio, "Studio__TooManyMasters")
              })
              it('Should emit "TimeSlotBooked" event', async () => {
                  await expect(studio.bookTimeGap(fromTimestamp, toTimestamp, { value: price }))
                      .to.emit(studio, "TimeSlotBooked")
                      .withArgs(accounts[0].address, fromTimestamp, toTimestamp)
              })
              it("Should set the schedule in the calendar", async () => {
                  tx = await studio.bookTimeGap(fromTimestamp, toTimestamp, { value: price })
                  txReceipt = await tx.wait(1)
                  const date = new Date(fromTimestamp * 1000)
                  const res = await studio.getScheduleFromDate(
                      date.getFullYear(),
                      date.getMonth() + 1,
                      date.getDate()
                  )
                  BigInt.prototype.toJSON = function () {
                      return this.toString()
                  }
              })
          })
      })
