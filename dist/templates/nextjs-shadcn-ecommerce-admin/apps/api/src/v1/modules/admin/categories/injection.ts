import { type Controller, createCategoryController } from "./controller";
import { createCategoryRepository, type Repository } from "./repository";
import { createCategoryService, type Service } from "./service";

const repository: Repository = createCategoryRepository();
const service: Service = createCategoryService(repository);
const controller: Controller = createCategoryController(service);

export { controller, service };
