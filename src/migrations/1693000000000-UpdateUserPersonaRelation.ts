import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migración para actualizar la relación entre User y Persona
 * - Cambia la relación de OneToOne a ManyToOne (User -> Persona)
 * - Agrega campo esPrincipal a User
 * - Actualiza estructura de Persona para representar empresas
 */
export class UpdateUserPersonaRelation1693000000000 implements MigrationInterface {
    name = 'UpdateUserPersonaRelation1693000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Agregar campo esPrincipal a la tabla user
        await queryRunner.query(`
            ALTER TABLE "user" 
            ADD COLUMN "esPrincipal" boolean NOT NULL DEFAULT false
        `);

        // Eliminar constraint único de personaId en user (para permitir ManyToOne)
        await queryRunner.query(`
            ALTER TABLE "user" 
            DROP CONSTRAINT IF EXISTS "UQ_user_personaId"
        `);

        // Actualizar estructura de la tabla persona para representar empresas
        // Primero, agregar nuevas columnas
        await queryRunner.query(`
            ALTER TABLE "persona" 
            ADD COLUMN "nombreEmpresa" character varying,
            ADD COLUMN "ruc" character varying,
            ADD COLUMN "razonSocial" character varying,
            ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
        `);

        // Migrar datos existentes (opcional - depende de si hay datos)
        // Esto es un ejemplo de cómo migrar datos existentes
        await queryRunner.query(`
            UPDATE "persona" 
            SET "nombreEmpresa" = CONCAT("primerNombre", ' ', "primerApellido"),
                "ruc" = "dni",
                "razonSocial" = CONCAT("primerNombre", ' ', "primerApellido", ' - EMPRESA')
            WHERE "nombreEmpresa" IS NULL
        `);

        // Hacer las nuevas columnas NOT NULL después de migrar los datos
        await queryRunner.query(`
            ALTER TABLE "persona" 
            ALTER COLUMN "nombreEmpresa" SET NOT NULL,
            ALTER COLUMN "ruc" SET NOT NULL,
            ALTER COLUMN "razonSocial" SET NOT NULL
        `);

        // Eliminar columnas antiguas de persona (datos personales)
        await queryRunner.query(`
            ALTER TABLE "persona" 
            DROP COLUMN IF EXISTS "primerNombre",
            DROP COLUMN IF EXISTS "segundoNombre",
            DROP COLUMN IF EXISTS "primerApellido",
            DROP COLUMN IF EXISTS "segundoApellido",
            DROP COLUMN IF EXISTS "fechaNacimiento",
            DROP COLUMN IF EXISTS "dni",
            DROP COLUMN IF EXISTS "tipoDocumento"
        `);

        // Actualizar roles existentes
        await queryRunner.query(`
            UPDATE "role" SET "nombre" = 'ADMIN' WHERE "nombre" = 'CONTADOR';
            UPDATE "role" SET "nombre" = 'EMPRESA' WHERE "nombre" = 'CONTRIBUYENTE';
            DELETE FROM "role" WHERE "nombre" NOT IN ('ADMIN', 'EMPRESA');
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revertir cambios en orden inverso
        
        // Restaurar columnas de persona
        await queryRunner.query(`
            ALTER TABLE "persona" 
            ADD COLUMN "primerNombre" character varying,
            ADD COLUMN "segundoNombre" character varying,
            ADD COLUMN "primerApellido" character varying,
            ADD COLUMN "segundoApellido" character varying,
            ADD COLUMN "fechaNacimiento" date,
            ADD COLUMN "dni" character varying,
            ADD COLUMN "tipoDocumento" character varying DEFAULT 'DNI'
        `);

        // Migrar datos de vuelta (ejemplo básico)
        await queryRunner.query(`
            UPDATE "persona" 
            SET "primerNombre" = "nombreEmpresa",
                "primerApellido" = 'Empresa',
                "dni" = "ruc"
            WHERE "primerNombre" IS NULL
        `);

        // Eliminar columnas de empresa
        await queryRunner.query(`
            ALTER TABLE "persona" 
            DROP COLUMN "nombreEmpresa",
            DROP COLUMN "ruc",
            DROP COLUMN "razonSocial",
            DROP COLUMN "updatedAt"
        `);

        // Restaurar constraint único en user.personaId
        await queryRunner.query(`
            ALTER TABLE "user" 
            ADD CONSTRAINT "UQ_user_personaId" UNIQUE ("personaId")
        `);

        // Eliminar campo esPrincipal
        await queryRunner.query(`
            ALTER TABLE "user" 
            DROP COLUMN "esPrincipal"
        `);

        // Restaurar roles originales
        await queryRunner.query(`
            UPDATE "role" SET "nombre" = 'CONTADOR' WHERE "nombre" = 'ADMIN';
            UPDATE "role" SET "nombre" = 'CONTRIBUYENTE' WHERE "nombre" = 'EMPRESA';
        `);
    }
}