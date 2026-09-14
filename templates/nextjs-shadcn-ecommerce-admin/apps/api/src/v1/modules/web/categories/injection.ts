import { type Controller, createWebCategoryController } from "./controller";
import { createWebCategoryRepository, type Repository } from "./repository";
import { createWebCategoryService, type Service } from "./service";

const repository: Repository = createWebCategoryRepository();
const service: Service = createWebCategoryService(repository);
const controller: Controller = createWebCategoryController(service);

export { controller, service };
