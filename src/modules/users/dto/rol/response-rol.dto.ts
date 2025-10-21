import { Expose } from 'class-transformer';

export class ResponseRolDto {
  @Expose()
  id: number;
  @Expose()
  nombre: string;
}
