const fs = require('fs');
const path = require('path');

// 读取编译后的合约ABI
const betTokenArtifact = require('../artifacts/contracts/BetToken.sol/BetToken.json');
const betTicketArtifact = require('../artifacts/contracts/BetTicket.sol/BetTicket.json');
const bettingSystemArtifact = require('../artifacts/contracts/BettingSystem.sol/BettingSystem.json');

// 导出ABI到前端
const frontendAbisPath = path.join(__dirname, '../../frontend/src/contracts/abis.json');

const abis = {
  BetToken: betTokenArtifact.abi,
  BetTicket: betTicketArtifact.abi,
  BettingSystem: bettingSystemArtifact.abi
};

fs.writeFileSync(frontendAbisPath, JSON.stringify(abis, null, 2));

console.log('✅ ABIs已导出到前端');
console.log('路径:', frontendAbisPath);

