import { type Controller, createProductController } from "./controller";
import { createProductRepository, type Repository } from "./repository";
import { createProductService, type Service } from "./service";

const repository: Repository = createProductRepository();
const service: Service = createProductService(repository);
const controller: Controller = createProductController(service);

export { controller, service };
