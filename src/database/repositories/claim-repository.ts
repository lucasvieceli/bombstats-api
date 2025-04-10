import { DataSource, Repository } from 'typeorm';

import { Claim } from '@/database/models/Claim';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ClaimRepository extends Repository<Claim> {
  constructor(private dataSource: DataSource) {
    super(Claim, dataSource.createEntityManager());
  }
}
