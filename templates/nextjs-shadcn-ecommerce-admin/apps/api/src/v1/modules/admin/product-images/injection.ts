import { type Controller, createProductImageController } from "./controller";
import { createProductImageRepository, type Repository } from "./repository";
import { createProductImageService, type Service } from "./service";

const repository: Repository = createProductImageRepository();
const service: Service = createProductImageService(repository);
const controller: Controller = createProductImageController(service);

export { controller, service };
