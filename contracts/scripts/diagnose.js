const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function checkGanache() {
  console.log('🔍 检查 Ganache 连接...');
  try {
    const provider = ethers.provider;
    const blockNumber = await provider.getBlockNumber();
    console.log('✅ Ganache 正在运行');
    console.log(`   当前区块高度: ${blockNumber}`);
    return true;
  } catch (error) {
    console.log('❌ 无法连接到 Ganache');
    console.log('   请确保 Ganache 在 http://localhost:8545 运行');
    return false;
  }
}

async function checkContracts() {
  console.log('\n🔍 检查合约状态...');
  
  const addressesPath = path.join(__dirname, '../contract-addresses.json');
  if (!fs.existsSync(addressesPath)) {
    console.log('❌ 未找到 contract-addresses.json');
    console.log('   需要先部署合约: node scripts/full-deploy.js');
    return false;
  }

  const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
  console.log('📋 合约地址:');
  console.log(`   BetToken: ${addresses.BetToken}`);
  console.log(`   BetTicket: ${addresses.BetTicket}`);
  console.log(`   BettingSystem: ${addresses.BettingSystem}`);
  console.log(`   Admin: ${addresses.Admin}`);

  try {
    const [signer] = await ethers.getSigners();
    console.log(`\n🔗 连接账户: ${signer.address}`);

    // 检查每个合约
    const provider = ethers.provider;
    
    const betTokenCode = await provider.getCode(addresses.BetToken);
    if (betTokenCode === '0x') {
      console.log('❌ BetToken 合约未部署');
      return false;
    }
    console.log('✅ BetToken 合约已部署');

    const betTicketCode = await provider.getCode(addresses.BetTicket);
    if (betTicketCode === '0x') {
      console.log('❌ BetTicket 合约未部署');
      return false;
    }
    console.log('✅ BetTicket 合约已部署');

    const bettingSystemCode = await provider.getCode(addresses.BettingSystem);
    if (bettingSystemCode === '0x') {
      console.log('❌ BettingSystem 合约未部署');
      return false;
    }
    console.log('✅ BettingSystem 合约已部署');

    return true;
  } catch (error) {
    console.log('❌ 检查合约失败:', error.message);
    return false;
  }
}

async function checkFrontendFiles() {
  console.log('\n🔍 检查前端文件...');
  
  const files = [
    '../../frontend/src/contracts/BetToken.json',
    '../../frontend/src/contracts/BetTicket.json',
    '../../frontend/src/contracts/BettingSystem.json',
    '../../frontend/src/contracts/addresses.ts'
  ];

  let allExist = true;
  for (const file of files) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${path.basename(file)} 存在`);
    } else {
      console.log(`❌ ${path.basename(file)} 不存在`);
      allExist = false;
    }
  }

  return allExist;
}

async function testTokenClaim() {
  console.log('\n🔍 测试代币领取功能...');
  
  try {
    const addressesPath = path.join(__dirname, '../contract-addresses.json');
    const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
    
    const [signer] = await ethers.getSigners();
    const BetToken = await ethers.getContractFactory("BetToken");
    const betToken = BetToken.attach(addresses.BetToken);
    
    // 检查余额
    const balance = await betToken.balanceOf(signer.address);
    console.log(`   当前余额: ${ethers.utils.formatEther(balance)} BET`);
    
    // 检查剩余领取次数
    const remaining = await betToken.getRemainingClaims(signer.address);
    console.log(`   剩余领取次数: ${remaining.toString()}`);
    
    if (remaining.toNumber() > 0) {
      console.log('✅ 可以领取代币');
      
      // 尝试估算 gas
      try {
        const gasEstimate = await betToken.estimateGas.claimTokens();
        console.log(`   估算 gas: ${gasEstimate.toString()}`);
        console.log('✅ Gas 估算成功，领取功能正常');
      } catch (error) {
        console.log('❌ Gas 估算失败:', error.message);
        return false;
      }
    } else {
      console.log('⚠️ 已达到最大领取次数');
    }
    
    return true;
  } catch (error) {
    console.log('❌ 测试失败:', error.message);
    return false;
  }
}

async function main() {
  console.log('========================================');
  console.log('🩺 系统诊断');
  console.log('========================================');

  const ganacheOk = await checkGanache();
  if (!ganacheOk) {
    console.log('\n💡 解决方案:');
    console.log('   1. 启动 Ganache GUI 或运行: npx ganache-cli');
    console.log('   2. 确保 RPC 服务器在 http://localhost:8545');
  }

  const contractsOk = await checkContracts();
  if (!contractsOk) {
    console.log('\n💡 解决方案:');
    console.log('   运行: node scripts/full-deploy.js');
  }

  const frontendOk = await checkFrontendFiles();
  if (!frontendOk) {
    console.log('\n💡 解决方案:');
    console.log('   运行: node scripts/copy-artifacts.js');
    console.log('   运行: node scripts/update-frontend-config.js');
  }

  if (ganacheOk && contractsOk) {
    await testTokenClaim();
  }

  console.log('\n========================================');
  if (ganacheOk && contractsOk && frontendOk) {
    console.log('✅ 所有检查通过！');
    console.log('\n💡 如果前端仍有问题，请检查:');
    console.log('   1. MetaMask 是否连接到正确的网络 (Chain ID: 1337)');
    console.log('   2. MetaMask 中的账户是否有足够的 ETH (gas fee)');
    console.log('   3. 浏览器控制台是否有错误信息');
  } else {
    console.log('⚠️ 发现问题，请按照上述解决方案修复');
  }
  console.log('========================================');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ 诊断失败:', error);
    process.exit(1);
  });

