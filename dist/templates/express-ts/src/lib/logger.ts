const COLORS = {
	Reset: "\x1b[0m",
	FgRed: "\x1b[31m",
	FgGreen: "\x1b[32m",
	FgYellow: "\x1b[33m",
	FgBlue: "\x1b[34m",
	FgCyan: "\x1b[36m",
	FgMagenta: "\x1b[35m",
} as const;
type Color = keyof typeof COLORS;

function getTimestamp(): string {
	const now = new Date();
	const h = String(now.getHours()).padStart(2, "0");
	const m = String(now.getMinutes()).padStart(2, "0");
	const s = String(now.getSeconds()).padStart(2, "0");
	const ms = String(now.getMilliseconds()).padStart(3, "0");

	return `${h}:${m}:${s}:${ms}`;
}

function getCallerInfo(): string {
	const error = new Error();
	const stackLines = error.stack?.split("\n") || [];

	const callerLine = stackLines[4] || stackLines[3] || "";

	const match = callerLine.match(/^\s*at\s+(.*?)\s+\(([^)]+)\)$/);

	if (match) {
		let functionName = match[1].trim();

		if (
			functionName.includes("<anonymous>") ||
			functionName.includes("Object.") ||
			!functionName
		) {
			functionName = "anonymous";
		}

		return functionName;
	}

	return "anonymous";
}

interface LogData {
	level: "err" | "log" | "info" | "warn";
	color: Color;
	symbol: "@" | "~" | "$" | "#";
	args: unknown[];
}

function baseLog(data: LogData): void {
	const timestamp = getTimestamp();
	const callerInfo = getCallerInfo();

	const header = `${COLORS[data.color]}${timestamp} ${data.level.toUpperCase()} ${data.symbol} [${callerInfo}]${COLORS.Reset}`;

	console.log(header, data.args);
}

function formatErrorForLog(e: Error): (string | unknown)[] {
	if (e.stack) {
		return [`${e.name}: ${e.message}`, "\n--- Stack ---\n", e.stack];
	}
	return [e];
}

export function log(...args: unknown[]): void {
	baseLog({ level: "log", color: "FgCyan", symbol: "~", args: args });
}

export function info(...args: unknown[]): void {
	baseLog({ level: "info", color: "FgGreen", symbol: "$", args: args });
}

export function warn(...args: unknown[]): void {
	baseLog({ level: "warn", color: "FgYellow", symbol: "#", args: args });
}

export function err(...args: unknown[]): void {
	const processedArgs: unknown[] = [];

	for (const arg of args) {
		if (arg instanceof Error) {
			processedArgs.push(...formatErrorForLog(arg));
		} else {
			processedArgs.push(arg);
		}
	}

	baseLog({
		level: "err",
		color: "FgRed",
		symbol: "@",
		args: processedArgs,
	});
}
