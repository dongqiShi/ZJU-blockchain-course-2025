import { ethers } from "hardhat";

async function main() {
  console.log("开始部署合约...");

  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);

  // 部署 BetToken (ERC20)
  console.log("\n1. 部署 BetToken...");
  const BetToken = await ethers.getContractFactory("BetToken");
  const betToken = await BetToken.deploy();
  await betToken.deployed();
  console.log("BetToken 部署地址:", betToken.address);

  // 部署 BettingSystem
  console.log("\n2. 部署 BettingSystem...");
  const BettingSystem = await ethers.getContractFactory("BettingSystem");
  const bettingSystem = await BettingSystem.deploy(betToken.address);
  await bettingSystem.deployed();
  console.log("BettingSystem 部署地址:", bettingSystem.address);

  // 输出所有合约地址
  console.log("\n==========================================");
  console.log("部署完成！合约地址摘要：");
  console.log("==========================================");
  console.log("BetToken:", betToken.address);
  console.log("BettingSystem:", bettingSystem.address);
  console.log("==========================================");

  // 保存地址到文件
  const fs = require('fs');
  const addresses = {
    BetToken: betToken.address,
    BettingSystem: bettingSystem.address,
    Admin: deployer.address  // 保存管理员地址
  };
  
  fs.writeFileSync(
    './contract-addresses.json',
    JSON.stringify(addresses, null, 2)
  );
  console.log("\n合约地址已保存到 contract-addresses.json");
  console.log("管理员地址（公证人）:", deployer.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
