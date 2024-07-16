import { DataSource, In, Repository } from 'typeorm';

import { NftType, OpenSea } from '@/database/models/OpenSea';
import { Injectable } from '@nestjs/common';

@Injectable()
export class OpenSeaRepository extends Repository<OpenSea> {
  constructor(private dataSource: DataSource) {
    super(OpenSea, dataSource.createEntityManager());
  }

  async getByIds(ids: string[], nftType: NftType): Promise<OpenSea[]> {
    return this.find({
      where: {
        nftId: In(ids),
        nftType,
      },
    });
  }
}
