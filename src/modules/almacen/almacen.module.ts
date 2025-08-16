import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Almacen } from "../productos/entities";
import { AlmacenController } from "./controller";
import {AlmacenService} from "./service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Almacen]),
  ],
  controllers: [AlmacenController],
  providers: [AlmacenService],
  exports: [AlmacenService],
})
export class AlmacenModule {}