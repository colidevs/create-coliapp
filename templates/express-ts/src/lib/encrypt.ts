import crypto from "node:crypto";
import { config } from "@/config";

const ALGORITHM = "aes-256-gcm";
const SECRET_KEY = Buffer.from(config.secret!, "hex");

function encrypt(str: string): string {
	// init vector
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);

	let encrypted = cipher.update(str, "utf-8", "hex");
	encrypted += cipher.final("hex");

	const authTag = cipher.getAuthTag().toString("hex");

	return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

function decrypt(str: string): string {
	const [ivHex, authTagHex, encryptedText] = str.split(":");

	const decipher = crypto.createDecipheriv(
		ALGORITHM,
		SECRET_KEY,
		Buffer.from(ivHex, "hex"),
	);

	decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

	let decrypted = decipher.update(encryptedText, "hex", "utf-8");
	decrypted += decipher.final("utf-8");

	return decrypted;
}

export { encrypt, decrypt };
