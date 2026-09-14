import { type Controller, createStockController } from "./controller";
import { createStockRepository, type Repository } from "./repository";
import { createStockService, type Service } from "./service";

const repository: Repository = createStockRepository();
const service: Service = createStockService(repository);
const controller: Controller = createStockController(service);

export { controller, service };
