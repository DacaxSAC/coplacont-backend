import { Expose } from 'class-transformer';

export class ResponsePermissionDto {
  @Expose()
  id: number;
  @Expose()
  nombre: string;
}
