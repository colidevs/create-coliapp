import { promisify } from "node:util";
import { gunzip as _gunzip, gzip as _gzip } from "zlib";

const gzip = promisify(_gzip);
const gunzip = promisify(_gunzip);

/**
 * Comprime un string usando gzip y retorna el resultado en base64.
 * @param str - El string a comprimir.
 * @returns String comprimido en formato base64.
 */
export async function compressString(str: string): Promise<string> {
	const compressed = await gzip(str);

	return compressed.toString("base64");
}

/**
 * Descomprime un string base64 previamente comprimido con gzip.
 * @param base64Str - El string base64 comprimido.
 * @returns El string original descomprimido.
 */
export async function decompressString(base64Str: string): Promise<string> {
	const buffer = Buffer.from(base64Str, "base64");

	// Convertir buffer a Uint8Array
	const uint8Array = new Uint8Array(
		buffer.buffer,
		buffer.byteOffset,
		buffer.byteLength,
	);

	const decompressed = await gunzip(uint8Array);

	return decompressed.toString("utf-8");
}
