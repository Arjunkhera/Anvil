/**
 * Plugin Type Directory Discovery
 *
 * Establishes the convention that plugins contribute type definitions via
 * `.anvil/plugins/{pluginName}/types/` directories. This module scans for
 * matching directories under a vault's `.anvil/plugins/` path and returns
 * their absolute paths in deterministic (alphabetical) order.
 *
 * This enables Forge (and other plugin managers) to install plugin types by
 * writing YAML files into the plugin's types directory, without requiring
 * manual configuration.
 *
 * Convention:
 * - Each plugin is a directory under `.anvil/plugins/`
 * - Plugin types are in `{pluginDir}/types/` as YAML files
 * - If `.anvil/plugins/{name}/plugin.json` exists, the plugin is considered
 *   "installed" and is logged (informational only)
 * - If `{pluginDir}/types/` doesn't exist, the plugin is silently skipped
 * - Plugins are processed in alphabetical order by name, ensuring deterministic
 *   precedence: first plugin (alphabetically) wins on type ID conflicts
 */
/**
 * Discover all plugin type directories under a vault path.
 *
 * Returns a sorted list of absolute paths to `{pluginDir}/types/` directories
 * that exist and are readable. Directories are sorted alphabetically by plugin
 * name for deterministic ordering.
 *
 * If `.anvil/plugins/` does not exist, returns an empty array.
 * If a plugin directory exists but has no `types/` subdirectory, it is silently skipped.
 *
 * @param vaultPath - Absolute path to the vault root
 * @returns Promise resolving to sorted array of absolute paths to plugin types directories
 */
export declare function discoverPluginTypeDirs(vaultPath: string): Promise<string[]>;
//# sourceMappingURL=plugin-discovery.d.ts.map