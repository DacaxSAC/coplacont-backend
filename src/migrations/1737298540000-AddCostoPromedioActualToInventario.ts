import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración para agregar el campo costoPromedioActual a la tabla inventarios
 * Este campo almacenará el costo promedio ponderado actual del inventario
 * y se actualizará solo con las entradas de mercancía
 */
export class AddCostoPromedioActualToInventario1737298540000 implements MigrationInterface {
    name = 'AddCostoPromedioActualToInventario1737298540000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Agregar el campo costoPromedioActual a la tabla inventarios
        await queryRunner.query(`
            ALTER TABLE "inventarios" 
            ADD COLUMN "costo_promedio_actual" DECIMAL(12,4) NOT NULL DEFAULT 0
        `);
        
        // Agregar comentario al campo para documentar su propósito
        await queryRunner.query(`
            COMMENT ON COLUMN "inventarios"."costo_promedio_actual" 
            IS 'Costo promedio ponderado actual del inventario. Se actualiza solo con entradas de mercancía.'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Eliminar el campo costoPromedioActual de la tabla inventarios
        await queryRunner.query(`
            ALTER TABLE "inventarios" 
            DROP COLUMN IF EXISTS "costo_promedio_actual"
        `);
    }
}