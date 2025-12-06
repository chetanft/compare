export const PORTS = {
  SERVER: 3847,
  WEB_DEV: 3847,
  FIGMA_MCP: 3845,
  PREVIEW: 3847
};

export const getServerPort = () => PORTS.SERVER;
export const getApiUrl = (hostname = 'localhost') => `http://${hostname}:${PORTS.SERVER}`;
export const getWebSocketUrl = (hostname = 'localhost') => `ws://${hostname}:${PORTS.SERVER}`;

export const CONFIGURED_PORTS = {
  SERVER: parseInt(process.env.PORT || PORTS.SERVER.toString(), 10),
  WEB_DEV: parseInt(process.env.WEB_DEV_PORT || process.env.VITE_PORT || PORTS.WEB_DEV.toString(), 10),
  FIGMA_MCP: parseInt(process.env.FIGMA_MCP_PORT || PORTS.FIGMA_MCP.toString(), 10),
  PREVIEW: parseInt(process.env.PREVIEW_PORT || PORTS.PREVIEW.toString(), 10)
};

export const validatePorts = () => {
  // Only validate SERVER and FIGMA_MCP ports (allow WEB_DEV and PREVIEW to match SERVER)
  const criticalPorts = [
    CONFIGURED_PORTS.SERVER,
    CONFIGURED_PORTS.FIGMA_MCP
  ];
  const duplicates = criticalPorts.filter((port, index) => criticalPorts.indexOf(port) !== index);
  if (duplicates.length > 0) {
    throw new Error(`Duplicate critical ports detected: ${duplicates.join(', ')}`);
  }
  
  const allPorts = Object.values(CONFIGURED_PORTS);
  const invalidPorts = allPorts.filter(port => port < 1024 || port > 65535);
  if (invalidPorts.length > 0) {
    throw new Error(`Invalid ports detected (must be 1024-65535): ${invalidPorts.join(', ')}`);
  }
};

if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'test') {
  validatePorts();
}
