import { warn } from "node:console";
import type { NextFunction, Request, Response } from "express";
import { config } from "@/config";
import { UnauthorizedHttpError } from "@/v1/res/errors";

const credentials = `${config.basicAuth.user}:${config.basicAuth.pwd}`;

const basicAuthEncodedPwd = btoa(credentials);

export const BASIC_AUTH = `Basic ${basicAuthEncodedPwd}`;

const auth = async (req: Request, res: Response, next: NextFunction) => {
	const authHeader = req.headers.authorization;

	const unauthorizedError = new UnauthorizedHttpError();

	if (!authHeader || !authHeader.startsWith("Basic ")) {
		res.set("WWW-Authenticate", "Basic realm='Unauthorized'");
		warn(`ip ${req.ip}`, "require credentials");
		throw unauthorizedError;
	}

	const encodedCredentials = authHeader.split(" ")[1];

	try {
		const decodedCredentials = atob(encodedCredentials);

		if (decodedCredentials === credentials) {
			next();
		} else {
			warn(`ip ${req.ip}`, "invalid credentials");
			throw unauthorizedError;
		}
	} catch (_e) {
		res.set("WWW-Authenticate", "Basic realm='Unauthorized'");
		warn(`ip ${req.ip}`, "invalid method");
		throw unauthorizedError;
	}
};

export { auth };
