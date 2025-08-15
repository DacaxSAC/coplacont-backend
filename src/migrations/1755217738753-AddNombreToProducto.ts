import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNombreToProducto1755217738753 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "producto" ADD "nombre" character varying(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "producto" DROP COLUMN "nombre"`);
    }

}
