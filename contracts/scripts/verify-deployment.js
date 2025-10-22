const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("验证合约部署状态...\n");

  // 读取合约地址
  const addressesPath = path.join(__dirname, '../contract-addresses.json');
  
  if (!fs.existsSync(addressesPath)) {
    console.log("❌ 未找到 contract-addresses.json");
    console.log("💡 请先部署合约: npx hardhat run scripts/deploy.ts --network ganache");
    return;
  }

  const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
  console.log("📋 读取到的合约地址:");
  console.log("  BetToken:", addresses.BetToken);
  console.log("  BetTicket:", addresses.BetTicket);
  console.log("  BettingSystem:", addresses.BettingSystem);
  console.log("  Admin:", addresses.Admin);
  console.log();

  try {
    // 连接到网络
    const [signer] = await ethers.getSigners();
    console.log("🔗 连接账户:", signer.address);
    console.log();

    // 验证每个合约
    console.log("🔍 验证合约代码...");
    
    // 检查 BetToken
    const betTokenCode = await ethers.provider.getCode(addresses.BetToken);
    if (betTokenCode === '0x') {
      console.log("❌ BetToken 合约不存在于该地址");
    } else {
      console.log("✅ BetToken 合约已部署");
      
      // 尝试调用合约函数
      const BetToken = await ethers.getContractFactory("BetToken");
      const betToken = BetToken.attach(addresses.BetToken);
      const name = await betToken.name();
      const symbol = await betToken.symbol();
      console.log(`   名称: ${name}, 符号: ${symbol}`);
    }

    // 检查 BetTicket
    const betTicketCode = await ethers.provider.getCode(addresses.BetTicket);
    if (betTicketCode === '0x') {
      console.log("❌ BetTicket 合约不存在于该地址");
    } else {
      console.log("✅ BetTicket 合约已部署");
      
      const BetTicket = await ethers.getContractFactory("BetTicket");
      const betTicket = BetTicket.attach(addresses.BetTicket);
      const name = await betTicket.name();
      const symbol = await betTicket.symbol();
      console.log(`   名称: ${name}, 符号: ${symbol}`);
      
      const owner = await betTicket.owner();
      console.log(`   所有者: ${owner}`);
    }

    // 检查 BettingSystem
    const bettingSystemCode = await ethers.provider.getCode(addresses.BettingSystem);
    if (bettingSystemCode === '0x') {
      console.log("❌ BettingSystem 合约不存在于该地址");
    } else {
      console.log("✅ BettingSystem 合约已部署");
      
      const BettingSystem = await ethers.getContractFactory("BettingSystem");
      const bettingSystem = BettingSystem.attach(addresses.BettingSystem);
      const ticketPrice = await bettingSystem.TICKET_PRICE();
      console.log(`   彩票价格: ${ethers.utils.formatEther(ticketPrice)} BET`);
      
      const projectCount = await bettingSystem.getProjectCount();
      console.log(`   项目数量: ${projectCount.toString()}`);
    }

    console.log("\n✨ 验证完成！");
    
  } catch (error) {
    console.error("\n❌ 验证失败:", error.message);
    console.log("\n💡 可能的原因:");
    console.log("  1. Ganache 未启动");
    console.log("  2. 合约地址指向旧的部署（Ganache 重启后）");
    console.log("  3. 网络配置不正确");
    console.log("\n💡 解决方案:");
    console.log("  1. 确保 Ganache 在 http://localhost:8545 运行");
    console.log("  2. 重新部署合约: npx hardhat run scripts/deploy.ts --network ganache");
    console.log("  3. 运行更新脚本:");
    console.log("     node scripts/copy-artifacts.js");
    console.log("     node scripts/update-frontend-config.js");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


