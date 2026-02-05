// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

library HookMiner {
    /// @notice Find a salt that produces a hook address with the desired flags
    /// @param deployer The address that will deploy the hook (typically address(this) in tests)
    /// @param flags The required hook permission flags (must be in the last 14 bits)
    /// @param creationCode The contract's creation code (type(Contract).creationCode)
    /// @param constructorArgs The encoded constructor arguments
    /// @return hookAddress The address that will have the correct flags
    /// @return salt The salt to use with CREATE2
    function find(
        address deployer,
        uint160 flags,
        bytes memory creationCode,
        bytes memory constructorArgs
    ) internal pure returns (address hookAddress, bytes32 salt) {
        bytes memory bytecode = abi.encodePacked(creationCode, constructorArgs);
        bytes32 bytecodeHash = keccak256(bytecode);

        // Search for a salt that produces an address with matching flags
        for (uint256 i = 0; i < 10000; i++) {
            salt = bytes32(i);
            hookAddress = computeCreate2Address(deployer, salt, bytecodeHash);
            
            // Check that all required flags are present in the address's last 14 bits
            // The address must have all the flag bits set (bitwise AND must equal flags)
            if (uint160(hookAddress) & flags == flags) {
                return (hookAddress, salt);
            }
        }
        
        revert("HookMiner: Could not find valid hook address");
    }

    /// @notice Compute the CREATE2 address for a contract
    function computeCreate2Address(
        address deployer,
        bytes32 salt,
        bytes32 bytecodeHash
    ) internal pure returns (address) {
        bytes32 hash = keccak256(
            abi.encodePacked(bytes1(0xff), deployer, salt, bytecodeHash)
        );
        return address(uint160(uint256(hash)));
    }
}
