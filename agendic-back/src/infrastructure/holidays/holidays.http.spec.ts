import { NotConfiguredError } from '../../domain/errors';
import {
  bearer,
  CLERK_TOKEN,
  createTestApp,
  scriptSession,
  TestApp,
} from '../../test-app';

describe('GET /holidays/countries', () => {
  let t: TestApp;

  beforeEach(async () => {
    t = await createTestApp();
    scriptSession(t);
  });
  afterEach(() => t.app.close());

  it('answers the five religious calendars first, then the countries by name in Spanish', async () => {
    const res = await t.http
      .get('/holidays/countries')
      .set(bearer(CLERK_TOKEN))
      .expect(200);

    const body = res.body as { code: string; name: string }[];
    expect(body.slice(0, 5)).toEqual([
      { code: 'CHRISTIAN', name: 'Feriados cristianos' },
      { code: 'HINDU', name: 'Feriados hindúes' },
      { code: 'JEWISH', name: 'Feriados judíos' },
      { code: 'MUSLIM', name: 'Feriados musulmanes' },
      { code: 'ORTHODOX', name: 'Feriados ortodoxos' },
    ]);
    expect(body[5]).toEqual({ code: 'AF', name: 'Afganistán' });
    expect(body).toContainEqual({ code: 'AR', name: 'Argentina' });
    const names = body.slice(5).map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')));
  });

  it('needs a Sesión', async () => {
    await t.http.get('/holidays/countries').expect(401);
  });

  it('answers 503 without GOOGLE_CALENDAR_API_KEY', async () => {
    t.googleCalendar.assertConfigured.mockImplementation(() => {
      throw new NotConfiguredError('Días festivos no configurados');
    });

    const res = await t.http
      .get('/holidays/countries')
      .set(bearer(CLERK_TOKEN))
      .expect(503);

    expect(res.body).toEqual({
      statusCode: 503,
      message: 'Días festivos no configurados',
    });
  });
});
