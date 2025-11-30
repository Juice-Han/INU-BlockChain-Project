import hre from "hardhat";

async function main() {
  // Connect to the network specified via CLI (e.g., --network sepolia) and grab ethers
  const { ethers } = await hre.network.connect();

  const ClubManager = await ethers.getContractFactory("ClubManager");
  const clubManager = await ClubManager.deploy();

  await clubManager.waitForDeployment();

  console.log("ClubManager deployed to:", await clubManager.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
