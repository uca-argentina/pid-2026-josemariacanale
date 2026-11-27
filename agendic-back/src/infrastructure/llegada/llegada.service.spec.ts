import { Test, TestingModule } from '@nestjs/testing';
import { LlegadaService } from './llegada.service';

describe('LlegadaService', () => {
  let service: LlegadaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LlegadaService],
    }).compile();

    service = module.get<LlegadaService>(LlegadaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
