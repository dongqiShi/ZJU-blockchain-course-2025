// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BetTicket
 * @dev ERC721代币作为彩票凭证
 * 每个彩票都是一个唯一的NFT
 */
contract BetTicket is ERC721, ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;
    
    // 彩票信息映射：tokenId => (projectId, optionIndex)
    struct TicketInfo {
        uint256 projectId;
        uint256 optionIndex;
    }
    
    mapping(uint256 => TicketInfo) public ticketInfo;
    
    // 彩票铸造事件
    event TicketMinted(
        uint256 indexed tokenId, 
        address indexed owner, 
        uint256 indexed projectId, 
        uint256 optionIndex
    );
    
    constructor() ERC721("Betting Ticket", "BTICKET") Ownable(msg.sender) {
        _tokenIdCounter = 1;
    }
    
    /**
     * @dev 铸造新彩票
     * @param to 彩票接收者
     * @param projectId 项目ID
     * @param optionIndex 选项索引
     * @return tokenId 新铸造的彩票ID
     */
    function mintTicket(
        address to, 
        uint256 projectId, 
        uint256 optionIndex
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(to, tokenId);
        
        ticketInfo[tokenId] = TicketInfo({
            projectId: projectId,
            optionIndex: optionIndex
        });
        
        emit TicketMinted(tokenId, to, projectId, optionIndex);
        
        return tokenId;
    }
    
    /**
     * @dev 获取彩票信息
     */
    function getTicketInfo(uint256 tokenId) 
        external 
        view 
        returns (uint256 projectId, uint256 optionIndex) 
    {
        TicketInfo memory info = ticketInfo[tokenId];
        return (info.projectId, info.optionIndex);
    }
    
    /**
     * @dev 获取用户拥有的所有彩票ID
     */
    function getTicketsOfOwner(address owner) 
        external 
        view 
        returns (uint256[] memory) 
    {
        uint256 balance = balanceOf(owner);
        uint256[] memory tickets = new uint256[](balance);
        uint256 index = 0;
        
        for (uint256 i = 1; i < _tokenIdCounter && index < balance; i++) {
            if (_ownerOf(i) == owner) {
                tickets[index] = i;
                index++;
            }
        }
        
        return tickets;
    }
    
    // 重写必需的函数
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

