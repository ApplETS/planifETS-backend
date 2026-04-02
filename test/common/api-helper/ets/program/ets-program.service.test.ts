import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosHeaders, AxiosResponse } from 'axios';
import { of } from 'rxjs';

import {
  EtsProgramService,
  IProgramTypeEtsAPI,
} from '@/common/api-helper/ets/program/ets-program.service';

describe('EtsProgramService', () => {
  let service: EtsProgramService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EtsProgramService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EtsProgramService>(EtsProgramService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should map ETS API program results to internal DTOs', async () => {
    const mockTypes: IProgramTypeEtsAPI[] = [
      { id: 10, title: 'Baccalaureat' },
    ];

    const mockResponse: AxiosResponse = {
      data: {
        types: mockTypes,
        results: [
          {
            id: 7084,
            title: '<strong>Baccalaureat</strong> en genie logiciel',
            cycle: '1er cycle',
            code: 'LOG',
            credits: '90',
            types: [10],
            url: 'https://example.com/program/7084',
          },
        ],
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {
        headers: new AxiosHeaders(),
      },
    };

    jest.spyOn(httpService, 'get').mockReturnValueOnce(of(mockResponse));

    const result = await service.fetchAllProgramsFromEtsAPI();

    expect(result).toEqual({
      types: mockTypes,
      programs: [
        {
          id: 7084,
          title: 'Baccalaureat en genie logiciel',
          cycle: 1,
          code: 'LOG',
          credits: '90',
          programTypes: {
            connect: [{ id: 10 }],
          },
          url: 'https://example.com/program/7084',
        },
      ],
    });
  });

  it('should keep null credits when the API omits them', async () => {
    const mockResponse: AxiosResponse = {
      data: {
        types: [],
        results: [
          {
            id: 1822,
            title: 'Programme court',
            cycle: '2e cycle',
            code: 'PC',
            credits: null,
            types: [],
            url: 'https://example.com/program/1822',
          },
        ],
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {
        headers: new AxiosHeaders(),
      },
    };

    jest.spyOn(httpService, 'get').mockReturnValueOnce(of(mockResponse));

    const result = await service.fetchAllProgramsFromEtsAPI();

    expect(result.programs).toEqual([
      {
        id: 1822,
        title: 'Programme court',
        cycle: 2,
        code: 'PC',
        credits: null,
        programTypes: {
          connect: [],
        },
        url: 'https://example.com/program/1822',
      },
    ]);
  });
});
