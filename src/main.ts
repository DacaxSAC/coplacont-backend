import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';
import { addTransactionalDataSource, initializeTransactionalContext } from 'typeorm-transactional';
import { DataSource } from 'typeorm';

async function bootstrap() {
  initializeTransactionalContext();
  const app = await NestFactory.create(AppModule);

  const dataSource = app.get(DataSource);
  addTransactionalDataSource(dataSource);
  
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
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
