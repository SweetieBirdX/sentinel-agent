// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title AgentRegistry
/// @notice Registry for AI agent identities with attestation verification
/// @dev Implements ERC-8004 inspired agent identity management
contract AgentRegistry is Ownable {
    using ECDSA for bytes32;

    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/

    struct AgentIdentity {
        address agentAddress;
        string name;
        string description;
        uint256 reputationScore;
        bool isActive;
        uint256 registeredAt;
    }

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Registered agents
    mapping(address => AgentIdentity) public agents;
    
    /// @notice Used attestation hashes (prevent replay attacks)
    mapping(bytes32 => bool) public usedAttestations;
    
    /// @notice Nonces for each agent (prevent replay)
    mapping(address => uint256) public agentNonces;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event AgentRegistered(address indexed agent, string name, uint256 timestamp);
    event AgentDeactivated(address indexed agent, uint256 timestamp);
    event AgentActivated(address indexed agent, uint256 timestamp);
    event AttestationVerified(address indexed agent, bytes32 attestationHash);
    event ReputationUpdated(address indexed agent, uint256 oldScore, uint256 newScore);

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor() Ownable(msg.sender) {}

    /*//////////////////////////////////////////////////////////////
                          REGISTRATION FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Register a new AI agent
    /// @param agent Address of the agent
    /// @param name Human-readable name
    /// @param description Agent capabilities description
    function registerAgent(
        address agent,
        string calldata name,
        string calldata description
    ) external onlyOwner {
        require(agent != address(0), "Invalid agent address");
        require(!agents[agent].isActive, "Agent already registered");
        require(bytes(name).length > 0, "Name required");

        agents[agent] = AgentIdentity({
            agentAddress: agent,
            name: name,
            description: description,
            reputationScore: 100, // Starting reputation
            isActive: true,
            registeredAt: block.timestamp
        });

        emit AgentRegistered(agent, name, block.timestamp);
    }

    /// @notice Deactivate an agent
    /// @param agent Address to deactivate
    function deactivateAgent(address agent) external onlyOwner {
        require(agents[agent].isActive, "Agent not active");
        agents[agent].isActive = false;
        emit AgentDeactivated(agent, block.timestamp);
    }

    /// @notice Reactivate an agent
    /// @param agent Address to reactivate
    function activateAgent(address agent) external onlyOwner {
        require(agents[agent].registeredAt > 0, "Agent not registered");
        require(!agents[agent].isActive, "Agent already active");
        agents[agent].isActive = true;
        emit AgentActivated(agent, block.timestamp);
    }

    /*//////////////////////////////////////////////////////////////
                        ATTESTATION VERIFICATION
    //////////////////////////////////////////////////////////////*/

    /// @notice Verify an agent's attestation
    /// @param agent Agent address
    /// @param instructionHash Hash of the instruction being attested
    /// @param deadline Expiration timestamp
    /// @param signature Agent's signature
    /// @return valid True if attestation is valid
    function verifyAttestation(
        address agent,
        bytes32 instructionHash,
        uint256 deadline,
        bytes memory signature
    ) external returns (bool valid) {
        require(agents[agent].isActive, "Agent not active");
        require(block.timestamp <= deadline, "Attestation expired");
        require(signature.length == 65, "Invalid signature length");

        // Create message hash
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                agent,
                instructionHash,
                agentNonces[agent],
                deadline,
                block.chainid
            )
        );

        // Check if already used
        require(!usedAttestations[messageHash], "Attestation already used");

        // Verify signature using MessageHashUtils for eth signed message
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address recovered = ECDSA.recover(ethSignedHash, signature);
        
        valid = (recovered == agent);
        
        if (valid) {
            usedAttestations[messageHash] = true;
            agentNonces[agent]++;
            emit AttestationVerified(agent, messageHash);
        }
    }

    /// @notice Simple signature verification (for beforeSwap quick check)
    /// @param agent Agent address
    /// @param messageHash Message that was signed
    /// @param signature Signature to verify
    /// @return True if signature is valid and agent is active
    function verifySignature(
        address agent,
        bytes32 messageHash,
        bytes memory signature
    ) external view returns (bool) {
        if (!agents[agent].isActive) return false;
        if (signature.length != 65) return false;
        
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address recovered = ECDSA.recover(ethSignedHash, signature);
        
        return recovered == agent;
    }

    /*//////////////////////////////////////////////////////////////
                        REPUTATION MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /// @notice Update agent reputation
    /// @param agent Address of agent
    /// @param newScore New reputation score
    function updateReputation(address agent, uint256 newScore) external onlyOwner {
        require(agents[agent].registeredAt > 0, "Agent not registered");
        uint256 oldScore = agents[agent].reputationScore;
        agents[agent].reputationScore = newScore;
        emit ReputationUpdated(agent, oldScore, newScore);
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Get complete agent information
    /// @param agent Address to query
    /// @return AgentIdentity struct
    function getAgentInfo(address agent) external view returns (AgentIdentity memory) {
        return agents[agent];
    }

    /// @notice Check if agent is authorized (active + good reputation)
    /// @param agent Address to check
    /// @return True if authorized
    function isAuthorized(address agent) external view returns (bool) {
        return agents[agent].isActive && agents[agent].reputationScore >= 50;
    }

    /// @notice Get agent's current nonce
    /// @param agent Address to query
    /// @return Current nonce value
    function getNonce(address agent) external view returns (uint256) {
        return agentNonces[agent];
    }

    /// @notice Check if agent exists (has been registered)
    /// @param agent Address to check
    /// @return True if agent has been registered
    function exists(address agent) external view returns (bool) {
        return agents[agent].registeredAt > 0;
    }
}
