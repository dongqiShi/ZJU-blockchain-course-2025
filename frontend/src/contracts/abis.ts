// 导入合约ABI
// 注意：部署后需要从 ../../../contracts/artifacts/contracts 复制ABI

export const BetTokenABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function claimTokens() external",
  "function getRemainingClaims(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "event TokensClaimed(address indexed user, uint256 amount)"
];

export const BetTicketABI = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function balanceOf(address owner) view returns (uint256)",
  "function getTicketInfo(uint256 tokenId) view returns (uint256 projectId, uint256 optionIndex)",
  "function getTicketsOfOwner(address owner) view returns (uint256[])",
  "function approve(address to, uint256 tokenId)",
  "function setApprovalForAll(address operator, bool approved)",
  "function getApproved(uint256 tokenId) view returns (address)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "event TicketMinted(uint256 indexed tokenId, address indexed owner, uint256 indexed projectId, uint256 optionIndex)"
];

export const BettingSystemABI = [
  "function createProject(string name, string description, string[] options, uint256 duration, uint256 baseReward)",
  "function purchaseTicket(uint256 projectId, uint256 optionIndex) returns (uint256)",
  "function createSellOrder(uint256 ticketId, uint256 price) returns (uint256)",
  "function cancelOrder(uint256 orderId)",
  "function buyTicketFromOrder(uint256 orderId)",
  "function settleProject(uint256 projectId, uint256 winningOption)",
  "function claimReward(uint256 ticketId)",
  "function getProjectInfo(uint256 projectId) view returns (string name, string description, string[] options, uint256 deadline, uint256 baseReward, uint256 totalPool, uint8 status, address creator, uint256 winningOption)",
  "function getOptionStats(uint256 projectId, uint256 optionIndex) view returns (uint256 ticketCount, uint256 totalAmount)",
  "function getProjectOrders(uint256 projectId) view returns (tuple(uint256 orderId, uint256 ticketId, address seller, uint256 price, bool isActive)[])",
  "function getProjectCount() view returns (uint256)",
  "function TICKET_PRICE() view returns (uint256)",
  "event ProjectCreated(uint256 indexed projectId, string name, address indexed creator, uint256 baseReward, uint256 deadline)",
  "event TicketPurchased(uint256 indexed projectId, uint256 indexed ticketId, address indexed buyer, uint256 optionIndex, uint256 price)",
  "event OrderCreated(uint256 indexed orderId, uint256 indexed ticketId, address indexed seller, uint256 price)",
  "event TicketTraded(uint256 indexed orderId, uint256 indexed ticketId, address indexed buyer, address seller, uint256 price)",
  "event ProjectSettled(uint256 indexed projectId, uint256 winningOption, uint256 totalReward)",
  "event RewardClaimed(uint256 indexed projectId, uint256 indexed ticketId, address indexed winner, uint256 amount)"
];

