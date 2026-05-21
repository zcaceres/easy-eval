export const dim = (s: string): string => `\x1b[38;5;245m${s}\x1b[0m`;
export const bold = (s: string): string => `\x1b[1m${s}\x1b[0m`;
export const red = (s: string): string => `\x1b[31m${s}\x1b[0m`;
export const green = (s: string): string => `\x1b[32m${s}\x1b[0m`;
export const yellow = (s: string): string => `\x1b[33m${s}\x1b[0m`;
export const cyan = (s: string): string => `\x1b[36m${s}\x1b[0m`;
export const magenta = (s: string): string => `\x1b[35m${s}\x1b[0m`;
export const line = (width = 58): string => dim("─".repeat(width));
