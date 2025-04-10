import { DataSource, IsNull, Repository } from 'typeorm';

import { FarmSession } from '@/database/models/FarmSession';
import { Injectable } from '@nestjs/common';
import { differenceInSeconds } from 'date-fns';

@Injectable()
export class FarmSessionRepository extends Repository<FarmSession> {
  constructor(private dataSource: DataSource) {
    super(FarmSession, dataSource.createEntityManager());
  }

  async stopLastSession(walletId: string) {
    const farmSession = await this.findOne({
      where: { walletId, endTime: IsNull() },
      order: { startTime: 'DESC' },
    });

    if (!farmSession) {
      return;
    }

    farmSession.endTime = new Date();
    farmSession.totalTime = differenceInSeconds(
      farmSession.endTime,
      new Date(farmSession.startTime),
    );

    return await this.save(farmSession);
  }
}
