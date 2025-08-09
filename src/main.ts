import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilitar CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'], // Orígenes permitidos
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
