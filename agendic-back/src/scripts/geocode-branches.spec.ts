import {
  geocodeAddress,
  geocodeBranches,
  GeocodeResult,
} from './geocode-branches';

const branch = (id: number, address = `Calle ${id}`) => ({
  id,
  name: `Sucursal ${id}`,
  address,
});

describe('geocodeBranches', () => {
  it('guarda el punto de las que geocodifica y lista las que fallan', async () => {
    const results: Record<string, GeocodeResult> = {
      'Calle 1': { kind: 'found', latitude: -34.6, longitude: -58.4 },
      'Calle 2': { kind: 'none', reason: 'sin resultado' },
      'Calle 3': { kind: 'none', reason: 'baja precisión (APPROXIMATE)' },
    };
    const save = jest.fn();

    const report = await geocodeBranches(
      [branch(1), branch(2), branch(3)],
      async (address) => results[address],
      save,
    );

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(1, -34.6, -58.4);
    expect(report.completed).toBe(1);
    expect(report.failed).toEqual([
      { ...branch(2), reason: 'sin resultado' },
      { ...branch(3), reason: 'baja precisión (APPROXIMATE)' },
    ]);
  });
});

describe('geocodeAddress', () => {
  const respond = (body: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => body,
    } as Response);

  afterEach(() => jest.restoreAllMocks());

  it('toma el primer resultado', async () => {
    respond({
      status: 'OK',
      results: [
        {
          geometry: {
            location: { lat: -34.6, lng: -58.4 },
            location_type: 'ROOFTOP',
          },
        },
      ],
    });
    expect(await geocodeAddress('k', 'Calle 1')).toEqual({
      kind: 'found',
      latitude: -34.6,
      longitude: -58.4,
    });
  });

  it('rechaza APPROXIMATE', async () => {
    respond({
      status: 'OK',
      results: [
        {
          geometry: {
            location: { lat: 1, lng: 2 },
            location_type: 'APPROXIMATE',
          },
        },
      ],
    });
    expect(await geocodeAddress('k', 'Calle 1')).toMatchObject({
      kind: 'none',
    });
  });

  it('ZERO_RESULTS es sin resultado', async () => {
    respond({ status: 'ZERO_RESULTS', results: [] });
    expect(await geocodeAddress('k', 'x')).toMatchObject({ kind: 'none' });
  });

  it('un error de la API corta sin loguear la key', async () => {
    respond({ status: 'REQUEST_DENIED', error_message: 'bad key' });
    await expect(geocodeAddress('SECRET', 'x')).rejects.toThrow(
      /REQUEST_DENIED: bad key/,
    );
    await expect(geocodeAddress('SECRET', 'x')).rejects.not.toThrow(/SECRET/);
  });
});
