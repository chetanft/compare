/**
 * TypeScript interface for FigmaMCPIntegration
 */

interface FigmaMCPIntegration {
  initialize(): Promise<void>;
  getMCPType(): string | null;
  isOfficialMCPAvailable(): boolean;
  isThirdPartyMCPAvailable(): boolean;
  isFigmaAPIAvailable(): boolean;
  getFigmaData(fileKey: string, nodeId?: string | null, depth?: number): Promise<any>;
  downloadFigmaImages(fileKey: string, nodes: any[], localPath: string, options?: any): Promise<any>;
}

export default FigmaMCPIntegration; 