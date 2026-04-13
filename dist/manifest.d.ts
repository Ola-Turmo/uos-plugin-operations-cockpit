interface ToolDeclaration {
    toolId: string;
    name: string;
    description: string;
    parametersSchema: Record<string, unknown>;
    outputSchema: Record<string, unknown>;
}
interface LauncherDeclaration {
    launcherId: string;
    name: string;
    description: string;
    placement: {
        zone: string;
        section: string;
    };
    icon: string;
}
interface InternalManifest {
    apiVersion: string;
    pluginId: string;
    name: string;
    description: string;
    version: string;
    capabilities: string[];
    tools: ToolDeclaration[];
    launchers: LauncherDeclaration[];
}
declare const manifest: InternalManifest;
export { manifest };
export type { InternalManifest as PluginManifest };
