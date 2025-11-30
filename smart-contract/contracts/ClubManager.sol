// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ClubManager {
    struct Club {
        string name;
        address admin;
        uint256 balance;
        address[] members;
        mapping(address => bool) isMember;
    }

    uint256 public clubCount;
    mapping(uint256 => Club) private clubs;

    event ClubCreated(uint256 indexed clubId, string name, address admin);
    event MemberJoined(uint256 indexed clubId, address member);
    event FeePaid(uint256 indexed clubId, address from, uint256 amount);

    modifier clubExists(uint256 clubId) {
        require(bytes(clubs[clubId].name).length != 0, "Club does not exist");
        _;
    }

    modifier onlyMember(uint256 clubId) {
        require(clubs[clubId].isMember[msg.sender], "Not a member");
        _;
    }

    // --- 동아리 생성 ---
    function createClub(string memory name) external returns (uint256) {
        require(bytes(name).length > 0, "Name required");

        clubCount += 1;
        uint256 clubId = clubCount;

        Club storage club = clubs[clubId];
        club.name = name;
        club.admin = msg.sender;

        // 생성자는 자동 멤버 등록
        club.isMember[msg.sender] = true;
        club.members.push(msg.sender);

        emit ClubCreated(clubId, name, msg.sender);
        emit MemberJoined(clubId, msg.sender);

        return clubId;
    }

    // --- 동아리 가입 ---
    function joinClub(uint256 clubId) external clubExists(clubId) {
        Club storage club = clubs[clubId];
        require(!club.isMember[msg.sender], "Already a member");

        club.isMember[msg.sender] = true;
        club.members.push(msg.sender);

        emit MemberJoined(clubId, msg.sender);
    }

    // --- 회비 입금 ---
    function payFee(
        uint256 clubId
    ) external payable clubExists(clubId) onlyMember(clubId) {
        require(msg.value > 0, "No value sent");

        Club storage club = clubs[clubId];
        club.balance += msg.value;

        emit FeePaid(clubId, msg.sender, msg.value);
    }

    // --- 정보 조회 ---
    function getClubInfo(
        uint256 clubId
    )
        external
        view
        clubExists(clubId)
        returns (
            string memory name,
            address admin,
            uint256 balance,
            uint256 memberCount
        )
    {
        Club storage club = clubs[clubId];
        return (club.name, club.admin, club.balance, club.members.length);
    }

    function getMembers(
        uint256 clubId
    ) external view clubExists(clubId) returns (address[] memory) {
        return clubs[clubId].members;
    }
}
