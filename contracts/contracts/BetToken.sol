// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BetToken
 * @dev ERC20代币用于彩票系统的积分
 * 用户可以领取免费积分用于购买彩票
 */
contract BetToken is ERC20, Ownable {
    // 每次领取的代币数量（1000个代币）
    uint256 public constant CLAIM_AMOUNT = 1000 * 10**18;
    
    // 每个地址可以领取的次数限制
    mapping(address => uint256) public claimCount;
    uint256 public constant MAX_CLAIMS = 10;
    
    // 领取事件
    event TokensClaimed(address indexed user, uint256 amount);
    
    constructor() ERC20("Bet Token", "BET") Ownable(msg.sender) {
        // 给合约部署者初始供应
        _mint(msg.sender, 1000000 * 10**18);
    }
    
    /**
     * @dev 用户领取免费代币
     */
    function claimTokens() external {
        require(claimCount[msg.sender] < MAX_CLAIMS, "Maximum claims reached");
        
        claimCount[msg.sender]++;
        _mint(msg.sender, CLAIM_AMOUNT);
        
        emit TokensClaimed(msg.sender, CLAIM_AMOUNT);
    }
    
    /**
     * @dev 检查用户剩余可领取次数
     */
    function getRemainingClaims(address user) external view returns (uint256) {
        return MAX_CLAIMS - claimCount[user];
    }
}

