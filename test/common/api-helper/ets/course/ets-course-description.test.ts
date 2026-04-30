import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosHeaders, AxiosResponse } from 'axios';
import { readFileSync } from 'fs';
import { join } from 'path';
import { of } from 'rxjs';

import { EtsCourseService } from '../../../../../src/common/api-helper/ets/course/ets-course.service';

const HTML_ASSETS_DIR = join(__dirname, '../../../../assets/html');

const readHtmlAsset = (filename: string): string => {
  return readFileSync(join(HTML_ASSETS_DIR, filename), 'utf8');
};

describe('EtsCourseService course description parsing', () => {
  let service: EtsCourseService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EtsCourseService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EtsCourseService>(EtsCourseService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('extracts UI-friendly normalized plain text from a real GTI350 course page', async () => {
    const html = readHtmlAsset('ets-course-gti350.html');

    const response: AxiosResponse<string> = {
      data: html,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {
        headers: new AxiosHeaders(),
      },
    };

    jest.spyOn(httpService, 'get').mockReturnValueOnce(of(response));

    await expect(
      service.fetchCourseDescriptionFromEtsWebsite('GTI350'),
    ).resolves.toBe(
      [
        'Au terme de ce cours, l’étudiante ou l’étudiant sera en mesure :',
        '',
        "- de faire des choix judicieux lors de la conception d'une interface utilisateur, en appliquant des directives de conception et en respectant les besoins des utilisateurs;",
        "- de réaliser des prototypes de l'interface conçue;",
        "- d'appliquer des méthodes d'évaluation pour valider les prototypes et guider leur modification.",
        '',
        "Étapes de spécification, de conception, de développement, et d'évaluation des interfaces utilisateurs selon les principes du génie des TI. Conception itérative et centrée sur l'utilisateur. Analyse des tâches. Directives de conception. Techniques de prototypage. Programmation événementielle. Perception visuelle. Styles et techniques d'interaction. Dispositifs d'entrée et de sortie. Loi de Fitts. Méthodes d’évaluation qualitative et quantitative des interfaces.",
        '',
        'Séances de laboratoire axées sur l’application des concepts vus en classe.',
      ].join('\n'),
    );
  });

  it('removes dangerous scripts inside the description block', () => {
    const html = `
      <main>
        <h1>LOG210 - Analyse et conception de logiciels</h1>
        <div class="c-fold__text o-text"><div><p>Premier paragraphe.</p></div>
        <script>alert('very scary xss')</script>
        <ul><li>Point A</li><li>Point B</li></ul>
        </div>
      </main>
    `;
    const response: AxiosResponse<string> = {
      data: html,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {
        headers: new AxiosHeaders(),
      },
    };

    jest.spyOn(httpService, 'get').mockReturnValueOnce(of(response));

    return expect(
      service.fetchCourseDescriptionFromEtsWebsite('LOG210'),
    ).resolves.toBe(
      ['Premier paragraphe.', '', '- Point A', '- Point B'].join('\n'),
    );
  });

  it('prefers the c-fold description block over surrounding page content', () => {
    const html = `
      <main>
        <div class="o-boxed-info__text"><ul><li>LOG121</li></ul></div>
        <h1>LOG210 - Analyse et conception de logiciels</h1>
        <div class="c-fold__text o-text">
          <p>Description ciblée.</p>
          <ul><li>Élément 1</li></ul>
        </div>
        <footer><p>Texte de pied de page</p></footer>
      </main>
    `;
    const response: AxiosResponse<string> = {
      data: html,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {
        headers: new AxiosHeaders(),
      },
    };

    jest.spyOn(httpService, 'get').mockReturnValueOnce(of(response));

    return expect(
      service.fetchCourseDescriptionFromEtsWebsite('LOG210'),
    ).resolves.toBe(
      ['Description ciblée.', '', '- Élément 1'].join('\n'),
    );
  });

  it('throws when the expected description block is missing', async () => {
    const html = `
      <main>
        <h1>LOG210 - Analyse et conception de logiciels</h1>
        <p>Texte libre hors du conteneur attendu.</p>
      </main>
    `;
    const response: AxiosResponse<string> = {
      data: html,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {
        headers: new AxiosHeaders(),
      },
    };

    jest.spyOn(httpService, 'get').mockReturnValueOnce(of(response));

    await expect(
      service.fetchCourseDescriptionFromEtsWebsite('LOG210'),
    ).rejects.toThrow(
      'Could not extract course description from ETS website',
    );
  });
});
