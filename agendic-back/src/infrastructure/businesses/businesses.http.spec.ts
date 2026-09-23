import { ConflictError } from '../../domain/errors';
import { ServiceCategory } from '../../domain/services/service';
import {
  ANA,
  ANAS_BRANCH,
  ANAS_BUSINESS,
  ANAS_EMPLOYEE,
  bearer,
  BRUNO,
  createTestApp,
  OTHER_CLERK_TOKEN,
  scriptOtherSession,
  scriptSession,
  CLERK_TOKEN,
  TestApp,
} from '../../test-app';

const BUSINESS_PART = {
  name: ANAS_BUSINESS.name,
  description: ANAS_BUSINESS.description,
  slug: ANAS_BUSINESS.slug,
};

const BRANCH_PART = {
  name: ANAS_BRANCH.name,
  address: ANAS_BRANCH.address,
  opensAt: ANAS_BRANCH.opensAt,
  closesAt: ANAS_BRANCH.closesAt,
};

const SERVICE_PART = {
  name: 'Haircut',
  description: 'A basic haircut',
  category: ServiceCategory.SPA,
  durationMinutes: 30,
  price: 20,
};

const VALID_BODY = {
  business: BUSINESS_PART,
  branch: BRANCH_PART,
  service: SERVICE_PART,
};

/** What the API presents for a Negocio: no `clerkOrgId`, an internal identifier the front never sees. */
const PRESENTED_BUSINESS = {
  id: ANAS_BUSINESS.id,
  name: ANAS_BUSINESS.name,
  description: ANAS_BUSINESS.description,
  ownerId: ANAS_BUSINESS.ownerId,
  slug: ANAS_BUSINESS.slug,
};

const ANAS_SERVICE = {
  id: 1,
  branchId: ANAS_BRANCH.id,
  ...SERVICE_PART,
  retiredAt: null,
  employees: [{ id: ANAS_EMPLOYEE.id, name: ANAS_EMPLOYEE.name }],
};

const CREATED = {
  business: ANAS_BUSINESS,
  branch: ANAS_BRANCH,
  service: ANAS_SERVICE,
  employee: ANAS_EMPLOYEE,
};

describe('Negocio', () => {
  let t: TestApp;

  beforeEach(async () => (t = await createTestApp()));
  afterEach(() => t.app.close());

  describe('POST /businesses', () => {
    beforeEach(() => {
      scriptSession(t);
      t.users.findById.mockResolvedValue(ANA);
      t.clerkAuth.createOrganization.mockResolvedValue(
        ANAS_BUSINESS.clerkOrgId,
      );
    });

    it('creates the Negocio, its Sucursal, its Servicio and the Dueño as its Empleado', async () => {
      t.businesses.create.mockResolvedValue(CREATED);

      const res = await t.http
        .post('/businesses')
        .set(bearer(CLERK_TOKEN))
        .send(VALID_BODY)
        .expect(201);

      expect(t.clerkAuth.createOrganization).toHaveBeenCalledWith(
        BUSINESS_PART.name,
        ANA.clerkId,
      );
      expect(t.businesses.create).toHaveBeenCalledWith({
        business: {
          ...BUSINESS_PART,
          ownerId: ANA.id,
          clerkOrgId: ANAS_BUSINESS.clerkOrgId,
        },
        branch: BRANCH_PART,
        service: SERVICE_PART,
        employee: {
          clerkId: ANA.clerkId,
          name: ANA.name,
          email: ANA.email,
        },
      });
      expect(res.body).toEqual({
        business: PRESENTED_BUSINESS,
        branch: ANAS_BRANCH,
        service: {
          id: ANAS_SERVICE.id,
          branchId: ANAS_SERVICE.branchId,
          name: ANAS_SERVICE.name,
          description: ANAS_SERVICE.description,
          category: ANAS_SERVICE.category,
          durationMinutes: ANAS_SERVICE.durationMinutes,
          price: ANAS_SERVICE.price,
          employees: [{ id: ANAS_EMPLOYEE.id, name: ANAS_EMPLOYEE.name }],
        },
        employee: {
          id: ANAS_EMPLOYEE.id,
          name: ANAS_EMPLOYEE.name,
          email: ANAS_EMPLOYEE.email,
        },
      });
    });

    it('creates a Servicio without a description', async () => {
      t.businesses.create.mockResolvedValue(CREATED);

      await t.http
        .post('/businesses')
        .set(bearer(CLERK_TOKEN))
        .send({
          ...VALID_BODY,
          service: { ...SERVICE_PART, description: undefined },
        })
        .expect(201);

      expect(t.businesses.create).toHaveBeenCalledWith(
        expect.objectContaining({
          service: { ...SERVICE_PART, description: null },
        }),
      );
    });

    it('lets the same Usuario create a further Negocio the same way', async () => {
      const second = {
        ...CREATED,
        business: { ...ANAS_BUSINESS, id: 2, name: "Ana's Spa" },
      };
      t.businesses.create.mockResolvedValueOnce(CREATED);
      t.businesses.create.mockResolvedValueOnce(second);

      await t.http
        .post('/businesses')
        .set(bearer(CLERK_TOKEN))
        .send(VALID_BODY)
        .expect(201);
      const res = await t.http
        .post('/businesses')
        .set(bearer(CLERK_TOKEN))
        .send({
          ...VALID_BODY,
          business: { ...BUSINESS_PART, name: "Ana's Spa" },
        })
        .expect(201);

      expect(t.businesses.create).toHaveBeenCalledTimes(2);
      expect(res.body.business.id).toBe(2);
    });

    it('normalizes the Enlace de reserva to lowercase', async () => {
      t.businesses.create.mockResolvedValue(CREATED);

      await t.http
        .post('/businesses')
        .set(bearer(CLERK_TOKEN))
        .send({
          ...VALID_BODY,
          business: { ...BUSINESS_PART, slug: 'Anas-SALON' },
        })
        .expect(201);

      expect(t.businesses.create).toHaveBeenCalledWith(
        expect.objectContaining({
          business: expect.objectContaining({ slug: 'anas-salon' }),
        }),
      );
    });

    it('answers 409 when the Enlace de reserva is already in use', async () => {
      t.businesses.create.mockRejectedValue(
        new ConflictError('Booking link already in use'),
      );

      const res = await t.http
        .post('/businesses')
        .set(bearer(CLERK_TOKEN))
        .send(VALID_BODY)
        .expect(409);

      expect(res.body.message).toBe('Booking link already in use');
    });

    it('answers 401 without a Sesión', async () => {
      await t.http.post('/businesses').send(VALID_BODY).expect(401);
    });

    it('answers 422 when the Sucursal closes before it opens', async () => {
      await t.http
        .post('/businesses')
        .set(bearer(CLERK_TOKEN))
        .send({
          ...VALID_BODY,
          branch: { ...BRANCH_PART, opensAt: '18:00', closesAt: '09:00' },
        })
        .expect(422);

      expect(t.businesses.create).not.toHaveBeenCalled();
    });

    it.each([
      ['a blank Negocio name', { business: { ...BUSINESS_PART, name: '  ' } }],
      ['a missing Negocio name', { business: { description: 'y' } }],
      [
        'a missing Negocio description',
        { business: { name: ANAS_BUSINESS.name, slug: ANAS_BUSINESS.slug } },
      ],
      [
        'a missing Enlace de reserva',
        { business: { name: ANAS_BUSINESS.name, description: 'y' } },
      ],
      [
        'an Enlace de reserva with invalid characters',
        { business: { ...BUSINESS_PART, slug: 'anas salon!' } },
      ],
      [
        'an Enlace de reserva with a leading hyphen',
        { business: { ...BUSINESS_PART, slug: '-anas-salon' } },
      ],
      [
        'a too short Enlace de reserva',
        { business: { ...BUSINESS_PART, slug: 'ab' } },
      ],
      [
        'a too long Enlace de reserva',
        { business: { ...BUSINESS_PART, slug: 'a'.repeat(41) } },
      ],
      ['a missing Sucursal', { branch: undefined }],
      [
        'a blank Sucursal address',
        { branch: { ...BRANCH_PART, address: ' ' } },
      ],
      ['a malformed opensAt', { branch: { ...BRANCH_PART, opensAt: '9am' } }],
      ['a missing Servicio', { service: undefined }],
      ['a blank Servicio name', { service: { ...SERVICE_PART, name: ' ' } }],
      [
        'a fractional durationMinutes',
        { service: { ...SERVICE_PART, durationMinutes: 1.5 } },
      ],
      ['a negative price', { service: { ...SERVICE_PART, price: -1 } }],
      [
        'employeeIds on the Servicio',
        { service: { ...SERVICE_PART, employeeIds: [1] } },
      ],
      ['an unknown field', { ownerId: 999 }],
    ])(
      'rejects %s with 400, without reaching the repository',
      async (_, override) => {
        await t.http
          .post('/businesses')
          .set(bearer(CLERK_TOKEN))
          .send({ ...VALID_BODY, ...override })
          .expect(400);

        expect(t.businesses.create).not.toHaveBeenCalled();
      },
    );
  });

  describe('PATCH /businesses/:id', () => {
    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);
    });

    it('edits name and description, for the Dueño', async () => {
      t.businesses.update.mockResolvedValue({
        ...ANAS_BUSINESS,
        name: 'New name',
      });

      const res = await t.http
        .patch(`/businesses/${ANAS_BUSINESS.id}`)
        .set(bearer(CLERK_TOKEN))
        .send({ name: 'New name' })
        .expect(200);

      expect(t.businesses.update).toHaveBeenCalledWith(ANAS_BUSINESS.id, {
        name: 'New name',
      });
      expect(res.body.name).toBe('New name');
    });

    it('answers 403 for another Usuario', async () => {
      await t.http
        .patch(`/businesses/${ANAS_BUSINESS.id}`)
        .set(bearer(OTHER_CLERK_TOKEN))
        .send({ name: 'New name' })
        .expect(403);

      expect(t.businesses.update).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown Negocio', async () => {
      t.businesses.findById.mockResolvedValue(null);

      await t.http
        .patch('/businesses/999')
        .set(bearer(CLERK_TOKEN))
        .send({ name: 'New name' })
        .expect(404);
    });

    it('answers 401 without a Sesión', async () => {
      await t.http
        .patch(`/businesses/${ANAS_BUSINESS.id}`)
        .send({ name: 'New name' })
        .expect(401);
    });

    it.each([
      ['a blank name', { name: ' ' }],
      ['a null name', { name: null }],
      ['a blank description', { description: ' ' }],
      ['a null description', { description: null }],
    ])(
      'rejects %s with 400, without reaching the repository',
      async (_, body) => {
        await t.http
          .patch(`/businesses/${ANAS_BUSINESS.id}`)
          .set(bearer(CLERK_TOKEN))
          .send(body)
          .expect(400);

        expect(t.businesses.update).not.toHaveBeenCalled();
      },
    );
  });

  describe('GET /businesses', () => {
    beforeEach(() => {
      scriptSession(t);
      scriptOtherSession(t);
    });

    it('lists the Negocios of the Dueño of the Sesión', async () => {
      t.businesses.listByOwner.mockResolvedValue([ANAS_BUSINESS]);

      const res = await t.http
        .get('/businesses')
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(t.businesses.listByOwner).toHaveBeenCalledWith(ANA.id);
      expect(res.body).toEqual([PRESENTED_BUSINESS]);
    });

    it('lists another Usuario only his own Negocios', async () => {
      const brunosBusiness = {
        ...ANAS_BUSINESS,
        id: 2,
        name: "Bruno's Gym",
        ownerId: BRUNO.id,
        slug: 'brunos-gym',
      };
      t.businesses.listByOwner.mockResolvedValue([brunosBusiness]);

      const res = await t.http
        .get('/businesses')
        .set(bearer(OTHER_CLERK_TOKEN))
        .expect(200);

      expect(t.businesses.listByOwner).toHaveBeenCalledWith(BRUNO.id);
      expect(res.body).toEqual([
        {
          id: brunosBusiness.id,
          name: brunosBusiness.name,
          description: brunosBusiness.description,
          ownerId: BRUNO.id,
          slug: brunosBusiness.slug,
        },
      ]);
    });

    it('answers 200 with an empty list for a Usuario without Negocios', async () => {
      t.businesses.listByOwner.mockResolvedValue([]);

      const res = await t.http
        .get('/businesses')
        .set(bearer(CLERK_TOKEN))
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('answers 401 without a Sesión', async () => {
      await t.http.get('/businesses').expect(401);

      expect(t.businesses.listByOwner).not.toHaveBeenCalled();
    });
  });

  describe('GET /businesses/:id', () => {
    it('returns a Negocio without a Sesión', async () => {
      t.businesses.findById.mockResolvedValue(ANAS_BUSINESS);

      const res = await t.http
        .get(`/businesses/${ANAS_BUSINESS.id}`)
        .expect(200);

      expect(res.body).toEqual(PRESENTED_BUSINESS);
    });

    it('answers 404 for an unknown Negocio', async () => {
      t.businesses.findById.mockResolvedValue(null);

      await t.http.get('/businesses/999').expect(404);
    });
  });
});
