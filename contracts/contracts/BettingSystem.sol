// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./BetToken.sol";

/**
 * @title BettingSystem
 * @dev 去中心化彩票系统主合约 - 基于金额的投注系统
 * 支持创建竞猜项目、任意金额购买彩票、部分出售和结算
 */
contract BettingSystem is Ownable, ReentrancyGuard {
    BetToken public betToken;
    
    uint256 private _projectIdCounter;
    uint256 private _orderIdCounter;
    
    // 项目状态枚举
    enum ProjectStatus { Active, PendingSettlement, Settled, Cancelled }
    
    // 竞猜项目结构
    struct Project {
        uint256 id;
        string name;
        string description;
        string[] options;
        uint256 deadline;
        uint256 baseReward;           // 公证人提供的基础奖金
        uint256 totalPool;            // 总奖池（基础奖金 + 购买金额）
        ProjectStatus status;
        address creator;              // 公证人地址
        uint256 winningOption;        // 获胜选项（未结算时为type(uint256).max）
        mapping(uint256 => uint256) optionTotalAmount;  // 每个选项的总投注额
    }
    
    // 用户持仓：projectId => user => optionIndex => amount
    mapping(uint256 => mapping(address => mapping(uint256 => uint256))) public userPositions;
    
    // 订单簿中的订单
    struct Order {
        uint256 orderId;
        uint256 projectId;
        uint256 optionIndex;
        address seller;
        uint256 amount;      // 出售的彩票金额
        uint256 price;       // 要价
        bool isActive;
    }
    
    mapping(uint256 => Project) public projects;
    mapping(uint256 => Order) public orders;
    
    // 每个项目的所有订单列表
    mapping(uint256 => uint256[]) public projectOrders;
    
    // 最小购买金额
    uint256 public constant MIN_BET_AMOUNT = 1 * 10**18;
    
    // 已领取奖励的记录
    mapping(uint256 => mapping(address => mapping(uint256 => bool))) public rewardClaimed;
    
    // 事件定义
    event ProjectCreated(
        uint256 indexed projectId,
        string name,
        address indexed creator,
        uint256 baseReward,
        uint256 deadline
    );
    
    event TicketPurchased(
        uint256 indexed projectId,
        address indexed buyer,
        uint256 optionIndex,
        uint256 amount
    );
    
    event OrderCreated(
        uint256 indexed orderId,
        uint256 indexed projectId,
        uint256 optionIndex,
        address indexed seller,
        uint256 amount,
        uint256 price
    );
    
    event OrderCancelled(
        uint256 indexed orderId
    );
    
    event TicketTraded(
        uint256 indexed orderId,
        uint256 indexed projectId,
        address indexed buyer,
        address seller,
        uint256 amount,
        uint256 price
    );
    
    event ProjectSettled(
        uint256 indexed projectId,
        uint256 winningOption,
        uint256 totalReward
    );
    
    event RewardClaimed(
        uint256 indexed projectId,
        address indexed winner,
        uint256 optionIndex,
        uint256 amount
    );
    
    event AdminWithdraw(
        address indexed admin,
        uint256 amount
    );
    
    constructor(address _betTokenAddress) Ownable(msg.sender) {
        betToken = BetToken(_betTokenAddress);
        _projectIdCounter = 1;
        _orderIdCounter = 1;
    }
    
    /**
     * @dev 创建新的竞猜项目（仅公证人）
     */
    function createProject(
        string memory name,
        string memory description,
        string[] memory options,
        uint256 duration,
        uint256 baseReward
    ) external {
        require(options.length >= 2, "At least 2 options required");
        require(baseReward > 0, "Base reward must be positive");
        require(duration > 0, "Duration must be positive");
        
        // 转移基础奖金到合约
        require(
            betToken.transferFrom(msg.sender, address(this), baseReward),
            "Failed to transfer base reward"
        );
        
        uint256 projectId = _projectIdCounter;
        _projectIdCounter++;
        
        Project storage newProject = projects[projectId];
        newProject.id = projectId;
        newProject.name = name;
        newProject.description = description;
        newProject.options = options;
        newProject.deadline = block.timestamp + duration;
        newProject.baseReward = baseReward;
        newProject.totalPool = baseReward;
        newProject.status = ProjectStatus.Active;
        newProject.creator = msg.sender;
        newProject.winningOption = type(uint256).max;
        
        emit ProjectCreated(projectId, name, msg.sender, baseReward, newProject.deadline);
    }
    
    /**
     * @dev 购买彩票（任意金额）
     */
    function purchaseTicket(uint256 projectId, uint256 optionIndex, uint256 amount) 
        external 
        nonReentrant 
    {
        Project storage project = projects[projectId];
        require(project.id != 0, "Project does not exist");
        require(project.status == ProjectStatus.Active, "Project is not active");
        require(block.timestamp < project.deadline, "Project deadline passed");
        require(optionIndex < project.options.length, "Invalid option");
        require(amount >= MIN_BET_AMOUNT, "Amount below minimum");
        require(msg.sender != project.creator, "Project creator cannot purchase");
        
        // 转移代币
        require(
            betToken.transferFrom(msg.sender, address(this), amount),
            "Failed to transfer tokens"
        );
        
        // 增加奖池和用户持仓
        project.totalPool += amount;
        project.optionTotalAmount[optionIndex] += amount;
        userPositions[projectId][msg.sender][optionIndex] += amount;
        
        emit TicketPurchased(projectId, msg.sender, optionIndex, amount);
    }
    
    /**
     * @dev 创建出售订单（部分出售）
     */
    function createSellOrder(uint256 projectId, uint256 optionIndex, uint256 amount, uint256 price) 
        external 
        returns (uint256) 
    {
        Project storage project = projects[projectId];
        require(project.id != 0, "Project does not exist");
        require(project.status == ProjectStatus.Active, "Project is not active");
        require(block.timestamp < project.deadline, "Project deadline passed");
        require(optionIndex < project.options.length, "Invalid option");
        require(amount > 0, "Amount must be positive");
        require(price > 0, "Price must be positive");
        require(userPositions[projectId][msg.sender][optionIndex] >= amount, "Insufficient position");
        
        // 锁定用户的持仓
        userPositions[projectId][msg.sender][optionIndex] -= amount;
        
        uint256 orderId = _orderIdCounter;
        _orderIdCounter++;
        
        orders[orderId] = Order({
            orderId: orderId,
            projectId: projectId,
            optionIndex: optionIndex,
            seller: msg.sender,
            amount: amount,
            price: price,
            isActive: true
        });
        
        projectOrders[projectId].push(orderId);
        
        emit OrderCreated(orderId, projectId, optionIndex, msg.sender, amount, price);
        
        return orderId;
    }
    
    /**
     * @dev 取消出售订单
     */
    function cancelOrder(uint256 orderId) external {
        Order storage order = orders[orderId];
        require(order.isActive, "Order is not active");
        require(order.seller == msg.sender, "Not order creator");
        
        // 归还持仓
        userPositions[order.projectId][msg.sender][order.optionIndex] += order.amount;
        
        order.isActive = false;
        
        emit OrderCancelled(orderId);
    }
    
    /**
     * @dev 购买挂单的彩票
     */
    function buyTicketFromOrder(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.isActive, "Order is not active");
        
        Project storage project = projects[order.projectId];
        require(project.status == ProjectStatus.Active, "Project is not active");
        require(block.timestamp < project.deadline, "Project deadline passed");
        require(msg.sender != project.creator, "Project creator cannot purchase");
        
        // 转移代币给卖家
        require(
            betToken.transferFrom(msg.sender, order.seller, order.price),
            "Failed to transfer payment"
        );
        
        // 转移持仓给买家
        userPositions[order.projectId][msg.sender][order.optionIndex] += order.amount;
        
        order.isActive = false;
        
        emit TicketTraded(orderId, order.projectId, msg.sender, order.seller, order.amount, order.price);
    }
    
    /**
     * @dev 结算项目（仅创建者）
     * 结算时会自动取消该项目所有未成交订单，并返还额度给卖家
     */
    function settleProject(uint256 projectId, uint256 winningOption) external {
        Project storage project = projects[projectId];
        require(project.id != 0, "Project does not exist");
        require(project.creator == msg.sender, "Only creator can settle");
        require(
            project.status == ProjectStatus.Active || project.status == ProjectStatus.PendingSettlement, 
            "Project already settled"
        );
        require(winningOption < project.options.length, "Invalid winning option");
        
        // 取消所有该项目的未成交订单，返还额度
        _cancelAllProjectOrders(projectId);
        
        project.status = ProjectStatus.Settled;
        project.winningOption = winningOption;
        
        emit ProjectSettled(projectId, winningOption, project.totalPool);
    }
    
    /**
     * @dev 内部函数：取消项目的所有未成交订单
     */
    function _cancelAllProjectOrders(uint256 projectId) internal {
        uint256[] memory orderIds = projectOrders[projectId];
        
        for (uint256 i = 0; i < orderIds.length; i++) {
            Order storage order = orders[orderIds[i]];
            if (order.isActive) {
                // 返还持仓给卖家
                userPositions[order.projectId][order.seller][order.optionIndex] += order.amount;
                order.isActive = false;
                emit OrderCancelled(orderIds[i]);
            }
        }
    }
    
    /**
     * @dev 领取奖励（获胜者）
     */
    function claimReward(uint256 projectId, uint256 optionIndex) external nonReentrant {
        Project storage project = projects[projectId];
        
        require(project.status == ProjectStatus.Settled, "Project not settled");
        require(project.winningOption == optionIndex, "Option did not win");
        require(!rewardClaimed[projectId][msg.sender][optionIndex], "Reward already claimed");
        
        uint256 userAmount = userPositions[projectId][msg.sender][optionIndex];
        require(userAmount > 0, "No position to claim");
        
        uint256 winningTotalAmount = project.optionTotalAmount[project.winningOption];
        require(winningTotalAmount > 0, "No winning amount");
        
        // 计算奖励：用户投注金额 / 总获胜金额 * 总奖池
        uint256 reward = (userAmount * project.totalPool) / winningTotalAmount;
        
        // 标记已领取
        rewardClaimed[projectId][msg.sender][optionIndex] = true;
        
        // 清空持仓
        userPositions[projectId][msg.sender][optionIndex] = 0;
        
        // 发放奖励
        require(
            betToken.transfer(msg.sender, reward),
            "Failed to transfer reward"
        );
        
        emit RewardClaimed(projectId, msg.sender, optionIndex, reward);
    }
    
    /**
     * @dev 获取项目基本信息
     */
    function getProjectInfo(uint256 projectId) 
        external 
        view 
        returns (
            string memory name,
            string memory description,
            string[] memory options,
            uint256 deadline,
            uint256 baseReward,
            uint256 totalPool,
            ProjectStatus status,
            address creator,
            uint256 winningOption
        ) 
    {
        Project storage project = projects[projectId];
        return (
            project.name,
            project.description,
            project.options,
            project.deadline,
            project.baseReward,
            project.totalPool,
            project.status,
            project.creator,
            project.winningOption
        );
    }
    
    /**
     * @dev 获取某个选项的统计信息
     */
    function getOptionStats(uint256 projectId, uint256 optionIndex)
        external
        view
        returns (uint256 totalAmount)
    {
        Project storage project = projects[projectId];
        return project.optionTotalAmount[optionIndex];
    }
    
    /**
     * @dev 获取用户在某个项目某个选项的持仓
     */
    function getUserPosition(uint256 projectId, address user, uint256 optionIndex)
        external
        view
        returns (uint256)
    {
        return userPositions[projectId][user][optionIndex];
    }
    
    /**
     * @dev 获取用户在某个项目所有选项的持仓
     */
    function getUserAllPositions(uint256 projectId, address user)
        external
        view
        returns (uint256[] memory)
    {
        Project storage project = projects[projectId];
        uint256[] memory positions = new uint256[](project.options.length);
        
        for (uint256 i = 0; i < project.options.length; i++) {
            positions[i] = userPositions[projectId][user][i];
        }
        
        return positions;
    }
    
    /**
     * @dev 获取项目的所有活跃订单
     */
    function getProjectOrders(uint256 projectId) 
        external 
        view 
        returns (Order[] memory) 
    {
        uint256[] memory orderIds = projectOrders[projectId];
        uint256 activeCount = 0;
        
        // 计算活跃订单数量
        for (uint256 i = 0; i < orderIds.length; i++) {
            if (orders[orderIds[i]].isActive) {
                activeCount++;
            }
        }
        
        // 构建活跃订单数组
        Order[] memory activeOrders = new Order[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < orderIds.length; i++) {
            if (orders[orderIds[i]].isActive) {
                activeOrders[index] = orders[orderIds[i]];
                index++;
            }
        }
        
        return activeOrders;
    }
    
    /**
     * @dev 获取所有项目数量
     */
    function getProjectCount() external view returns (uint256) {
        return _projectIdCounter - 1;
    }
    
    /**
     * @dev 管理员提取合约中的代币（仅合约拥有者）
     */
    function adminWithdraw(uint256 amount) external onlyOwner nonReentrant {
        uint256 contractBalance = betToken.balanceOf(address(this));
        require(contractBalance > 0, "No tokens to withdraw");
        
        uint256 withdrawAmount = amount;
        if (amount == 0 || amount > contractBalance) {
            withdrawAmount = contractBalance;
        }
        
        require(
            betToken.transfer(msg.sender, withdrawAmount),
            "Failed to transfer tokens"
        );
        
        emit AdminWithdraw(msg.sender, withdrawAmount);
    }
    
    /**
     * @dev 获取合约中的代币余额
     */
    function getContractBalance() external view returns (uint256) {
        return betToken.balanceOf(address(this));
    }
    
    /**
     * @dev 更新过期项目状态为待结算
     */
    function updateProjectStatus(uint256 projectId) external {
        Project storage project = projects[projectId];
        require(project.id != 0, "Project does not exist");
        
        if (project.status == ProjectStatus.Active && block.timestamp >= project.deadline) {
            project.status = ProjectStatus.PendingSettlement;
        }
    }
}
