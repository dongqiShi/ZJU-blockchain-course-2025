import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';
import { CONTRACT_ADDRESSES, ADMIN_ADDRESS } from './contracts/addresses';
import BetTokenArtifact from './contracts/BetToken.json';
import BettingSystemArtifact from './contracts/BettingSystem.json';


// 声明 window.ethereum 类型
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Project {
  id: number;
  name: string;
  description: string;
  options: string[];
  deadline: number;
  baseReward: string;
  totalPool: string;
  status: number;
  creator: string;
  winningOption: number;
}

interface Position {
  projectId: number;
  optionIndex: number;
  amount: string;
  optionName: string;
  projectName: string;
  projectStatus: number;
  winningOption: number;
}

interface Order {
  orderId: number;
  projectId: number;
  optionIndex: number;
  seller: string;
  amount: string;
  price: string;
  isActive: boolean;
}

function App() {
  const [account, setAccount] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [betToken, setBetToken] = useState<ethers.Contract | null>(null);
  const [bettingSystem, setBettingSystem] = useState<ethers.Contract | null>(null);
  
  const [balance, setBalance] = useState<string>('0');
  const [remainingClaims, setRemainingClaims] = useState<number>(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [myPositions, setMyPositions] = useState<Position[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [contractBalance, setContractBalance] = useState<string>('0');
  
  const [activeTab, setActiveTab] = useState<'projects' | 'create' | 'myPositions' | 'market' | 'admin'>('projects');
  const [loading, setLoading] = useState<boolean>(false);

  // 判断是否为管理员
  const isAdmin = account.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

  // 连接钱包
  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        setLoading(true);
        
        // 先检查 MetaMask 能否访问以太坊节点
        try {
          const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
          const currentChainId = parseInt(chainIdHex, 16);
          console.log('检测到网络 Chain ID:', currentChainId);
          
          if (currentChainId !== 1337) {
            alert(`❌ 请切换到 Ganache 网络！\n\n当前网络 Chain ID: ${currentChainId}\n需要的 Chain ID: 1337\n\n📝 配置步骤：\n1. 打开 MetaMask\n2. 点击顶部网络下拉菜单\n3. 点击 "添加网络"\n4. 填写以下信息：\n   - 网络名称: Ganache\n   - RPC URL: http://localhost:8545\n   - 链 ID: 1337\n   - 货币符号: ETH\n5. 保存并切换到 Ganache 网络`);
            setLoading(false);
            return;
          }
        } catch (fetchError: any) {
          console.error('无法获取网络信息:', fetchError);
          alert(`❌ MetaMask 无法连接到区块链节点！\n\n错误: ${fetchError.message || 'Failed to fetch'}\n\n💡 请检查：\n1. Ganache 是否正在运行 (http://localhost:8545)\n2. MetaMask 是否已添加 Ganache 网络\n3. MetaMask 网络配置是否正确：\n   - RPC URL: http://localhost:8545\n   - 链 ID: 1337\n\n📝 如果已配置，请尝试：\n1. 在 MetaMask 中删除 Ganache 网络\n2. 重新添加网络\n3. 刷新页面`);
          setLoading(false);
          return;
        }
        
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const network = await provider.getNetwork();
        console.log('成功连接到网络:', network);
        
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        
        setProvider(provider);
        setSigner(signer);
        setAccount(address);
        
        console.log('✅ 成功连接钱包');
        console.log('   地址:', address);
        console.log('   合约地址:', CONTRACT_ADDRESSES);
        
        // 初始化合约
        const betTokenContract = new ethers.Contract(CONTRACT_ADDRESSES.BetToken, BetTokenArtifact.abi, signer);
        const bettingSystemContract = new ethers.Contract(CONTRACT_ADDRESSES.BettingSystem, BettingSystemArtifact.abi, signer);
        
        setBetToken(betTokenContract);
        setBettingSystem(bettingSystemContract);
        
        // 验证合约是否存在
        console.log('检查合约部署状态...');
        const betTokenCode = await provider.getCode(CONTRACT_ADDRESSES.BetToken);
        if (betTokenCode === '0x') {
          alert('❌ 合约未部署！\n\n请在 contracts 目录运行：\nnpx hardhat run scripts/deploy.ts --network ganache\n\n然后运行：\nnode scripts/copy-artifacts.js\nnode scripts/update-frontend-config.js');
          setLoading(false);
          return;
        }
        console.log('✅ 合约已部署');
        
        // 加载余额和信息
        console.log('加载账户信息...');
        await loadBalance(betTokenContract, address);
        await loadRemainingClaims(betTokenContract, address);
        await loadProjects(bettingSystemContract);
        await loadContractBalance(bettingSystemContract);
        
        console.log('✅ 钱包连接成功！');
        setLoading(false);
      } catch (error: any) {
        console.error('连接钱包失败:', error);
        alert('连接钱包失败: ' + (error.message || '请检查MetaMask是否已安装'));
        setLoading(false);
      }
    } else {
      alert('请先安装 MetaMask!');
    }
  };

  // 加载余额
  const loadBalance = async (contract: ethers.Contract | null, address: string) => {
    if (!contract) return;
    try {
      const bal = await contract.balanceOf(address);
      setBalance(ethers.utils.formatEther(bal));
    } catch (error) {
      console.error('加载余额失败:', error);
    }
  };

  // 加载剩余领取次数
  const loadRemainingClaims = async (contract: ethers.Contract | null, address: string) => {
    if (!contract) return;
    try {
      const claims = await contract.getRemainingClaims(address);
      setRemainingClaims(claims.toNumber());
    } catch (error) {
      console.error('加载剩余领取次数失败:', error);
    }
  };

  // 加载合约余额
  const loadContractBalance = async (contract: ethers.Contract | null) => {
    if (!contract) return;
    try {
      const balance = await contract.getContractBalance();
      setContractBalance(ethers.utils.formatEther(balance));
    } catch (error) {
      console.error('加载合约余额失败:', error);
    }
  };

  // 切换账户时更新
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          loadBalance(betToken, accounts[0]);
          loadRemainingClaims(betToken, accounts[0]);
          loadProjects(bettingSystem);
        } else {
          setAccount('');
        }
      });
    }
  }, [betToken, bettingSystem]);

  // 领取代币
  const claimTokens = async () => {
    if (!betToken) return;
    
    try {
      setLoading(true);
      console.log('开始领取代币...');
      
      // 先检查剩余次数
      const remaining = await betToken.getRemainingClaims(account);
      console.log('剩余领取次数:', remaining.toString());
      
      if (remaining.toNumber() === 0) {
        alert('您已达到最大领取次数！');
        setLoading(false);
        return;
      }
      
      const tx = await betToken.claimTokens({ gasLimit: 300000 });
      console.log('交易已发送:', tx.hash);
      await tx.wait();
      console.log('交易已确认');
      
      alert('领取成功！获得 1000 BET 代币');
      await loadBalance(betToken, account);
      await loadRemainingClaims(betToken, account);
      setLoading(false);
    } catch (error: any) {
      console.error('领取失败详情:', error);
      
      let errorMsg = '领取失败: ';
      if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        errorMsg += '交易会失败。可能原因：已达到最大领取次数';
      } else if (error.message) {
        errorMsg += error.message;
      } else {
        errorMsg += '未知错误';
      }
      
      alert(errorMsg);
      setLoading(false);
    }
  };

  // 加载所有项目
  const loadProjects = async (contract: ethers.Contract | null) => {
    if (!contract) {
      console.log('合约未初始化，无法加载项目');
      return;
    }
    try {
      console.log('开始加载项目列表...');
      const count = await contract.getProjectCount();
      console.log('项目总数:', count.toString());
      
      const projectsData: Project[] = [];
      
      for (let i = 1; i <= count.toNumber(); i++) {
        try {
          const info = await contract.getProjectInfo(i);
          
          // 处理 winningOption：如果是 type(uint256).max，表示未结算，使用 -1
          let winningOption = -1;
          try {
            // 检查是否为最大值（未结算状态）
            const maxUint256 = ethers.constants.MaxUint256;
            if (info.winningOption.eq(maxUint256)) {
              winningOption = -1; // 使用 -1 表示未结算
            } else {
              winningOption = info.winningOption.toNumber();
            }
          } catch (e) {
            console.log(`项目 #${i} winningOption 转换失败，使用默认值 -1`);
            winningOption = -1;
          }
          
          // 确保 status 是数字类型
          const status = typeof info.status === 'number' ? info.status : parseInt(info.status.toString());
          
          const deadlineNum = info.deadline.toNumber();
          const now = Date.now() / 1000;
          const isExpired = now >= deadlineNum;
          
          projectsData.push({
            id: i,
            name: info.name,
            description: info.description,
            options: info.options,
            deadline: deadlineNum,
            baseReward: ethers.utils.formatEther(info.baseReward),
            totalPool: ethers.utils.formatEther(info.totalPool),
            status: status,
            creator: info.creator,
            winningOption: winningOption
          });
          console.log(`✅ 成功加载项目 #${i}: ${info.name}, 状态: ${status}, 已过期: ${isExpired}`);
        } catch (error) {
          console.error(`❌ 加载项目 ${i} 失败:`, error);
        }
      }
      
      setProjects(projectsData);
      console.log(`✅ 项目列表加载完成，共 ${projectsData.length} 个项目`);
    } catch (error) {
      console.error('❌ 加载项目失败:', error);
    }
  };

  // 创建项目
  const createProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!bettingSystem || !betToken) return;
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const optionsStr = formData.get('options') as string;
    const deadlineStr = formData.get('deadline') as string;
    const baseReward = formData.get('baseReward') as string;
    
    // 验证输入
    if (!name || !description || !optionsStr || !deadlineStr || !baseReward) {
      alert('请填写所有必填字段！');
      return;
    }
    
    const options = optionsStr.split(',').map(o => o.trim()).filter(o => o.length > 0);
    
    if (options.length < 2) {
      alert('至少需要2个选项！');
      return;
    }
    
    // 验证基础奖金
    const baseRewardNum = parseFloat(baseReward);
    if (isNaN(baseRewardNum) || baseRewardNum <= 0) {
      alert('基础奖金必须大于0！');
      return;
    }
    
    // 将选定的日期时间转换为时间戳
    const deadlineDate = new Date(deadlineStr);
    const nowDate = new Date();
    
    if (deadlineDate <= nowDate) {
      alert('截止时间必须在当前时间之后！');
      return;
    }
    
    const duration = Math.floor((deadlineDate.getTime() - nowDate.getTime()) / 1000);
    
    if (duration <= 0) {
      alert('持续时间必须大于0！');
      return;
    }
    
    try {
      setLoading(true);
      
      console.log('创建项目参数:', {
        name,
        description,
        options,
        duration,
        baseReward
      });
      
      // 批准代币
      const amount = ethers.utils.parseEther(baseReward);
      console.log('批准金额:', amount.toString());
      
      // 检查余额
      const balance = await betToken.balanceOf(account);
      console.log('当前余额:', ethers.utils.formatEther(balance));
      
      if (balance.lt(amount)) {
        alert('余额不足！请先领取代币。');
        setLoading(false);
        return;
      }
      
      const approveTx = await betToken.approve(CONTRACT_ADDRESSES.BettingSystem, amount, { gasLimit: 100000 });
      console.log('授权交易已发送:', approveTx.hash);
      await approveTx.wait();
      console.log('授权交易已确认');
      
      // 创建项目
      console.log('开始创建项目...');
      const tx = await bettingSystem.createProject(name, description, options, duration, amount, { gasLimit: 500000 });
      console.log('创建交易已发送:', tx.hash);
      await tx.wait();
      console.log('创建交易已确认');
      
      alert('项目创建成功！');
      form.reset();
      await loadProjects(bettingSystem);
      await loadBalance(betToken, account);
      setActiveTab('projects');
      setLoading(false);
    } catch (error: any) {
      console.error('创建项目失败详情:', error);
      let errorMessage = '创建项目失败: ';
      
      if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        errorMessage += '交易会失败。可能原因：\n';
        errorMessage += '1. 余额不足（需要基础奖金金额）\n';
        errorMessage += '2. 未授权 BettingSystem 合约\n';
        errorMessage += '3. 参数验证失败';
      } else if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        errorMessage = '用户取消了交易';
      } else if (error.message) {
        errorMessage += error.message;
      } else if (error.error && error.error.message) {
        errorMessage += error.error.message;
      } else {
        errorMessage += '未知错误';
      }
      
      alert(errorMessage);
      setLoading(false);
    }
  };

  // 购买彩票
  const purchaseTicket = async (projectId: number, optionIndex: number, amount: string) => {
    if (!bettingSystem || !betToken) return;
    
    // 验证输入
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('请输入有效的购买金额！');
      return;
    }
    
    const amountWei = ethers.utils.parseEther(amount);
    const minAmount = ethers.utils.parseEther('1');
    
    if (amountWei.lt(minAmount)) {
      alert('最小购买金额为 1 BET！');
      return;
    }
    
    try {
      setLoading(true);
      
      // 检查余额
      const balance = await betToken.balanceOf(account);
      if (balance.lt(amountWei)) {
        alert('余额不足！请先领取代币。');
        setLoading(false);
        return;
      }
      
      // 批准代币
      const approveTx = await betToken.approve(CONTRACT_ADDRESSES.BettingSystem, amountWei, { gasLimit: 100000 });
      await approveTx.wait();
      
      // 购买彩票
      const tx = await bettingSystem.purchaseTicket(projectId, optionIndex, amountWei, { gasLimit: 500000 });
      await tx.wait();
      
      alert(`购买成功！已投注 ${amount} BET`);
      await loadBalance(betToken, account);
      await loadProjects(bettingSystem);
      setLoading(false);
    } catch (error: any) {
      console.error('购买失败:', error);
      
      let errorMsg = '购买失败: ';
      if (error.message && error.message.includes('deadline passed')) {
        errorMsg = '购买失败：项目已截止！请查看其他进行中的项目。';
      } else if (error.message && error.message.includes('creator cannot purchase')) {
        errorMsg = '购买失败：项目创建者（公证人）不能购买自己创建的项目！这是为了确保公平性。';
      } else if (error.message) {
        errorMsg += error.message;
      } else {
        errorMsg += '未知错误';
      }
      
      alert(errorMsg);
      setLoading(false);
    }
  };

  // 加载我的持仓
  const loadMyPositions = async () => {
    if (!bettingSystem) return;
    
    try {
      const positionsData: Position[] = [];
      
      // 遍历所有项目
      for (const project of projects) {
        const userPositions = await bettingSystem.getUserAllPositions(project.id, account);
        
        // 遍历每个选项
        for (let i = 0; i < userPositions.length; i++) {
          const amount = userPositions[i];
          if (amount.gt(0)) {
            positionsData.push({
              projectId: project.id,
              optionIndex: i,
              amount: ethers.utils.formatEther(amount),
              optionName: project.options[i],
              projectName: project.name,
              projectStatus: project.status,
              winningOption: project.winningOption
            });
          }
        }
      }
      
      setMyPositions(positionsData);
    } catch (error) {
      console.error('加载持仓失败:', error);
    }
  };

  // 创建出售订单（部分出售）
  const createSellOrder = async (projectId: number, optionIndex: number, amount: string, price: string) => {
    if (!bettingSystem) return;
    
    const amountNum = parseFloat(amount);
    const priceNum = parseFloat(price);
    
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('请输入有效的出售数量！');
      return;
    }
    
    if (isNaN(priceNum) || priceNum <= 0) {
      alert('请输入有效的价格！');
      return;
    }
    
    try {
      setLoading(true);
      
      const amountWei = ethers.utils.parseEther(amount);
      const priceWei = ethers.utils.parseEther(price);
      
      // 创建订单
      const tx = await bettingSystem.createSellOrder(projectId, optionIndex, amountWei, priceWei, { gasLimit: 300000 });
      await tx.wait();
      
      alert('挂单成功！');
      await loadMyPositions();
      setLoading(false);
    } catch (error: any) {
      console.error('挂单失败:', error);
      alert('挂单失败: ' + (error.message || '未知错误'));
      setLoading(false);
    }
  };

  // 加载订单簿
  const loadOrders = async (projectId: number) => {
    if (!bettingSystem) return;
    
    try {
      const ordersData = await bettingSystem.getProjectOrders(projectId);
      const formattedOrders = ordersData.map((order: any) => ({
        orderId: order.orderId.toNumber(),
        projectId: order.projectId.toNumber(),
        optionIndex: order.optionIndex.toNumber(),
        seller: order.seller,
        amount: ethers.utils.formatEther(order.amount),
        price: ethers.utils.formatEther(order.price),
        isActive: order.isActive
      }));
      
      setOrders(formattedOrders);
      setSelectedProject(projectId);
    } catch (error) {
      console.error('加载订单失败:', error);
    }
  };

  // 购买订单中的彩票
  const buyFromOrder = async (orderId: number, price: string) => {
    if (!bettingSystem || !betToken) return;
    
    try {
      setLoading(true);
      
      // 批准代币
      const priceWei = ethers.utils.parseEther(price);
      const approveTx = await betToken.approve(CONTRACT_ADDRESSES.BettingSystem, priceWei, { gasLimit: 100000 });
      await approveTx.wait();
      
      // 购买
      const tx = await bettingSystem.buyTicketFromOrder(orderId, { gasLimit: 500000 });
      await tx.wait();
      
      alert('购买成功！');
      await loadBalance(betToken, account);
      if (selectedProject) await loadOrders(selectedProject);
      setLoading(false);
    } catch (error: any) {
      console.error('购买失败:', error);
      let errorMsg = '购买失败: ';
      if (error.message && error.message.includes('creator cannot purchase')) {
        errorMsg = '购买失败：项目创建者（公证人）不能购买自己创建的项目的彩票！';
      } else if (error.message) {
        errorMsg += error.message;
      } else {
        errorMsg += '未知错误';
      }
      alert(errorMsg);
      setLoading(false);
    }
  };

  // 取消订单
  const cancelOrder = async (orderId: number) => {
    if (!bettingSystem) return;
    
    try {
      setLoading(true);
      const tx = await bettingSystem.cancelOrder(orderId, { gasLimit: 300000 });
      await tx.wait();
      
      alert('订单已取消，额度已返还！');
      await loadMyPositions();
      if (selectedProject) await loadOrders(selectedProject);
      setLoading(false);
    } catch (error: any) {
      console.error('取消订单失败:', error);
      alert('取消订单失败: ' + (error.message || '未知错误'));
      setLoading(false);
    }
  };

  // 结算项目
  const settleProject = async (projectId: number, winningOption: number) => {
    if (!bettingSystem) return;
    
    try {
      setLoading(true);
      const tx = await bettingSystem.settleProject(projectId, winningOption, { gasLimit: 300000 });
      await tx.wait();
      
      alert('结算成功！');
      await loadProjects(bettingSystem);
      setLoading(false);
    } catch (error: any) {
      console.error('结算失败:', error);
      alert('结算失败: ' + (error.message || '未知错误'));
      setLoading(false);
    }
  };

  // 管理员提取资金
  const adminWithdraw = async (amount: string) => {
    if (!bettingSystem) return;
    
    try {
      setLoading(true);
      console.log('提取金额:', amount);
      
      const withdrawAmount = amount === '' || parseFloat(amount) === 0 
        ? ethers.constants.Zero 
        : ethers.utils.parseEther(amount);
      
      const tx = await bettingSystem.adminWithdraw(withdrawAmount, { gasLimit: 300000 });
      console.log('交易已发送:', tx.hash);
      await tx.wait();
      console.log('交易已确认');
      
      alert('提取成功！');
      await loadBalance(betToken, account);
      await loadContractBalance(bettingSystem);
      setLoading(false);
    } catch (error: any) {
      console.error('提取失败:', error);
      alert('提取失败: ' + (error.message || '未知错误'));
      setLoading(false);
    }
  };

  // 领取奖励
  const claimReward = async (projectId: number, optionIndex: number) => {
    if (!bettingSystem) return;
    
    try {
      setLoading(true);
      const tx = await bettingSystem.claimReward(projectId, optionIndex, { gasLimit: 500000 });
      await tx.wait();
      
      alert('领取奖励成功！');
      await loadBalance(betToken, account);
      await loadMyPositions();
      setLoading(false);
    } catch (error: any) {
      console.error('领取失败:', error);
      let errorMsg = '领取失败: ';
      if (error.message && error.message.includes('already claimed')) {
        errorMsg = '您已经领取过该奖励！';
      } else if (error.message) {
        errorMsg += error.message;
      } else {
        errorMsg += '未知错误';
      }
      alert(errorMsg);
      setLoading(false);
    }
  };

  // 当切换到"我的持仓"标签时加载
  useEffect(() => {
    if (activeTab === 'myPositions' && bettingSystem && account && projects.length > 0) {
      loadMyPositions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, bettingSystem, account, projects]);

  // 格式化时间
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取状态文本
  const getStatusText = (status: number) => {
    switch(status) {
      case 0: return '进行中';
      case 1: return '待结算';
      case 2: return '已结算';
      case 3: return '已取消';
      default: return '未知';
    }
  };

  // 获取项目真实状态（考虑截止时间）
  const getProjectRealStatus = (project: Project): number => {
    if (project.status === 0) {
      const now = Date.now() / 1000;
      if (now >= project.deadline) {
        return 1; // 待结算
      }
    }
    return project.status;
  };

  // 获取最小日期时间（当前时间）
  const getMinDateTime = () => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  };

  const showHelp = () => {
    alert(`🔧 MetaMask 配置帮助\n\n` +
      `如果遇到 "Failed to fetch" 错误，请按以下步骤配置：\n\n` +
      `1️⃣ 添加 Ganache 网络到 MetaMask：\n` +
      `   • 打开 MetaMask\n` +
      `   • 点击顶部网络下拉菜单\n` +
      `   • 点击 "添加网络"\n` +
      `   • 填写：\n` +
      `     - 网络名称: Ganache\n` +
      `     - RPC URL: http://localhost:8545\n` +
      `     - 链 ID: 1337\n` +
      `     - 货币符号: ETH\n\n` +
      `2️⃣ 导入 Ganache 账户：\n` +
      `   管理员私钥：\n` +
      `   0x27e580d6a9466dfc12d9283dc7411b381897e4eb19b46d6d59e1e886ccbd4f89\n\n` +
      `3️⃣ 确保切换到 Ganache 网络\n\n` +
      `4️⃣ 刷新页面并点击 "连接钱包"\n\n` +
      `💡 更多帮助请查看 MetaMask配置指南.md`
    );
  };

  return (
    <div className="App">
      <header className="header">
        <div className="header-left">
          <h1>🎰 去中心化彩票系统</h1>
          {isAdmin && account && (
            <div className="admin-badge">
              <span className="badge-icon">👑</span>
              <span className="badge-text">管理员（公证人）</span>
            </div>
          )}
        </div>
        <div className="header-info">
          {account ? (
            <>
              <div className="account-info">
                <p><strong>账户:</strong> {account.substring(0, 6)}...{account.substring(38)}</p>
                <p><strong>余额:</strong> {parseFloat(balance).toFixed(2)} BET</p>
                <p><strong>可领取:</strong> {remainingClaims} 次</p>
              </div>
              {remainingClaims > 0 && (
                <button onClick={claimTokens} disabled={loading} className="btn btn-success">
                  💰 领取代币
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={connectWallet} className="btn btn-primary btn-large">
                🔗 连接钱包
              </button>
              <button onClick={showHelp} className="btn btn-secondary btn-large" style={{marginLeft: '10px'}}>
                ❓ 配置帮助
              </button>
            </>
          )}
        </div>
      </header>

      {account && (
        <div className="main-content">
          <nav className="tabs">
            <button 
              className={activeTab === 'projects' ? 'active' : ''} 
              onClick={() => setActiveTab('projects')}
            >
              📋 所有项目
            </button>
            {isAdmin && (
              <button 
                className={activeTab === 'create' ? 'active' : ''} 
                onClick={() => setActiveTab('create')}
              >
                ➕ 创建项目
              </button>
            )}
            <button 
              className={activeTab === 'myPositions' ? 'active' : ''} 
              onClick={() => setActiveTab('myPositions')}
            >
              💼 我的持仓
            </button>
            <button 
              className={activeTab === 'market' ? 'active' : ''} 
              onClick={() => setActiveTab('market')}
            >
              🛒 交易市场
            </button>
            {isAdmin && (
              <button 
                className={activeTab === 'admin' ? 'active' : ''} 
                onClick={() => setActiveTab('admin')}
              >
                👑 管理员
              </button>
            )}
          </nav>

          <div className="content">
            {activeTab === 'projects' && (
              <div className="projects-list">
                <div className="section-header">
                  <h2>🏆 竞猜项目</h2>
                  <button 
                    onClick={() => loadProjects(bettingSystem)} 
                    disabled={loading}
                    className="btn btn-secondary btn-small"
                    style={{marginLeft: 'auto'}}
                  >
                    🔄 刷新列表
                  </button>
                </div>
                {projects.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <p>暂无竞猜项目</p>
                    {isAdmin && <p className="empty-hint">作为管理员，您可以创建新的竞猜项目</p>}
                  </div>
                ) : (
                  // 按状态排序：进行中 > 待结算 > 已结算
                  [...projects].sort((a, b) => {
                    const statusA = getProjectRealStatus(a);
                    const statusB = getProjectRealStatus(b);
                    return statusA - statusB;
                  }).map(project => {
                    const realStatus = getProjectRealStatus(project);
                    return (
                    <div key={project.id} className="project-card">
                      <div className="project-header">
                        <div>
                          <h3>#{project.id} {project.name}</h3>
                          {project.creator.toLowerCase() === account.toLowerCase() && (
                            <span className="creator-badge">我创建的</span>
                          )}
                        </div>
                        <span className={`status status-${realStatus}`}>
                          {getStatusText(realStatus)}
                        </span>
                      </div>
                      <p className="project-description">{project.description}</p>
                      <div className="project-info">
                        <div className="info-item">
                          <span className="info-label">⏰ 截止时间</span>
                          <span className="info-value">{formatDate(project.deadline)}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">💰 基础奖金</span>
                          <span className="info-value">{parseFloat(project.baseReward).toFixed(2)} BET</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">🏆 总奖池</span>
                          <span className="info-value highlight">{parseFloat(project.totalPool).toFixed(2)} BET</span>
                        </div>
                      </div>
                      
                      {realStatus === 0 && (
                        <div className="options">
                          <h4>🎯 选择您看好的选项并投注：</h4>
                          <div className="options-grid">
                            {project.options.map((option, index) => (
                              <div key={index} className="option-card">
                                <div className="option-name">{option}</div>
                                <input 
                                  type="number" 
                                  id={`buy-amount-${project.id}-${index}`}
                                  placeholder="投注金额（BET）" 
                                  min="1"
                                  step="0.01"
                                  className="amount-input"
                                />
                                <button 
                                  onClick={() => {
                                    const input = document.getElementById(`buy-amount-${project.id}-${index}`) as HTMLInputElement;
                                    if (input.value) {
                                      purchaseTicket(project.id, index, input.value);
                                    } else {
                                      alert('请输入投注金额！');
                                    }
                                  }}
                                  disabled={loading}
                                  className="btn btn-primary btn-small"
                                >
                                  💰 投注
                                </button>
                              </div>
                            ))}
                          </div>
                          <p className="hint-text" style={{marginTop: '1rem', textAlign: 'center'}}>
                            💡 最小投注金额：1 BET
                          </p>
                        </div>
                      )}

                      {realStatus === 1 && project.creator.toLowerCase() !== account.toLowerCase() && (
                        <div className="pending-notice">
                          <span className="notice-icon">⏳</span>
                          <span>项目已截止，等待公证人结算...</span>
                        </div>
                      )}

                      {(realStatus === 0 || realStatus === 1) && project.creator.toLowerCase() === account.toLowerCase() && (
                        <div className="settle-section">
                          <h4>⚖️ 结算项目（公证人权限）：</h4>
                          <div className="settle-options">
                            {project.options.map((option, index) => (
                              <button
                                key={index}
                                onClick={() => settleProject(project.id, index)}
                                disabled={loading}
                                className="btn btn-warning btn-small"
                              >
                                选择 "{option}" 获胜
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {realStatus === 2 && project.winningOption >= 0 && (
                        <div className="winner-info">
                          <span className="winner-icon">🎊</span>
                          <strong>获胜选项：</strong> {project.options[project.winningOption]}
                        </div>
                      )}
                    </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'create' && isAdmin && (
              <div className="create-project">
                <h2>➕ 创建竞猜项目</h2>
                <div className="admin-notice">
                  <span className="notice-icon">👑</span>
                  <span>您正在以管理员身份创建竞猜项目</span>
                </div>
                <form onSubmit={createProject} className="project-form">
                  <div className="form-group">
                    <label>📝 项目名称</label>
                    <input 
                      type="text" 
                      name="name" 
                      required 
                      placeholder="例如：NBA 2024赛季 MVP 竞猜"
                      className="form-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>📄 项目描述</label>
                    <textarea 
                      name="description" 
                      required 
                      placeholder="详细描述竞猜规则和说明..."
                      className="form-textarea"
                      rows={4}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>🎯 竞猜选项（用逗号分隔，至少2个）</label>
                    <input 
                      type="text" 
                      name="options" 
                      required 
                      placeholder="例如：詹姆斯,库里,杜兰特,字母哥"
                      className="form-input"
                    />
                    <span className="form-hint">💡 提示：每个选项用英文逗号分隔</span>
                  </div>
                  
                  <div className="form-group">
                    <label>⏰ 截止时间</label>
                    <input 
                      type="datetime-local" 
                      name="deadline" 
                      required 
                      min={getMinDateTime()}
                      className="form-input"
                    />
                    <span className="form-hint">💡 设置竞猜项目的结束时间</span>
                  </div>
                  
                  <div className="form-group">
                    <label>💰 基础奖金（BET）</label>
                    <input 
                      type="number" 
                      name="baseReward" 
                      required 
                      placeholder="例如：1000"
                      min="1"
                      step="0.01"
                      className="form-input"
                    />
                    <span className="form-hint">💡 您作为公证人提供的初始奖金</span>
                  </div>
                  
                  <button type="submit" disabled={loading} className="btn btn-primary btn-large">
                    {loading ? '⏳ 创建中...' : '✨ 创建项目'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'myPositions' && (
              <div className="my-positions">
                <h2>💼 我的持仓</h2>
                {myPositions.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">💼</div>
                    <p>您还没有任何持仓</p>
                    <p className="empty-hint">前往"所有项目"投注吧！</p>
                  </div>
                ) : (
                  <div className="positions-grid">
                    {myPositions.map((position, idx) => {
                      const realStatus = position.projectStatus === 0 && Date.now() / 1000 >= projects.find(p => p.id === position.projectId)?.deadline! ? 1 : position.projectStatus;
                      
                      return (
                        <div key={`${position.projectId}-${position.optionIndex}-${idx}`} className="position-card">
                          <div className="position-header">
                            <h3>💼 持仓</h3>
                            <span className={`status status-${realStatus}`}>
                              {getStatusText(realStatus)}
                            </span>
                          </div>
                          <div className="position-info">
                            <p><strong>项目：</strong>{position.projectName}</p>
                            <p><strong>选项：</strong><span className="highlight">{position.optionName}</span></p>
                            <p><strong>持仓量：</strong><span className="highlight">{parseFloat(position.amount).toFixed(2)} BET</span></p>
                          </div>
                          
                          {realStatus === 0 && (
                            <div className="position-actions">
                              <h4>🏷️ 挂单出售（可部分出售）</h4>
                              <input 
                                type="number" 
                                id={`sell-amount-${position.projectId}-${position.optionIndex}`}
                                placeholder={`出售数量（最多${parseFloat(position.amount).toFixed(2)}）`}
                                min="0.01"
                                max={position.amount}
                                step="0.01"
                                className="amount-input"
                              />
                              <input 
                                type="number" 
                                id={`sell-price-${position.projectId}-${position.optionIndex}`}
                                placeholder="要价（BET）" 
                                min="0.01"
                                step="0.01"
                                className="amount-input"
                              />
                              <button 
                                onClick={() => {
                                  const amountInput = document.getElementById(`sell-amount-${position.projectId}-${position.optionIndex}`) as HTMLInputElement;
                                  const priceInput = document.getElementById(`sell-price-${position.projectId}-${position.optionIndex}`) as HTMLInputElement;
                                  if (amountInput.value && priceInput.value) {
                                    const sellAmount = parseFloat(amountInput.value);
                                    const posAmount = parseFloat(position.amount);
                                    if (sellAmount > posAmount) {
                                      alert(`出售数量不能超过持仓量 ${posAmount.toFixed(2)} BET`);
                                      return;
                                    }
                                    createSellOrder(position.projectId, position.optionIndex, amountInput.value, priceInput.value);
                                    amountInput.value = '';
                                    priceInput.value = '';
                                  } else {
                                    alert('请输入出售数量和要价！');
                                  }
                                }}
                                disabled={loading}
                                className="btn btn-warning"
                              >
                                🏷️ 创建卖单
                              </button>
                              <p className="hint-text" style={{marginTop: '0.5rem', fontSize: '0.85rem'}}>
                                💡 提示：项目结束时，未成交的订单会自动取消并返还额度
                              </p>
                            </div>
                          )}

                          {realStatus === 2 && position.winningOption >= 0 && position.winningOption === position.optionIndex && (
                            <button 
                              onClick={() => claimReward(position.projectId, position.optionIndex)}
                              disabled={loading}
                              className="btn btn-success"
                            >
                              🎉 领取奖励
                            </button>
                          )}

                          {realStatus === 2 && position.winningOption >= 0 && position.winningOption !== position.optionIndex && (
                            <div className="lose-message">
                              😢 很遗憾，未中奖
                            </div>
                          )}

                          {realStatus === 1 && (
                            <div className="pending-notice">
                              <span className="notice-icon">⏳</span>
                              <span>等待结算...</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'admin' && isAdmin && (
              <div className="admin-panel">
                <h2>👑 管理员面板</h2>
                <div className="admin-info-card">
                  <div className="admin-info-item">
                    <span className="info-label">💰 合约余额</span>
                    <span className="info-value highlight">{parseFloat(contractBalance).toFixed(2)} BET</span>
                  </div>
                  <div className="admin-info-item">
                    <span className="info-label">👤 您的余额</span>
                    <span className="info-value">{parseFloat(balance).toFixed(2)} BET</span>
                  </div>
                </div>

                <div className="admin-actions">
                  <h3>💸 提取资金</h3>
                  <p className="hint-text">作为管理员，您可以从合约中提取代币</p>
                  <div className="withdraw-form">
                    <input 
                      type="number" 
                      id="withdraw-amount"
                      placeholder="输入金额（留空提取全部）" 
                      min="0"
                      step="0.01"
                      className="form-input"
                    />
                    <button 
                      onClick={() => {
                        const input = document.getElementById('withdraw-amount') as HTMLInputElement;
                        adminWithdraw(input.value);
                        input.value = '';
                      }}
                      disabled={loading || parseFloat(contractBalance) === 0}
                      className="btn btn-success"
                    >
                      💰 提取资金
                    </button>
                  </div>
                </div>

                <div className="admin-actions">
                  <h3>🔄 快速操作</h3>
                  <div className="quick-actions">
                    <button 
                      onClick={() => loadProjects(bettingSystem)}
                      disabled={loading}
                      className="btn btn-secondary"
                    >
                      🔄 刷新项目列表
                    </button>
                    <button 
                      onClick={() => loadContractBalance(bettingSystem)}
                      disabled={loading}
                      className="btn btn-secondary"
                    >
                      💰 刷新合约余额
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'market' && (
              <div className="market">
                <h2>🛒 彩票交易市场</h2>
                <div className="market-selector">
                  <label>📋 选择项目查看订单簿：</label>
                  <select 
                    onChange={(e) => {
                      const projectId = parseInt(e.target.value);
                      if (projectId) loadOrders(projectId);
                    }}
                    defaultValue=""
                    className="form-select"
                  >
                    <option value="" disabled>请选择一个竞猜项目</option>
                    {projects.filter(p => p.status === 0).map(project => (
                      <option key={project.id} value={project.id}>
                        #{project.id} {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProject && (
                  <div className="orders-list">
                    <h3>📊 订单簿</h3>
                    {orders.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <p>该项目暂无挂单</p>
                      </div>
                    ) : (
                      <div className="orders-table">
                        <div className="table-header">
                          <span>订单ID</span>
                          <span>选项</span>
                          <span>数量 (BET)</span>
                          <span>卖家地址</span>
                          <span>要价 (BET)</span>
                          <span>操作</span>
                        </div>
                        {orders.map(order => {
                          const project = projects.find(p => p.id === order.projectId);
                          const optionName = project?.options[order.optionIndex] || '未知';
                          
                          return (
                            <div key={order.orderId} className="table-row">
                              <span>#{order.orderId}</span>
                              <span className="option-cell">{optionName}</span>
                              <span className="amount-cell">{parseFloat(order.amount).toFixed(2)}</span>
                              <span className="address-cell">
                                {order.seller.substring(0, 6)}...{order.seller.substring(38)}
                              </span>
                              <span className="price-cell">{parseFloat(order.price).toFixed(2)}</span>
                              <span>
                                {order.seller.toLowerCase() !== account.toLowerCase() ? (
                                  <button 
                                    onClick={() => buyFromOrder(order.orderId, order.price)}
                                    disabled={loading}
                                    className="btn btn-success btn-small"
                                  >
                                    💳 购买
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => {
                                      if (window.confirm('确定要取消这个订单吗？额度将返还到您的持仓。')) {
                                        cancelOrder(order.orderId);
                                      }
                                    }}
                                    disabled={loading}
                                    className="btn btn-warning btn-small"
                                  >
                                    ❌ 取消订单
                                  </button>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>⏳ 处理中，请稍候...</p>
        </div>
      )}
    </div>
  );
}

export default App;
