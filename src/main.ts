import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
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
