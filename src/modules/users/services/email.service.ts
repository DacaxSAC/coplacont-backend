import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EmailConfig,
  EmailOptions,
  EmailResponse,
} from '../../../config/email.config';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = EmailConfig.createTransporter(this.configService);
  }

  /**
   * Envía un email
   * @param emailOptions Opciones del email a enviar
   * @returns Respuesta del envío
   */
  async sendEmail(emailOptions: EmailOptions): Promise<EmailResponse> {
    try {
      const mailOptions = {
        from: emailOptions.from || this.configService.get<string>('USER_EMAIL'),
        to: emailOptions.to,
        subject: emailOptions.subject,
        text: emailOptions.text,
        html: emailOptions.html,
      };

      const result = await this.transporter.sendMail(mailOptions);

      const toLog = Array.isArray(emailOptions.to)
        ? emailOptions.to.join(',')
        : String(emailOptions.to);
      this.logger.log('Email enviado exitosamente a: ' + toLog);

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      const toErr = Array.isArray(emailOptions.to)
        ? emailOptions.to.join(',')
        : String(emailOptions.to);
      this.logger.error(
        'Error al enviar email a ' + toErr + ':',
        error as unknown as Error,
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Envía un email de bienvenida
   * @param email Email del destinatario
   * @param nombre Nombre del usuario
   * @returns Respuesta del envío
   */
  async sendWelcomeEmail(
    email: string,
    nombre: string,
  ): Promise<EmailResponse> {
    const emailOptions: EmailOptions = {
      to: email,
      subject: 'Bienvenido al Sistema Contable',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">¡Bienvenido al Sistema Contable!</h2>
          <p>Hola <strong>${nombre}</strong>,</p>
          <p>Tu cuenta ha sido creada exitosamente en nuestro sistema contable.</p>
          <p>Ya puedes acceder a la plataforma y comenzar a utilizar todas las funcionalidades disponibles.</p>
          <div style="text-align: center; margin: 30px 0;">
            <p style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; border-left: 4px solid #007bff;">
              <strong>¡Gracias por confiar en nosotros!</strong>
            </p>
          </div>
          <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
          <p>Saludos,<br>El equipo del Sistema Contable</p>
        </div>
      `,
      text: `Hola ${nombre}, tu cuenta ha sido creada exitosamente en nuestro sistema contable. ¡Bienvenido!`,
    };

    return this.sendEmail(emailOptions);
  }

  /**
   * Envía un email de bienvenida con credenciales de acceso
   * @param email Email del destinatario
   * @param nombre Nombre del usuario
   * @param password Contraseña temporal generada
   * @returns Respuesta del envío
   */
  async sendWelcomeEmailWithCredentials(
    email: string,
    nombre: string,
    password: string,
  ): Promise<EmailResponse> {
    const emailOptions: EmailOptions = {
      to: email,
      subject: 'Bienvenido al Sistema Contable - Credenciales de Acceso',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">¡Bienvenido al Sistema Contable!</h2>
          <p>Hola <strong>${nombre}</strong>,</p>
          <p>Tu cuenta ha sido creada exitosamente en nuestro sistema contable.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; border-left: 4px solid #007bff; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Tus credenciales de acceso:</h3>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Contraseña temporal:</strong> <code style="background-color: #e9ecef; padding: 2px 4px; border-radius: 3px;">${password}</code></p>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <p style="margin: 0;"><strong>⚠️ Importante:</strong> Por seguridad, te recomendamos cambiar tu contraseña después del primer inicio de sesión.</p>
          </div>
          
          <p>Ya puedes acceder a la plataforma y comenzar a utilizar todas las funcionalidades disponibles.</p>
          <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
          <p>Saludos,<br>El equipo del Sistema Contable</p>
        </div>
      `,
      text: `Hola ${nombre}, tu cuenta ha sido creada exitosamente. Credenciales: Email: ${email}, Contraseña temporal: ${password}. Te recomendamos cambiar tu contraseña después del primer inicio de sesión.`,
    };

    return this.sendEmail(emailOptions);
  }

  /**
   * Envía un email de recuperación de contraseña
   * @param email Email del destinatario
   * @param resetToken Token de recuperación
   * @returns Respuesta del envío
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<EmailResponse> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL')}/auth/new-password?token=${resetToken}`;

    const emailOptions: EmailOptions = {
      to: email,
      subject: 'Recuperación de Contraseña - Sistema Contable',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">Recuperación de Contraseña</h2>
          <p>Hola,</p>
          <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
          <p>Si no solicitaste este cambio, puedes ignorar este email.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Restablecer Contraseña
            </a>
          </div>
          <p><strong>Nota:</strong> Este enlace expirará en 1 hora por seguridad.</p>
          <p>Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>Saludos,<br>El equipo del Sistema Contable</p>
        </div>
      `,
      text: `Recuperación de contraseña. Visita el siguiente enlace para restablecer tu contraseña: ${resetUrl}`,
    };

    return this.sendEmail(emailOptions);
  }

  /**
   * Verifica la conexión del servicio de email
   * @returns True si la conexión es exitosa
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Conexión de email verificada exitosamente');
      return true;
    } catch (error) {
      this.logger.error('Error al verificar la conexión de email:', error);
      return false;
    }
  }
}
