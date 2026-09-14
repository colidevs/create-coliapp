import {
	type Controller,
	createVariantOptionValueController,
} from "./controller";
import {
	createVariantOptionValueRepository,
	type Repository,
} from "./repository";
import { createVariantOptionValueService, type Service } from "./service";

const repository: Repository = createVariantOptionValueRepository();
const service: Service = createVariantOptionValueService(repository);
const controller: Controller = createVariantOptionValueController(service);

export { controller, service };
