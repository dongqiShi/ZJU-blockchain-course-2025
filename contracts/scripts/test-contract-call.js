const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('========================================');
  console.log('🧪 测试合约调用');
  console.log('========================================\n');

  // 读取合约地址
  const addressesPath = path.join(__dirname, '../contract-addresses.json');
  const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));

  console.log('📋 合约地址:');
  console.log(`   BetToken: ${addresses.BetToken}`);
  console.log(`   BetTicket: ${addresses.BetTicket}`);
  console.log(`   BettingSystem: ${addresses.BettingSystem}`);
  console.log(`   Admin: ${addresses.Admin}\n`);

  try {
    const [deployer, user1] = await ethers.getSigners();
    console.log(`🔗 部署者账户: ${deployer.address}`);
    console.log(`👤 测试账户: ${user1.address}\n`);

    // 连接到合约
    const BetToken = await ethers.getContractFactory("BetToken");
    const betToken = BetToken.attach(addresses.BetToken);

    const BetTicket = await ethers.getContractFactory("BetTicket");
    const betTicket = BetTicket.attach(addresses.BetTicket);

    const BettingSystem = await ethers.getContractFactory("BettingSystem");
    const bettingSystem = BettingSystem.attach(addresses.BettingSystem);

    // 测试 1: 读取 BetToken 信息
    console.log('📝 测试 1: 读取 BetToken 信息');
    const name = await betToken.name();
    const symbol = await betToken.symbol();
    const deployerBalance = await betToken.balanceOf(deployer.address);
    console.log(`   名称: ${name}`);
    console.log(`   符号: ${symbol}`);
    console.log(`   部署者余额: ${ethers.utils.formatEther(deployerBalance)} BET`);
    console.log('   ✅ 读取成功\n');

    // 测试 2: 用户领取代币
    console.log('📝 测试 2: 用户领取代币');
    const remainingBefore = await betToken.getRemainingClaims(user1.address);
    console.log(`   领取前剩余次数: ${remainingBefore.toString()}`);
    
    try {
      const claimTx = await betToken.connect(user1).claimTokens({ gasLimit: 300000 });
      console.log(`   交易哈希: ${claimTx.hash}`);
      await claimTx.wait();
      
      const balanceAfter = await betToken.balanceOf(user1.address);
      const remainingAfter = await betToken.getRemainingClaims(user1.address);
      console.log(`   领取后余额: ${ethers.utils.formatEther(balanceAfter)} BET`);
      console.log(`   领取后剩余次数: ${remainingAfter.toString()}`);
      console.log('   ✅ 领取成功\n');
    } catch (error) {
      console.log('   ❌ 领取失败:', error.message);
      console.log('');
    }

    // 测试 3: 创建项目（需要授权）
    console.log('📝 测试 3: 创建竞猜项目');
    const baseReward = ethers.utils.parseEther("1000");
    
    // 授权
    console.log('   正在授权 BettingSystem...');
    const approveTx = await betToken.approve(addresses.BettingSystem, baseReward, { gasLimit: 100000 });
    await approveTx.wait();
    console.log('   ✅ 授权成功');
    
    // 创建项目
    const projectName = "测试项目";
    const projectDesc = "这是一个测试项目";
    const options = ["选项A", "选项B", "选项C"];
    const duration = 3600; // 1小时
    
    console.log('   正在创建项目...');
    try {
      const createTx = await bettingSystem.createProject(
        projectName,
        projectDesc,
        options,
        duration,
        baseReward,
        { gasLimit: 500000 }
      );
      console.log(`   交易哈希: ${createTx.hash}`);
      await createTx.wait();
      
      const projectCount = await bettingSystem.getProjectCount();
      console.log(`   ✅ 项目创建成功，当前项目数: ${projectCount.toString()}`);
      
      // 获取项目信息
      const projectInfo = await bettingSystem.getProjectInfo(1);
      console.log(`   项目名称: ${projectInfo.name}`);
      console.log(`   项目描述: ${projectInfo.description}`);
      console.log(`   基础奖金: ${ethers.utils.formatEther(projectInfo.baseReward)} BET`);
      console.log('');
    } catch (error) {
      console.log('   ❌ 创建失败:', error.message);
      console.log('');
    }

    // 测试 4: 购买彩票
    if ((await bettingSystem.getProjectCount()).toNumber() > 0) {
      console.log('📝 测试 4: 购买彩票');
      
      // 用户1授权
      const ticketPrice = await bettingSystem.TICKET_PRICE();
      console.log(`   彩票价格: ${ethers.utils.formatEther(ticketPrice)} BET`);
      
      const user1Balance = await betToken.balanceOf(user1.address);
      console.log(`   用户余额: ${ethers.utils.formatEther(user1Balance)} BET`);
      
      if (user1Balance.gte(ticketPrice)) {
        console.log('   正在授权...');
        const approveTicketTx = await betToken.connect(user1).approve(addresses.BettingSystem, ticketPrice, { gasLimit: 100000 });
        await approveTicketTx.wait();
        console.log('   ✅ 授权成功');
        
        console.log('   正在购买彩票...');
        try {
          const purchaseTx = await bettingSystem.connect(user1).purchaseTicket(1, 0, { gasLimit: 500000 });
          console.log(`   交易哈希: ${purchaseTx.hash}`);
          const receipt = await purchaseTx.wait();
          console.log('   ✅ 购买成功');
          
          // 检查NFT
          const ticketBalance = await betTicket.balanceOf(user1.address);
          console.log(`   用户拥有 ${ticketBalance.toString()} 张彩票`);
          console.log('');
        } catch (error) {
          console.log('   ❌ 购买失败:', error.message);
          console.log('');
        }
      } else {
        console.log('   ⚠️ 余额不足，跳过购买测试\n');
      }
    }

    console.log('========================================');
    console.log('✅ 所有测试完成！');
    console.log('========================================\n');
    console.log('💡 如果以上测试全部通过，说明合约功能正常。');
    console.log('   前端问题可能是由于：');
    console.log('   1. MetaMask 网络配置不正确');
    console.log('   2. 前端 ABI 文件未更新');
    console.log('   3. 浏览器缓存问题');
    console.log('\n🔧 建议：');
    console.log('   1. 清除浏览器缓存并刷新');
    console.log('   2. 检查 MetaMask 网络是否为 Ganache (Chain ID: 1337)');
    console.log('   3. 查看浏览器控制台的详细错误信息');

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    console.log('\n💡 请检查：');
    console.log('   1. Ganache 是否正在运行');
    console.log('   2. 合约是否已正确部署');
    console.log('   3. hardhat.config.ts 中的账户私钥是否正确');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


