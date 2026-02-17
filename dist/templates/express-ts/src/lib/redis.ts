import { createClient, type RedisClientType, type SetOptions } from "redis";
import { config } from "@/config";
import { err, info, log } from "@/lib/logger";
import { removeLastSlashSymbol } from "@/lib/utils";
import { EnvironmentError, InfraError } from "@/v1/res/errors";
import type { RequestWithId, ResponseWithContext } from "@/v1/types";

let redisClient: RedisClientType | null = null;

const unableToConnectError = new InfraError(
	"Redis",
	"Unable to connect to redis instance",
);

async function connectRedis() {
	if (redisClient) {
		return redisClient;
	}

	const url = config.redis.url;

	if (!url) {
		throw new EnvironmentError(
			"REDIS_URL",
			"redis://default:@coli.internal:5102",
		);
	}

	redisClient = createClient({ url }) as RedisClientType;

	redisClient.on("error", (error) => err("Redis Client Error", error));

	try {
		await redisClient.connect();
		info("Conexión a Redis establecida con éxito.");
	} catch (error) {
		err("Fallo al conectar a Redis:", error);
		redisClient = null;
		throw unableToConnectError;
	}

	return redisClient;
}

export async function getRedisClient(): Promise<RedisClientType> {
	if (!redisClient) {
		await connectRedis();
	}

	if (!redisClient) {
		throw unableToConnectError;
	}

	return redisClient;
}

export async function getCache<T extends object>(
	cacheKey: string,
): Promise<T | null> {
	const redis = await getRedisClient();

	const key = removeLastSlashSymbol(cacheKey);

	const cache = await redis.get(key);

	if (!cache) {
		info("cache miss", key);

		return null;
	}

	info("cache hit", key);

	const data = JSON.parse(cache);

	return data;
}

export async function setCache<T>(
	cacheKey: string,
	data: T,
	expirationSeconds?: number,
) {
	const key = removeLastSlashSymbol(cacheKey);

	const redisClient = await getRedisClient();

	const options: SetOptions | undefined = expirationSeconds
		? {
				expiration: {
					type: "EX",
					value: expirationSeconds,
				},
			}
		: undefined;

	return await redisClient.set(key, JSON.stringify(data), options);
}

/**
 * @description delete or bulk delete (use pattern in cacheKey)
 * @param cacheKey key or pattern
 * @returns revaliate keys count
 */
export async function revalidatePattern(cacheKey: string): Promise<number> {
	const key = removeLastSlashSymbol(cacheKey);
	log("prepare to revalidate", key);

	const redisClient = await getRedisClient();

	const isBulk: boolean = key.includes("*");

	if (!isBulk) {
		const res = await redisClient.del(key);

		log("cache `del` 🧹", key, res);
		return res;
	}

	const matches = await redisClient.keys(cacheKey);

	const res = await redisClient.del(matches);

	log("cache `bulk del` 🧹", key, res);

	return res;
}

export function genCacheKey(
	id: RequestWithId["params"]["id"],
	context: ResponseWithContext["locals"]["context"],
	pattern?: string,
): string {
	return `colitienda:${id}:${context}${pattern ?? ""}`;
}
