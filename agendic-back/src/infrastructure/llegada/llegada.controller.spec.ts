import { Test, TestingModule } from '@nestjs/testing';
import { LlegadaController } from './llegada.controller';
import { LlegadaService } from './llegada.service';

describe('LlegadaController', () => {
  let controller: LlegadaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LlegadaController],
      providers: [LlegadaService],
    }).compile();

    controller = module.get<LlegadaController>(LlegadaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
