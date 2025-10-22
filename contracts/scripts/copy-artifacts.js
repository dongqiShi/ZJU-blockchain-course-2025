const fs = require('fs');
const path = require('path');

console.log('正在复制合约 artifacts 到前端...\n');

// 源文件路径
const betTokenSource = path.join(__dirname, '../artifacts/contracts/BetToken.sol/BetToken.json');
const betTicketSource = path.join(__dirname, '../artifacts/contracts/BetTicket.sol/BetTicket.json');
const bettingSystemSource = path.join(__dirname, '../artifacts/contracts/BettingSystem.sol/BettingSystem.json');

// 目标文件路径
const frontendContractsDir = path.join(__dirname, '../../frontend/src/contracts');
const betTokenDest = path.join(frontendContractsDir, 'BetToken.json');
const betTicketDest = path.join(frontendContractsDir, 'BetTicket.json');
const bettingSystemDest = path.join(frontendContractsDir, 'BettingSystem.json');

// 确保目标目录存在
if (!fs.existsSync(frontendContractsDir)) {
  fs.mkdirSync(frontendContractsDir, { recursive: true });
  console.log('✅ 创建目录:', frontendContractsDir);
}

// 复制文件
try {
  fs.copyFileSync(betTokenSource, betTokenDest);
  console.log('✅ 复制 BetToken.json');
  
  fs.copyFileSync(betTicketSource, betTicketDest);
  console.log('✅ 复制 BetTicket.json');
  
  fs.copyFileSync(bettingSystemSource, bettingSystemDest);
  console.log('✅ 复制 BettingSystem.json');
  
  console.log('\n✨ 所有 artifacts 已成功复制到前端！');
} catch (error) {
  console.error('❌ 复制失败:', error.message);
  process.exit(1);
}


