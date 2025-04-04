import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateMap1720268691813 implements MigrationInterface {
  name = 'UpdateMap1720268691813';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE map_block
                CHANGE mapId mapId char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE map_block
                CHANGE mapId mapId char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci not NULL;
        `);
  }
}
