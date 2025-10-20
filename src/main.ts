import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';
import { addTransactionalDataSource, initializeTransactionalContext } from 'typeorm-transactional';
import { DataSource } from 'typeorm';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

let cachedApp: any;

async function createApp() {
  if (cachedApp) {
    return cachedApp;
  }

  initializeTransactionalContext();
  
  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));

  const dataSource = app.get(DataSource);
  addTransactionalDataSource(dataSource);
  
  // Configurar ValidationPipe global con transformación
  //app.useGlobalPipes(new ValidationPipe({
  //  transform: true,
  //  whitelist: true,
  //  forbidNonWhitelisted: true,
  //}));
  
  // Habilitar CORS
  app.enableCors({
    origin: true, // Permitir todos los orígenes
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Métodos HTTP permitidos
    allowedHeaders: ['Content-Type', 'Authorization'], // Headers permitidos
    credentials: true, // Permitir cookies y credenciales
  });
  
  // Configurar Swagger
  setupSwagger(app);
  
  // Redirección automática de / a /api/docs
  app.use('/', (req, res, next) => {
    if (req.url === '/') {
      return res.redirect('/api/docs');
    }
    next();
  });
  
  await app.init();
  cachedApp = expressApp;
  return expressApp;
}

// Para desarrollo local
async function bootstrap() {
  const app = await createApp();
  const port = process.env.PORT ?? 3000;
  app.listen(port, () => {
    console.log(`Application is running on port ${port}`);
  });
}

// Para Vercel
export default async (req: any, res: any) => {
  const app = await createApp();
  return app(req, res);
};

// Solo ejecutar bootstrap en desarrollo local
if (process.env.NODE_ENV !== 'production') {
  bootstrap();
}
