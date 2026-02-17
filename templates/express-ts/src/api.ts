import type { ErrorRequestHandler, RequestHandler, Router } from "express";
import express from "express";
import { v1ErrorHandler } from "@/v1/res/error-handler";
import { v1Router } from "@/v1/route";

export type Version = "1";
export type ApiPath = `/api/v${Version}`;

function mountVersion(
	app: Router,
	path: ApiPath,
	router: RequestHandler,
	errorHandler: ErrorRequestHandler,
) {
	app.use(path, router);
	app.use(path, errorHandler);
}

const api = express();

api.use(express.json());
api.use(express.urlencoded({ extended: true }));

mountVersion(api, "/api/v1", v1Router, v1ErrorHandler);

export { api };
