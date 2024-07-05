import { DataSource, Repository } from 'typeorm';

import { Totals } from '@/database/models/Totals';
import { Injectable } from '@nestjs/common';
import { WalletNetwork } from '@/database/models/Wallet';

@Injectable()
export class TotalsRepository extends Repository<Totals> {
  constructor(private dataSource: DataSource) {
    super(Totals, dataSource.createEntityManager());
  }

  async insertOrUpdate(
    name: string,
    value: string,
    network: WalletNetwork,
    additional?: any,
  ) {
    return await this.upsert(
      {
        name,
        network,
        value,
        additional,
      },
      ['name', 'network'],
    );
  }
}
