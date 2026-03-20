export function createApiState(config) {
    return {
        devices: new Map(),
        events: [],
        history: new Map(),
        historySize: config.historySize,
        historyPoints: config.historyPoints,
    };
}