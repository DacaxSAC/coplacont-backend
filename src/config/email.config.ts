import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

/**
 * Configuración del servicio de email usando nodemailer
 */
export class EmailConfig {
  private static transporter: Transporter;

  /**
   * Crea y configura el transporter de nodemailer
   * @param configService Servicio de configuración de NestJS
   * @returns Transporter configurado
   */
  static createTransporter(configService: ConfigService): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: configService.get<string>('USER_EMAIL'),
          pass: configService.get<string>('PASSWORD_EMAIL'),
        },
        secure: true,
        port: 465,
      });
    }
    return this.transporter;
  }

  /**
   * Obtiene el transporter existente
   * @returns Transporter configurado
   */
  static getTransporter(): Transporter {
    if (!this.transporter) {
      throw new Error(
        'Transporter no ha sido inicializado. Llama a createTransporter primero.',
      );
    }
    return this.transporter;
  }
}

/**
 * Interfaz para las opciones de email
 */
export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

/**
 * Interfaz para la respuesta del envío de email
 */
export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}
