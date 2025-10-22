# MetaMask 配置指南

## 问题诊断
✅ **Ganache 正在运行** (http://localhost:8545, 区块高度: 31+)
❌ **MetaMask 未正确连接** (Failed to fetch 错误)

---

## 解决方案：配置 MetaMask

### 步骤 1: 添加 Ganache 网络

1. **打开 MetaMask**
2. **点击顶部的网络下拉菜单**
3. **点击 "添加网络" 或 "Add Network"**
4. **点击 "手动添加网络" 或 "Add a network manually"**

### 步骤 2: 填写网络信息

```
网络名称 (Network Name):     Ganache
RPC URL:                     http://localhost:8545
链 ID (Chain ID):            1337
货币符号 (Currency Symbol):  ETH
区块浏览器 URL (可选):        留空
```

⚠️ **重要提示**：
- RPC URL 必须是 `http://localhost:8545`（不是 https）
- 链 ID 必须是 `1337`
- 确保没有多余的空格

### 步骤 3: 保存并切换网络

1. **点击 "保存" 或 "Save"**
2. **确认 MetaMask 已切换到 "Ganache" 网络**
3. **顶部应该显示 "Ganache"**

---

## 导入 Ganache 账户

### 管理员账户（必须导入）

在 MetaMask 中导入管理员账户私钥：

```
地址: 0xF51F5e06D1CB3b00211639Ce9b3FBaFEDdf8E348
私钥: 0x27e580d6a9466dfc12d9283dc7411b381897e4eb19b46d6d59e1e886ccbd4f89
```

**导入步骤**：
1. 点击 MetaMask 右上角的账户图标
2. 选择 "导入账户" 或 "Import Account"
3. 选择 "私钥" 或 "Private Key"
4. 粘贴上面的私钥
5. 点击 "导入" 或 "Import"

### 其他测试账户（可选）

可以从 `contracts/hardhat.config.ts` 中找到更多测试账户的私钥。

---

## 验证配置

### 检查清单：

- [ ] MetaMask 已安装并解锁
- [ ] 已添加 Ganache 网络 (Chain ID: 1337)
- [ ] 当前网络已切换到 Ganache
- [ ] 已导入至少一个 Ganache 账户
- [ ] 账户有足够的 ETH（Ganache 默认给每个账户 100 ETH）

### 刷新前端

配置完成后：
1. **刷新浏览器页面** (F5 或 Ctrl+R)
2. **点击 "连接钱包"**
3. **在 MetaMask 弹窗中点击 "连接"**

---

## 常见问题

### Q: 仍然显示 "Failed to fetch"

**A**: 
1. 确认 Ganache 正在运行
2. 在 MetaMask 中**完全删除**旧的 Ganache 网络，重新添加
3. 确保 RPC URL 是 `http://localhost:8545`（注意是 http 不是 https）
4. 关闭并重新打开 MetaMask
5. 刷新浏览器页面

### Q: MetaMask 显示 "nonce too high" 或其他交易错误

**A**:
1. 点击 MetaMask 账户图标
2. 进入 "设置" > "高级" > "重置账户"
3. 这会清除交易历史，解决 nonce 问题

### Q: 找不到 "添加网络" 选项

**A**:
- 确保 MetaMask 是最新版本
- 或者访问 https://chainlist.org，搜索 "1337"，连接 MetaMask 自动添加

### Q: 交易被拒绝或 gas 估算失败

**A**:
1. 确保账户有足够的 ETH（用于 gas fee）
2. 检查合约是否已正确部署
3. 运行诊断脚本：`node check-ganache.js`

---

## 快速测试

配置完成后，打开浏览器控制台（F12），运行：

```javascript
ethereum.request({ method: 'eth_chainId' })
  .then(chainId => console.log('Chain ID:', parseInt(chainId, 16)))
```

应该输出：`Chain ID: 1337`

如果不是 1337，说明 MetaMask 还没切换到 Ganache 网络。


