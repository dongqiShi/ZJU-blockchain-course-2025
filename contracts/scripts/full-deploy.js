const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function runCommand(command, description) {
  console.log(`\n🔨 ${description}...`);
  try {
    const { stdout, stderr } = await execPromise(command, { cwd: __dirname + '/..' });
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    console.log(`✅ ${description} 完成`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} 失败:`, error.message);
    return false;
  }
}

async function main() {
  console.log('========================================');
  console.log('🚀 开始完整部署流程');
  console.log('========================================');

  // 1. 编译合约
  if (!await runCommand('npx hardhat compile', '编译合约')) {
    console.log('\n❌ 编译失败，终止部署');
    process.exit(1);
  }

  // 2. 部署合约
  if (!await runCommand('npx hardhat run scripts/deploy.ts --network ganache', '部署合约')) {
    console.log('\n❌ 部署失败，请检查:');
    console.log('  1. Ganache 是否在 http://localhost:8545 运行');
    console.log('  2. hardhat.config.ts 中的私钥是否正确');
    process.exit(1);
  }

  // 3. 复制 artifacts
  if (!await runCommand('node scripts/copy-artifacts.js', '复制 artifacts 到前端')) {
    console.log('\n⚠️ 复制 artifacts 失败，但继续...');
  }

  // 4. 更新前端配置
  if (!await runCommand('node scripts/update-frontend-config.js', '更新前端配置')) {
    console.log('\n⚠️ 更新前端配置失败，但继续...');
  }

  console.log('\n========================================');
  console.log('✨ 部署完成！');
  console.log('========================================');
  console.log('\n📝 下一步操作:');
  console.log('  1. 确保 MetaMask 已连接到 Ganache (http://localhost:8545, Chain ID: 1337)');
  console.log('  2. 在 MetaMask 中导入 Ganache 账户私钥');
  console.log('  3. 启动前端: cd ../frontend && npm start');
  console.log('  4. 打开浏览器访问 http://localhost:3000');
  console.log('\n💡 管理员账户地址可以在 contract-addresses.json 中查看');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ 部署流程失败:', error);
    process.exit(1);
  });


