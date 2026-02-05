// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IAgentRegistry {
    struct AgentIdentity {
        address agentAddress;
        string name;
        string description;
        uint256 reputationScore;
        bool isActive;
        uint256 registeredAt;
    }

    function verifyAttestation(
        address agent,
        bytes32 instructionHash,
        uint256 deadline,
        bytes memory signature
    ) external returns (bool valid);

    function verifySignature(
        address agent,
        bytes32 messageHash,
        bytes memory signature
    ) external view returns (bool);

    function getAgentInfo(address agent) external view returns (AgentIdentity memory);

    function isAuthorized(address agent) external view returns (bool);

    function getNonce(address agent) external view returns (uint256);
}
