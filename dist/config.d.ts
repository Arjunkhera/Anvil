import type { ServerConfig, VaultConfig } from './types/index.js';
/**
 * Load server config from CLI args, env var, or ~/.anvil/server.yaml.
 * Priority: CLI args > ANVIL_VAULT_PATH env var > config file
 */
export declare function loadServerConfig(cliArgs?: string[]): ServerConfig;
/**
 * Load vault-specific config from .anvil/config.yaml
 */
export declare function loadVaultConfig(vaultPath: string): VaultConfig;
/**
 * Get standard paths relative to the vault
 */
export declare function vaultPaths(vaultPath: string): {
    typesDir: string;
    localDir: string;
    indexDb: string;
    stateJson: string;
    configYaml: string;
};
//# sourceMappingURL=config.d.ts.map