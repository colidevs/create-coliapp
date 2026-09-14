import { type Controller, createVariantController } from "./controller";
import { createVariantRepository, type Repository } from "./repository";
import { createVariantService, type Service } from "./service";

const repository: Repository = createVariantRepository();
const service: Service = createVariantService(repository);
const controller: Controller = createVariantController(service);

export { controller, service };
