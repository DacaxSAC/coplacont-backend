import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTipoCategoriaValues1755218100000 implements MigrationInterface {
    name = 'UpdateTipoCategoriaValues1755218100000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Actualizar valores existentes de PRODUCTO a producto
        await queryRunner.query(`
            UPDATE categoria 
            SET tipo = 'producto' 
            WHERE tipo = 'PRODUCTO'
        `);
        
        // Actualizar valores existentes de SERVICIO a servicio
        await queryRunner.query(`
            UPDATE categoria 
            SET tipo = 'servicio' 
            WHERE tipo = 'SERVICIO'
        `);
        
        // Actualizar el enum para usar valores en minúsculas
        await queryRunner.query(`
            ALTER TYPE categoria_tipo_enum RENAME TO categoria_tipo_enum_old
        `);
        
        await queryRunner.query(`
            CREATE TYPE categoria_tipo_enum AS ENUM('producto', 'servicio')
        `);
        
        await queryRunner.query(`
            ALTER TABLE categoria 
            ALTER COLUMN tipo TYPE categoria_tipo_enum 
            USING tipo::text::categoria_tipo_enum
        `);
        
        await queryRunner.query(`
            DROP TYPE categoria_tipo_enum_old
        `);
        
        // Actualizar el valor por defecto
        await queryRunner.query(`
            ALTER TABLE categoria 
            ALTER COLUMN tipo SET DEFAULT 'producto'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revertir el valor por defecto
        await queryRunner.query(`
            ALTER TABLE categoria 
            ALTER COLUMN tipo SET DEFAULT 'PRODUCTO'
        `);
        
        // Revertir el enum
        await queryRunner.query(`
            ALTER TYPE categoria_tipo_enum RENAME TO categoria_tipo_enum_old
        `);
        
        await queryRunner.query(`
            CREATE TYPE categoria_tipo_enum AS ENUM('PRODUCTO', 'SERVICIO')
        `);
        
        await queryRunner.query(`
            ALTER TABLE categoria 
            ALTER COLUMN tipo TYPE categoria_tipo_enum 
            USING tipo::text::categoria_tipo_enum
        `);
        
        await queryRunner.query(`
            DROP TYPE categoria_tipo_enum_old
        `);
        
        // Revertir valores de datos
        await queryRunner.query(`
            UPDATE categoria 
            SET tipo = 'PRODUCTO' 
            WHERE tipo = 'producto'
        `);
        
        await queryRunner.query(`
            UPDATE categoria 
            SET tipo = 'SERVICIO' 
            WHERE tipo = 'servicio'
        `);
    }
}