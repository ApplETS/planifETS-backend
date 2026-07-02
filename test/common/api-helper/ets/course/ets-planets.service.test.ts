import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosHeaders, AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';

import { EtsPlanetsService } from '../../../../../src/common/api-helper/ets/course/ets-planets.service';

describe('EtsPlanetsService', () => {
  let service: EtsPlanetsService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EtsPlanetsService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EtsPlanetsService>(EtsPlanetsService);
    httpService = module.get<HttpService>(HttpService);
  });

  const mockHtmlResponse = (html: string): void => {
    const response: AxiosResponse<string> = {
      data: html,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };

    jest.spyOn(httpService, 'get').mockReturnValueOnce(of(response));
  };

  it('extracts and normalizes the description from a real PlanETS LOG210 page', async () => {
    mockHtmlResponse(`
      <div id="contenuPDF">
        <div style="page-break-inside: avoid;">
          <span class="TitreSection">Description du cours</span><br>
          <span id="ctl00_ContentPlaceHolderMainPublicPlanCours_lblDescriptifCours" class="SectionContenu">Au terme de ce cours, l’étudiante ou l’étudiant sera en mesure  : <br>
          • de maîtriser et appliquer des patrons de conception logicielle;<br>
          • de concevoir un logiciel orienté objet en appliquant un ensemble de principes et des méthodes heuristiques de génie logiciel; <br>
          • de réaliser un logiciel en suivant un processus itératif et évolutif incluant les activités d'analyse et de conception par objets. <br><br>
          Méthodes et techniques de modélisation orientés objet, langage de modélisation, cas d'utilisation, analyse orientée objet, modèle du domaine, conception et programmation orientées objet, principes GRASP, patrons de conception, processus itératif et évolutif.
          <br><br>

          Séances de laboratoire axées sur l'application des notions d'analyse, de conception et de programmation orientées objet vues en classe. Mise en œuvre d'un modèle d'objet à partir d'une spécification de logiciel et à l'aide d'un langage orienté objet contemporain. Conception d'applications utilisant les outils UML ainsi que des techniques et des outils utiles au génie logiciel, tels qu'un environnement de développement intégré, la compilation automatique et les tests automatiques.
          </span>
        </div>
      </div>
    `);

    await expect(
      service.fetchCourseDescriptionFromPlanets('LOG210'),
    ).resolves.toBe(
      [
        'Au terme de ce cours, l’étudiante ou l’étudiant sera en mesure :',
        '',
        "• de maîtriser et appliquer des patrons de conception logicielle;",
        '',
        "• de concevoir un logiciel orienté objet en appliquant un ensemble de principes et des méthodes heuristiques de génie logiciel;",
        '',
        "• de réaliser un logiciel en suivant un processus itératif et évolutif incluant les activités d'analyse et de conception par objets.",
        '',
        "Méthodes et techniques de modélisation orientés objet, langage de modélisation, cas d'utilisation, analyse orientée objet, modèle du domaine, conception et programmation orientées objet, principes GRASP, patrons de conception, processus itératif et évolutif.",
        '',
        "Séances de laboratoire axées sur l'application des notions d'analyse, de conception et de programmation orientées objet vues en classe. Mise en œuvre d'un modèle d'objet à partir d'une spécification de logiciel et à l'aide d'un langage orienté objet contemporain. Conception d'applications utilisant les outils UML ainsi que des techniques et des outils utiles au génie logiciel, tels qu'un environnement de développement intégré, la compilation automatique et les tests automatiques.",
      ].join('\n'),
    );
  });

  it('throws when the expected description element is missing', async () => {
    mockHtmlResponse(`
      <div id="contenuPDF">
        <div><span class="TitreSection">LOG210</span></div>
      </div>
    `);

    await expect(
      service.fetchCourseDescriptionFromPlanets('LOG210'),
    ).rejects.toThrow('Could not extract course description from PlanETS');
  });

  it('rejects when the HTTP request fails', async () => {
    jest
      .spyOn(httpService, 'get')
      .mockReturnValueOnce(throwError(() => new Error('socket hang up')));

    await expect(
      service.fetchCourseDescriptionFromPlanets('LOG210'),
    ).rejects.toThrow('socket hang up');
  });
});
