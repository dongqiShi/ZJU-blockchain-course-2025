const fs = require('fs');
const path = require('path');

// 读取部署的合约地址
const addressesPath = path.join(__dirname, '../contract-addresses.json');
const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));

// 更新前端配置文件
const frontendAddressesPath = path.join(__dirname, '../../frontend/src/contracts/addresses.ts');
const addressesContent = `// 部署后自动生成的合约地址
export const CONTRACT_ADDRESSES = {
  BetToken: "${addresses.BetToken}",
  BetTicket: "${addresses.BetTicket}",
  BettingSystem: "${addresses.BettingSystem}"
};

// 管理员地址（公证人）
export const ADMIN_ADDRESS = "${addresses.Admin}";
`;

fs.writeFileSync(frontendAddressesPath, addressesContent);
console.log('前端配置已更新！');
console.log('合约地址:', addresses);

