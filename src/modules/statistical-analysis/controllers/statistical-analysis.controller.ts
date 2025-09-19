import { Route } from '@/common/decorators/route.decorator';
import { StatisticalAnalysisService } from '../services/statistical-analysis.service';

@Route('statistical-analysis')
export class StatisticalAnalysisController {
  constructor(private statisticalAnalysisService: StatisticalAnalysisService) {}
}
