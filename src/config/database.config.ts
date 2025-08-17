import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: 'postgresql://db_dacax_coplacont_user:BNih1b86T0PqHwDnPDyCuu22V0m9j8p2@dpg-d2fl4k2dbo4c73bdbh30-a.oregon-postgres.render.com/db_dacax_coplacont',
  autoLoadEntities: true,
  synchronize: true,
  //dropSchema:true,
  ssl: {
    rejectUnauthorized: false,
  },
};
