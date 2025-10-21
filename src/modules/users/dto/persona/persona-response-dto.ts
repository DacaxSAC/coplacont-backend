import { Expose } from 'class-transformer';

export class PersonaResponseDto {
  @Expose()
  id: number;
  @Expose()
  nombreEmpresa: string;
  @Expose()
  ruc: string;
  @Expose()
  razonSocial: string;
  @Expose()
  telefono: string;
  @Expose()
  direccion: string;
}
