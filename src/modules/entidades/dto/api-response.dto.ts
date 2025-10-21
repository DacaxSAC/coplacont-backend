import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para respuestas estándar de la API
 */
export class ApiResponseDto<T = any> {
  @ApiProperty({
    example: true,
    description: 'Indica si la operación fue exitosa',
  })
  success: boolean;

  @ApiProperty({
    example: 'Operación completada exitosamente',
    description: 'Mensaje descriptivo de la operación',
  })
  message: string;

  @ApiProperty({
    description: 'Datos de respuesta (opcional)',
    required: false,
  })
  data?: T;

  constructor(success: boolean, message: string, data?: T) {
    this.success = success;
    this.message = message;
    this.data = data;
  }

  static success<T>(message: string, data?: T): ApiResponseDto<T> {
    return new ApiResponseDto(true, message, data);
  }

  static error<T>(message: string, data?: T): ApiResponseDto<T> {
    return new ApiResponseDto(false, message, data);
  }
}
