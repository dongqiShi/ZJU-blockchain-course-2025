// 简单的 Ganache 连接检查
const http = require('http');

console.log('🔍 检查 Ganache 连接状态...\n');

const postData = JSON.stringify({
  jsonrpc: '2.0',
  method: 'eth_blockNumber',
  params: [],
  id: 1
});

const options = {
  hostname: 'localhost',
  port: 8545,
  path: '/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (response.result) {
        const blockNumber = parseInt(response.result, 16);
        console.log('✅ Ganache 正在运行！');
        console.log(`   RPC URL: http://localhost:8545`);
        console.log(`   当前区块高度: ${blockNumber}\n`);
        console.log('💡 Ganache 连接正常，问题可能在于：');
        console.log('   1. MetaMask 未连接到 Ganache 网络');
        console.log('   2. MetaMask 网络配置不正确');
        console.log('\n📝 请在 MetaMask 中添加网络：');
        console.log('   网络名称: Ganache');
        console.log('   RPC URL: http://localhost:8545');
        console.log('   链 ID: 1337');
        console.log('   货币符号: ETH');
      }
    } catch (error) {
      console.log('❌ 收到无效响应:', data);
    }
  });
});

req.on('error', (error) => {
  console.log('❌ 无法连接到 Ganache！\n');
  console.log('错误信息:', error.message);
  console.log('\n💡 解决方案：');
  console.log('   1. 确保 Ganache 正在运行');
  console.log('   2. 检查 Ganache 是否监听在 http://localhost:8545');
  console.log('   3. 如果使用 Ganache GUI，检查 RPC 服务器端口设置');
  console.log('   4. 如果使用命令行，运行: npx ganache-cli');
});

req.write(postData);
req.end();


