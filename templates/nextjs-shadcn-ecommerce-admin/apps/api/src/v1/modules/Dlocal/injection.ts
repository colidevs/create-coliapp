import { type Controller, createDlocalController } from "./controller";
import { createDlocalRepository, type Repository } from "./repository";
import { createDlocalService, type Service } from "./service";

const repository: Repository = createDlocalRepository();
const service: Service = createDlocalService(repository);
const controller: Controller = createDlocalController(service);

export { controller, service };
