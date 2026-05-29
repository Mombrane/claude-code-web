export const config = {
    port: parseInt(process.env.PORT || '3001'),
    wsPort: parseInt(process.env.WS_PORT || '3001'),
    dataDir: process.env.DATA_DIR || './data/sessions',
    claudePath: process.env.CLAUDE_PATH || 'claude',
    defaultModel: process.env.DEFAULT_MODEL || 'claude-sonnet-4-20250514',
    defaultCwd: process.env.DEFAULT_CWD || process.cwd(),
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '1800000'), // 30 minutes
    maxMessages: parseInt(process.env.MAX_MESSAGES || '1000'),
};
//# sourceMappingURL=config.js.map