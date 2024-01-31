import { network, ethers, deployments } from "hardhat"
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers"
import { Contract } from "ethers"
import { time } from "@nomicfoundation/hardhat-network-helpers"
import { developmentChains, networkConfig } from "../../helper-hardhat-config"
import { expect } from "chai"
// import  { anyValue } = from "@nomicfoundation/hardhat-chai-matchers/withArgs")

const SECONDS_PER_HOUR = 60 * 60
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Studio unit tests", () => {
          let studio: any,
              studioAddress: string,
              accounts: HardhatEthersSigner[],
              chainId: number,
              ethUsdPriceFeedAddress: string,
              pricePerHour: bigint,
              weiPerHour: bigint,
              minScheduleHour: number,
              maxScheduleHour: number,
              maxNumberOfMasters: number,
              mockV3Aggregator: Contract
          beforeEach(async () => {
              accounts = await ethers.getSigners()
              await deployments.fixture(["studio", "mocks"])

              studio = await ethers.getContract("Studio", accounts[0])
              mockV3Aggregator = await ethers.getContract("MockV3Aggregator", accounts[0])
              const usdInEth = (await mockV3Aggregator.latestRoundData())[1] * BigInt(1e10)

              studioAddress = await studio.getAddress()
              chainId = Number(network.config.chainId)
              ethUsdPriceFeedAddress = networkConfig[chainId]["usdEthPriceFeed"]
              pricePerHour = BigInt(networkConfig[chainId]["pricePerHour"])
              weiPerHour = BigInt((pricePerHour * BigInt(1e18)) / (usdInEth / BigInt(1e18)))

              minScheduleHour = Number(networkConfig[chainId]["minScheduleHour"])
              maxScheduleHour = Number(networkConfig[chainId]["maxScheduleHour"])
              maxNumberOfMasters = Number(networkConfig[chainId]["maxNumberOfMasters"])

              mockV3Aggregator = await ethers.getContract("MockV3Aggregator", accounts[0])
          })
          describe("constructor", (): void => {
              it("Should set the right price feed", async (): Promise<void> => {
                  expect(await studio.getPriceFeedAddress()).to.equal(
                      await mockV3Aggregator.getAddress()
                  )
              })
              it("Should set the right owner", async (): Promise<void> => {
                  expect(await studio.getOwner()).to.equal(accounts[0].address)
              })
              it("Should set the right price per hour", async (): Promise<void> => {
                  expect(await studio.getPricePerHour()).to.equal(pricePerHour)
              })
              it("Should set the right min schedule hour", async (): Promise<void> => {
                  expect(await studio.getMinScheduleHour()).to.equal(minScheduleHour)
              })
              it("Should set the right max schedule hour", async (): Promise<void> => {
                  expect(await studio.getMaxScheduleHour()).to.equal(maxScheduleHour)
              })
              it("Should set the right max number of masters", async (): Promise<void> => {
                  expect(await studio.getMaxNumberOfMasters()).to.equal(maxNumberOfMasters)
              })
          })
          describe("bookTimeGap", (): void => {
              let currentTimestamp: number,
                  minScheduleTimestamp: number,
                  maxScheduleTimestamp: number,
                  fromTimestamp: number,
                  toTimestamp: number,
                  price: bigint
              beforeEach(async (): Promise<void> => {
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
              it("Should revert if timestamps are invalid", async (): Promise<void> => {
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
              it("Should revert if hours are invalid", async (): Promise<void> => {
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
              it("Should revert if not enough money", async (): Promise<void> => {
                  await expect(
                      studio.bookTimeGap(fromTimestamp, toTimestamp)
                  ).to.be.revertedWithCustomError(studio, "Studio__InsufficientFunding")
                  expect(
                      studio.bookTimeGap(fromTimestamp, toTimestamp, {
                          value: price - 1n,
                      })
                  ).to.be.revertedWithCustomError(studio, "Studio__InsufficientFunding")
              })
              it("Should revert if master isn't in whitelist", async (): Promise<void> => {
                  await expect(
                      studio
                          .connect(accounts[maxNumberOfMasters])
                          .bookTimeGap(fromTimestamp, toTimestamp, { value: price })
                  ).to.be.revertedWithCustomError(studio, "Studio__NotInWhitelist")
              })
              it("Should revert if too many masters", async (): Promise<void> => {
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
              it('Should emit "TimeSlotBooked" event', async (): Promise<void> => {
                  await expect(studio.bookTimeGap(fromTimestamp, toTimestamp, { value: price }))
                      .to.emit(studio, "TimeSlotBooked")
                      .withArgs(accounts[0].address, fromTimestamp, toTimestamp)
              })
              it("Should set the schedule in the calendar", async (): Promise<void> => {
                  const tx = await studio.bookTimeGap(fromTimestamp, toTimestamp, { value: price })
                  const txReceipt = await tx.wait(1)
                  const date = new Date(fromTimestamp * 1000)
                  const res = await studio.getScheduleFromDate(
                      date.getFullYear(),
                      date.getMonth() + 1,
                      date.getDate()
                  )
                  await expect(
                      JSON.stringify(res, (_, v) => (typeof v === "bigint" ? v.toString() : v))
                  ).to.equal(
                      JSON.stringify(
                          [
                              [fromTimestamp.toString(), accounts[0].address, "0"],
                              [toTimestamp.toString(), accounts[0].address, "1"],
                          ],
                          (_, v) => (typeof v === "bigint" ? v.toString() : v)
                      )
                  )
              })
          })
          describe("setters", (): void => {
              it("Should set the right price feed", async (): Promise<void> => {
                  await studio.setPriceFeedAddress("0x694AA1769357215DE4FAC081bf1f309aDC325306")
                  expect(await studio.getPriceFeedAddress()).to.equal(
                      "0x694AA1769357215DE4FAC081bf1f309aDC325306"
                  )
              })
              it("Should set the right price per hour", async (): Promise<void> => {
                  await studio.setPricePerHour("6")
                  expect(await studio.getPricePerHour()).to.equal("6")
              })
              it("Should set the right min schedule hour", async (): Promise<void> => {
                  await studio.setMinScheduleHour("10")
                  expect(await studio.getMinScheduleHour()).to.equal("10")
              })
              it("Should set the right max schedule hour", async (): Promise<void> => {
                  await studio.setMaxScheduleHour("20")
                  expect(await studio.getMaxScheduleHour()).to.equal("20")
              })
              it("Should set the right max number of masters", async (): Promise<void> => {
                  await studio.setMaxNumberOfMasters("4")
                  expect(await studio.getMaxNumberOfMasters()).to.equal("4")
              })
          })
          describe("whitelist", (): void => {
              it("Should retern false if master was not added to whitelist", async (): Promise<void> => {
                  expect(await studio.isMasterInWhitelist(accounts[0].address)).to.equal(false)
              })
              it("Should retern true if master was added to whitelist", async (): Promise<void> => {
                  await studio.addMasterToWhitelist(accounts[0].address)
                  expect(await studio.isMasterInWhitelist(accounts[0].address)).to.equal(true)
              })
              it("Should retern false if master was removed акщь whitelist", async (): Promise<void> => {
                  await studio.addMasterToWhitelist(accounts[0].address)
                  await studio.removeMasterFromsWhitelist(accounts[0].address)
                  expect(await studio.isMasterInWhitelist(accounts[0].address)).to.equal(false)
              })
          })
      })
