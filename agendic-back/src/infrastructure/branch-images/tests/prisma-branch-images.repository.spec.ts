import { DatabaseOperationError, NotFoundError } from '../../../domain/errors';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma.service';
import { PrismaBranchImagesRepository } from '../prisma-branch-images.repository';

const ROW = {
  id: 10,
  branchId: 1,
  url: 'https://files.example.com/1',
  order: 0,
};

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('vendor message', {
    code,
    clientVersion: '7.10.0',
  });

describe('PrismaBranchImagesRepository', () => {
  const tx = {
    $queryRaw: jest.fn(),
    branchImage: {
      aggregate: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const prisma = {
    branchImage: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((run: (client: typeof tx) => unknown) => run(tx)),
  };
  const repository = new PrismaBranchImagesRepository(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((run) => run(tx));
  });

  it("lists a Sucursal's images by order, ties broken by id", async () => {
    prisma.branchImage.findMany.mockResolvedValue([ROW]);

    await expect(repository.listByBranch(1)).resolves.toEqual([ROW]);
    expect(prisma.branchImage.findMany).toHaveBeenCalledWith({
      where: { branchId: 1 },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });
  });

  it('appends an image after the last order of its Sucursal, locking it against concurrent uploads', async () => {
    tx.branchImage.aggregate.mockResolvedValue({ _max: { order: 4 } });
    tx.branchImage.create.mockResolvedValue({ ...ROW, order: 5 });

    await expect(repository.append(1, ROW.url)).resolves.toEqual({
      ...ROW,
      order: 5,
    });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw.mock.calls[0][0].join('?')).toContain('FOR UPDATE');
    expect(tx.$queryRaw.mock.calls[0][1]).toBe(1);
    expect(tx.branchImage.aggregate).toHaveBeenCalledWith({
      where: { branchId: 1 },
      _max: { order: true },
    });
    expect(tx.branchImage.create).toHaveBeenCalledWith({
      data: { branchId: 1, url: ROW.url, order: 5 },
    });
  });

  it('gives the first image of a Sucursal order 0', async () => {
    tx.branchImage.aggregate.mockResolvedValue({ _max: { order: null } });
    tx.branchImage.create.mockResolvedValue(ROW);

    await repository.append(1, ROW.url);

    expect(tx.branchImage.create).toHaveBeenCalledWith({
      data: { branchId: 1, url: ROW.url, order: 0 },
    });
  });

  it('gives each image its position in the list as its order, within the Sucursal', async () => {
    const reordered = [
      { ...ROW, id: 11, order: 0 },
      { ...ROW, order: 1 },
    ];
    tx.branchImage.findMany.mockResolvedValue(reordered);

    await expect(repository.reorder(1, [11, 10])).resolves.toEqual(reordered);
    expect(tx.branchImage.update).toHaveBeenNthCalledWith(1, {
      where: { id: 11, branchId: 1 },
      data: { order: 0 },
    });
    expect(tx.branchImage.update).toHaveBeenNthCalledWith(2, {
      where: { id: 10, branchId: 1 },
      data: { order: 1 },
    });
  });

  it('translates a missing image into NotFoundError', async () => {
    prisma.branchImage.delete.mockRejectedValue(knownError('P2025'));

    await expect(repository.delete(10)).rejects.toThrow(NotFoundError);
  });

  it('translates any other failure into DatabaseOperationError', async () => {
    prisma.branchImage.findUnique.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(repository.findById(10)).rejects.toThrow(
      DatabaseOperationError,
    );
  });
});
