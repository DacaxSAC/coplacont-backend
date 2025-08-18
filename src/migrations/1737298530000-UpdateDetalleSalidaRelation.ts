import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateDetalleSalidaRelation1737298530000 implements MigrationInterface {
    name = 'UpdateDetalleSalidaRelation1737298530000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Eliminar la restricción única en id_movimiento_detalle
        await queryRunner.query(`
            ALTER TABLE "detalle_salidas" 
            DROP CONSTRAINT IF EXISTS "REL_8253b11365b78713c95625fbeb"
        `);
        
        // Crear un índice normal en lugar de único
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_detalle_salidas_id_movimiento_detalle" 
            ON "detalle_salidas" ("id_movimiento_detalle")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Eliminar el índice
        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_detalle_salidas_id_movimiento_detalle"
        `);
        
        // Restaurar la restricción única (solo si no hay duplicados)
        await queryRunner.query(`
            ALTER TABLE "detalle_salidas" 
            ADD CONSTRAINT "REL_8253b11365b78713c95625fbeb" 
            UNIQUE ("id_movimiento_detalle")
        `);
    }
}