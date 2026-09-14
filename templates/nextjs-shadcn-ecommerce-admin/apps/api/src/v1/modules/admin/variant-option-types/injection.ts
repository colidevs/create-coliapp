import {
	type Controller,
	createVariantOptionTypeController,
} from "./controller";
import {
	createVariantOptionTypeRepository,
	type Repository,
} from "./repository";
import { createVariantOptionTypeService, type Service } from "./service";

const repository: Repository = createVariantOptionTypeRepository();
const service: Service = createVariantOptionTypeService(repository);
const controller: Controller = createVariantOptionTypeController(service);

export { controller, service };
