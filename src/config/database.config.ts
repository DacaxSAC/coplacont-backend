import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: 'postgresql://db_contable_dacax_user:ODNA4qVFOAvBMT4Bb2KKLbDb68SRFLRN@dpg-d29obfndiees73d0u5u0-a.oregon-postgres.render.com/db_contable_dacax',
  autoLoadEntities: true,
  synchronize: true, // Enabled for development
  ssl: {
    rejectUnauthorized: false,
  },
};
