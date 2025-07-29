import { Request, Response } from 'express';
import { getHelloMessage } from '../services/index.services';

export const sayHello = (req: Request, res: Response) => {
  const message = getHelloMessage();
  res.json({ message });
};