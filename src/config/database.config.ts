import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  autoLoadEntities: true,
  synchronize: process.env.NODE_ENV !== 'production',
  //dropSchema:true,
  ssl: {
    rejectUnauthorized: false,
  },
};
