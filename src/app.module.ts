import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/users/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { ConfigModule } from '@nestjs/config';


@Module({
  imports: [

    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Conexión global a la base de datos
    TypeOrmModule.forRoot(databaseConfig),

    // Módulos funcionales
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
