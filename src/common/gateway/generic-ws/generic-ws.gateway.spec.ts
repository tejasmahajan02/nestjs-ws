import { Test, TestingModule } from '@nestjs/testing';
import { GenericWsGateway } from './generic-ws.gateway';

describe('GenericWsGateway', () => {
  let gateway: GenericWsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GenericWsGateway],
    }).compile();

    gateway = module.get<GenericWsGateway>(GenericWsGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
