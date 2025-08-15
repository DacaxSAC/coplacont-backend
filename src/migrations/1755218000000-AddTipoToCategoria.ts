import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTipoToCategoria1755218000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Crear el tipo enum
        await queryRunner.query(`CREATE TYPE "categoria_tipo_enum" AS ENUM('PRODUCTO', 'SERVICIO')`);
        
        // Agregar la columna tipo con valor por defecto
        await queryRunner.query(`ALTER TABLE "categoria" ADD "tipo" "categoria_tipo_enum" NOT NULL DEFAULT 'PRODUCTO'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Eliminar la columna
        await queryRunner.query(`ALTER TABLE "categoria" DROP COLUMN "tipo"`);
        
        // Eliminar el tipo enum
        await queryRunner.query(`DROP TYPE "categoria_tipo_enum"`);
    }

}