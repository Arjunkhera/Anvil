// Configuration loader for Anvil server
// Loads from CLI args, environment variables, or config files
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
const DEFAULT_CONFIG = {
    vault_path: '',
    transport: 'stdio',
    log_level: 'info',
};
/**
 * Load server config from CLI args, env var, or ~/.anvil/server.yaml.
 * Priority: CLI args > ANVIL_VAULT_PATH env var > config file
 */
export function loadServerConfig(cliArgs) {
    let config = { ...DEFAULT_CONFIG };
    // Try to load from config file first
    const configHome = path.join(os.homedir(), '.anvil', 'server.yaml');
    if (fs.existsSync(configHome)) {
        try {
            // Dynamically import js-yaml (optional, for file-based config)
            const yaml = require('js-yaml');
            const content = fs.readFileSync(configHome, 'utf-8');
            const fileConfig = yaml.load(content);
            config = { ...config, ...fileConfig };
        }
        catch {
            // Silently ignore config file errors
        }
    }
    // Check environment variable
    const envVaultPath = process.env.ANVIL_VAULT_PATH;
    if (envVaultPath) {
        config.vault_path = envVaultPath;
    }
    // Check CLI args: --vault <path>
    if (cliArgs) {
        const vaultIndex = cliArgs.indexOf('--vault');
        if (vaultIndex !== -1 && vaultIndex + 1 < cliArgs.length) {
            config.vault_path = cliArgs[vaultIndex + 1];
        }
        // Check other CLI flags
        const transportIndex = cliArgs.indexOf('--transport');
        if (transportIndex !== -1 && transportIndex + 1 < cliArgs.length) {
            const transport = cliArgs[transportIndex + 1];
            if (transport === 'stdio' || transport === 'http') {
                config.transport = transport;
            }
        }
        const logIndex = cliArgs.indexOf('--log-level');
        if (logIndex !== -1 && logIndex + 1 < cliArgs.length) {
            const level = cliArgs[logIndex + 1];
            if (['debug', 'info', 'warn', 'error'].includes(level)) {
                config.log_level = level;
            }
        }
        const portIndex = cliArgs.indexOf('--port');
        if (portIndex !== -1 && portIndex + 1 < cliArgs.length) {
            const port = parseInt(cliArgs[portIndex + 1], 10);
            if (!isNaN(port)) {
                config.port = port;
            }
        }
    }
    return config;
}
/**
 * Load vault-specific config from .anvil/config.yaml
 */
export function loadVaultConfig(vaultPath) {
    const configPath = path.join(vaultPath, '.anvil', 'config.yaml');
    if (!fs.existsSync(configPath)) {
        return {};
    }
    try {
        const yaml = require('js-yaml');
        const content = fs.readFileSync(configPath, 'utf-8');
        const config = yaml.load(content);
        return config || {};
    }
    catch {
        // Return empty config if parsing fails
        return {};
    }
}
/**
 * Get standard paths relative to the vault
 */
export function vaultPaths(vaultPath) {
    return {
        typesDir: path.join(vaultPath, '.anvil', 'types'),
        localDir: path.join(vaultPath, '.anvil', '.local'),
        indexDb: path.join(vaultPath, '.anvil', '.local', 'index.db'),
        stateJson: path.join(vaultPath, '.anvil', '.local', 'state.json'),
        configYaml: path.join(vaultPath, '.anvil', 'config.yaml'),
    };
}
//# sourceMappingURL=config.js.map