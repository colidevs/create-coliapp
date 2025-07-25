import { Router } from 'express';
import { sayHello } from '../controllers/index.controllers';

const router = Router();

router.get('/', sayHello);

export default router;