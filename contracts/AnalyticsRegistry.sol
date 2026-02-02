// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract AnalyticsRegistry {
    struct Finding {
        uint256 timestamp;
        string category;
        string summary;
        bytes32 contentHash;
        string tweetUrl;
    }

    address public immutable analyst;
    Finding[] public findings;

    event NewFinding(uint256 indexed id, string category, string summary, bytes32 contentHash);
    event AnalystActive(uint256 timestamp, string message);

    modifier onlyAnalyst() {
        require(msg.sender == analyst, "not analyst");
        _;
    }

    constructor() {
        analyst = msg.sender;
        emit AnalystActive(block.timestamp, "Aria Onchain Analyst initialized");
    }

    function recordFinding(
        string calldata category,
        string calldata summary,
        bytes32 contentHash,
        string calldata tweetUrl
    ) external onlyAnalyst returns (uint256) {
        uint256 id = findings.length;
        findings.push(Finding({
            timestamp: block.timestamp,
            category: category,
            summary: summary,
            contentHash: contentHash,
            tweetUrl: tweetUrl
        }));
        emit NewFinding(id, category, summary, contentHash);
        return id;
    }

    function totalFindings() external view returns (uint256) {
        return findings.length;
    }

    function getLatestFindings(uint256 count) external view returns (Finding[] memory) {
        uint256 total = findings.length;
        if (count > total) count = total;
        Finding[] memory latest = new Finding[](count);
        for (uint256 i = 0; i < count; i++) {
            latest[i] = findings[total - count + i];
        }
        return latest;
    }

    function getFindingsByCategory(string calldata category) external view returns (uint256[] memory) {
        uint256[] memory temp = new uint256[](findings.length);
        uint256 count = 0;
        for (uint256 i = 0; i < findings.length; i++) {
            if (keccak256(bytes(findings[i].category)) == keccak256(bytes(category))) {
                temp[count] = i;
                count++;
            }
        }
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = temp[i];
        }
        return result;
    }
}
