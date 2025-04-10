import { DataSource, Repository } from 'typeorm';

import { Map } from '@/database/models/Map';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MapRepository extends Repository<Map> {
  constructor(private dataSource: DataSource) {
    super(Map, dataSource.createEntityManager());
  }

  async getLastMap(walletId: string) {
    const result = await this.findOne({
      where: { walletId },
      order: { createdAt: 'DESC' },
    });

    if (!result) {
      return await this.save({
        walletId,
      });
    }

    return result;
  }
}
