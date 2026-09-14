import { type Controller, createWebProductController } from "./controller";
import { createWebProductRepository, type Repository } from "./repository";
import { createWebProductService, type Service } from "./service";

const repository: Repository = createWebProductRepository();
const service: Service = createWebProductService(repository);
const controller: Controller = createWebProductController(service);

export { controller, service };
