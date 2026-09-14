import { type Controller, createOrderController } from "./controller";
import { createOrderRepository, type Repository } from "./repository";
import { createOrderService, type Service } from "./service";

const repository: Repository = createOrderRepository();
const service: Service = createOrderService(repository);
const controller: Controller = createOrderController(service);

export { controller, service };
