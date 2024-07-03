import { ClaimController } from '@/modules/claim/controllers/claim-controller';
import { UpdateClaimRanking } from '@/modules/claim/use-cases/update-claim-ranking';

export const ClaimModules = {
  imports: [],
  controllers: [ClaimController],
  providers: [UpdateClaimRanking],
};
