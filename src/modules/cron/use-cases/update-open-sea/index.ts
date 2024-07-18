import { NftType } from '@/database/models/OpenSea';
import { OpenSeaRepository } from '@/database/repositories/open-sea-repository';
import { OpenSeaService } from '@/services/opeSea';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class UpdateOpenSea {
  constructor(
    private openSeaRepository: OpenSeaRepository,
    private openSeaService: OpenSeaService,
  ) {}

  async execute() {
    await this.getTokens(NftType.HOUSE);
    await this.getTokens(NftType.HERO);
  }

  async getTokens(nftType: NftType) {
    try {
      const collection =
        nftType === NftType.HOUSE ? 'bomber-house' : 'bomber-hero-polygon';
      const tokens = await this.openSeaService.getTokenIds(collection);

      await this.openSeaRepository.delete({ nftType });

      const openSea = tokens.map((token) => {
        return {
          nftId: token.tokenId,
          nftType,
          amount: token.price,
        };
      });

      await this.openSeaRepository.updateOrInsert(openSea);
    } catch (error) {
      Logger.error(`error ${error.message}`, 'UpdateOpenSea');
    }
  }
}
