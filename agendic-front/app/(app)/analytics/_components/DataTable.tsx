'use client';

import * as React from 'react';
import {
    closestCenter,
    DndContext,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type UniqueIdentifier,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    columnFilteringFeature,
    columnVisibilityFeature,
    createColumnHelper,
    createFilteredRowModel,
    createPaginatedRowModel,
    createSortedRowModel,
    FlexRender,
    rowPaginationFeature,
    rowSelectionFeature,
    rowSortingFeature,
    tableFeatures,
    useTable,
    type ColumnFiltersState,
    type ColumnVisibilityState,
    type Row,
    type SortingState,
} from '@tanstack/react-table';
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    CircleCheck,
    Columns3,
    EllipsisVertical,
    EyeOff,
    GripVertical,
    Plus,
    TrendingUp,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { toast } from 'sonner';
import { useIsMobile } from '@/app/_components/hooks/use-mobile';
import { Badge } from '@/app/_components/ui/badge';
import { Button } from '@/app/_components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/app/_components/ui/chart';
import { Checkbox } from '@/app/_components/ui/checkbox';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@/app/_components/ui/drawer';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/app/_components/ui/dropdown-menu';
import { Input } from '@/app/_components/ui/input';
import { Label } from '@/app/_components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/ui/select';
import { Separator } from '@/app/_components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/_components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/_components/ui/tabs';
import { SERVICE_CATEGORIES } from '@/app/_components/business-schemas';
import { CATEGORY_LABELS, EMPLOYEES, bookingsByMonth, bookingsChartConfig, type ServiceRow } from './mock-analytics';

// TanStack Table v9: only the registered features end up in the bundle.
const features = tableFeatures({
    columnFilteringFeature,
    columnVisibilityFeature,
    rowPaginationFeature,
    rowSelectionFeature,
    rowSortingFeature,
    filteredRowModel: createFilteredRowModel(),
    paginatedRowModel: createPaginatedRowModel(),
    sortedRowModel: createSortedRowModel(),
});

const columnHelper = createColumnHelper<typeof features, ServiceRow>();

/** The header of each column that "Personalizar columnas" can hide. */
const LABELS: Record<string, string> = {
    category: 'Categoría de Servicio',
    hidden: 'Visible / Oculto',
    bookings: 'Turnos del mes',
    dailyLimit: 'Límite diario',
    employee: 'Empleado',
};

const VIEWS = [
    { value: 'services', label: 'Servicios' },
    { value: 'employees', label: 'Empleados', count: EMPLOYEES.length },
    { value: 'branches', label: 'Sucursales', count: 2 },
    { value: 'categories', label: 'Categorías' },
];

const INLINE_INPUT =
    'h-8 w-16 border-transparent bg-transparent text-right shadow-none hover:bg-input/30 focus-visible:border focus-visible:bg-background';

function saveInline(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
        loading: 'Guardando…',
        success: 'Guardado',
        error: 'No se pudo guardar. Probá de nuevo.',
    });
}

function DragHandle({ id }: { id: number }) {
    const { attributes, listeners } = useSortable({ id });

    return (
        <Button
            {...attributes}
            {...listeners}
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:bg-transparent"
            aria-label="Arrastrá para reordenar"
        >
            <GripVertical className="size-3 text-muted-foreground" />
        </Button>
    );
}

const columns = columnHelper.columns([
    columnHelper.display({
        id: 'drag',
        header: () => null,
        cell: ({ row }) => <DragHandle id={row.original.id} />,
    }),
    columnHelper.display({
        id: 'select',
        header: ({ table }) => (
            <div className="flex items-center justify-center">
                <Checkbox
                    checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Seleccionar todas"
                />
            </div>
        ),
        cell: ({ row }) => (
            <div className="flex items-center justify-center">
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label={`Seleccionar ${row.original.name}`}
                />
            </div>
        ),
        enableSorting: false,
        enableHiding: false,
    }),
    columnHelper.accessor('name', {
        header: 'Servicio',
        cell: ({ row }) => <TableCellViewer item={row.original} />,
        enableHiding: false,
    }),
    columnHelper.accessor('category', {
        header: LABELS.category,
        cell: ({ row }) => (
            <div className="w-32">
                <Badge variant="outline" className="px-1.5 text-muted-foreground">
                    {CATEGORY_LABELS[row.original.category]}
                </Badge>
            </div>
        ),
    }),
    columnHelper.accessor('hidden', {
        header: LABELS.hidden,
        cell: ({ row }) => (
            <Badge variant="outline" className="gap-1 px-1.5 text-muted-foreground">
                {row.original.hidden ? (
                    <EyeOff className="size-3" />
                ) : (
                    <CircleCheck className="size-3 fill-green-500 text-white" />
                )}
                {row.original.hidden ? 'Oculto' : 'Visible'}
            </Badge>
        ),
    }),
    columnHelper.accessor('bookings', {
        header: () => <div className="w-full text-right">{LABELS.bookings}</div>,
        cell: ({ row }) => (
            <form onSubmit={saveInline}>
                <Label htmlFor={`${row.original.id}-bookings`} className="sr-only">
                    {LABELS.bookings}
                </Label>
                <Input className={INLINE_INPUT} inputMode="numeric" defaultValue={row.original.bookings} id={`${row.original.id}-bookings`} />
            </form>
        ),
    }),
    columnHelper.accessor('dailyLimit', {
        header: () => <div className="w-full text-right">{LABELS.dailyLimit}</div>,
        cell: ({ row }) => (
            <form onSubmit={saveInline}>
                <Label htmlFor={`${row.original.id}-limit`} className="sr-only">
                    {LABELS.dailyLimit}
                </Label>
                <Input className={INLINE_INPUT} inputMode="numeric" defaultValue={row.original.dailyLimit} id={`${row.original.id}-limit`} />
            </form>
        ),
    }),
    columnHelper.accessor('employee', {
        header: LABELS.employee,
        cell: ({ row }) => {
            if (row.original.employee) {
                return row.original.employee;
            }

            return (
                <>
                    <Label htmlFor={`${row.original.id}-employee`} className="sr-only">
                        {LABELS.employee}
                    </Label>
                    <Select>
                        <SelectTrigger
                            className="w-38 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
                            size="sm"
                            id={`${row.original.id}-employee`}
                        >
                            <SelectValue placeholder="Asignar Empleado" />
                        </SelectTrigger>
                        <SelectContent align="end">
                            <SelectGroup>
                                {EMPLOYEES.map((employee) => (
                                    <SelectItem key={employee} value={employee}>
                                        {employee}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </>
            );
        },
    }),
    columnHelper.display({
        id: 'actions',
        cell: ({ row }) => (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="flex size-8 text-muted-foreground data-[state=open]:bg-muted"
                        size="icon"
                        aria-label={`Acciones de ${row.original.name}`}
                    >
                        <EllipsisVertical />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                    <DropdownMenuItem>Editar</DropdownMenuItem>
                    <DropdownMenuItem>Ocultar</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive hover:text-destructive focus:text-destructive">
                        Dar de baja
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        ),
    }),
]);

function DraggableRow({ row }: { row: Row<typeof features, ServiceRow> }) {
    const { transform, transition, setNodeRef, isDragging } = useSortable({ id: row.original.id });

    return (
        <TableRow
            data-state={row.getIsSelected() && 'selected'}
            data-dragging={isDragging}
            ref={setNodeRef}
            className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
            style={{ transform: CSS.Transform.toString(transform), transition }}
        >
            {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                    <FlexRender cell={cell} />
                </TableCell>
            ))}
        </TableRow>
    );
}

/**
 * La tabla de Servicios de Analíticas, copia del bloque `dashboard-01`: reordenar arrastrando, selección, edición en
 * línea, columnas configurables, paginación y detalle. Los cambios no se guardan en ninguna parte.
 */
export function DataTable({ data: initialData }: { data: ServiceRow[] }) {
    const [data, setData] = React.useState(() => initialData);
    const [view, setView] = React.useState('services');
    const [rowSelection, setRowSelection] = React.useState({});
    const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({});
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
    const sortableId = React.useId();
    const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}));

    const dataIds = React.useMemo<UniqueIdentifier[]>(() => data.map(({ id }) => id), [data]);

    const table = useTable({
        features,
        data,
        columns,
        state: { sorting, columnVisibility, rowSelection, columnFilters, pagination },
        getRowId: (row) => row.id.toString(),
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onPaginationChange: setPagination,
    });

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            setData((data) => arrayMove(data, dataIds.indexOf(active.id), dataIds.indexOf(over.id)));
        }
    }

    return (
        <Tabs value={view} onValueChange={setView} className="w-full flex-col justify-start gap-6">
            <div className="flex items-center justify-between px-4 lg:px-6">
                <Label htmlFor="view-selector" className="sr-only">
                    Vista
                </Label>
                <Select value={view} onValueChange={setView}>
                    <SelectTrigger className="flex w-fit @4xl/main:hidden" size="sm" id="view-selector">
                        <SelectValue placeholder="Elegí una vista" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            {VIEWS.map((v) => (
                                <SelectItem key={v.value} value={v.value}>
                                    {v.label}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
                <TabsList className="hidden @4xl/main:flex">
                    {VIEWS.map((v) => (
                        <TabsTrigger key={v.value} value={v.value}>
                            {v.label}
                            {v.count ? (
                                <Badge variant="secondary" className="size-5 rounded-full bg-muted-foreground/30 px-1 text-foreground">
                                    {v.count}
                                </Badge>
                            ) : null}
                        </TabsTrigger>
                    ))}
                </TabsList>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Columns3 data-icon="inline-start" />
                                <span className="hidden @3xl/main:inline">Personalizar columnas</span>
                                <span className="@3xl/main:hidden">Columnas</span>
                                <ChevronDown data-icon="inline-end" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            {table
                                .getAllColumns()
                                .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide())
                                .map((column) => (
                                    <DropdownMenuCheckboxItem
                                        key={column.id}
                                        checked={column.getIsVisible()}
                                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                    >
                                        {LABELS[column.id]}
                                    </DropdownMenuCheckboxItem>
                                ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" size="sm" aria-label="Agregar Servicio">
                        <Plus />
                        <span className="hidden @3xl/main:inline">Agregar Servicio</span>
                    </Button>
                </div>
            </div>
            <TabsContent value="services" className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
                <div className="overflow-hidden rounded-lg border">
                    <DndContext
                        collisionDetection={closestCenter}
                        modifiers={[restrictToVerticalAxis]}
                        onDragEnd={handleDragEnd}
                        sensors={sensors}
                        id={sortableId}
                    >
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-muted">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <TableHead key={header.id} colSpan={header.colSpan}>
                                                {header.isPlaceholder ? null : <FlexRender header={header} />}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody className="**:data-[slot=table-cell]:first:w-8">
                                {table.getRowModel().rows.length ? (
                                    <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
                                        {table.getRowModel().rows.map((row) => (
                                            <DraggableRow key={row.id} row={row} />
                                        ))}
                                    </SortableContext>
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center">
                                            No hay Servicios. Creá uno con Agregar Servicio.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </DndContext>
                </div>
                <div className="flex items-center justify-between px-4">
                    <div className="hidden flex-1 text-sm text-muted-foreground @3xl/main:flex">
                        {table.getFilteredSelectedRowModel().rows.length} de {table.getFilteredRowModel().rows.length}{' '}
                        filas seleccionadas
                    </div>
                    <div className="flex w-full items-center gap-8 @3xl/main:w-fit">
                        <div className="hidden items-center gap-2 @3xl/main:flex">
                            <Label htmlFor="rows-per-page" className="text-sm font-medium">
                                Filas por página
                            </Label>
                            <Select
                                value={`${table.state.pagination.pageSize}`}
                                onValueChange={(value) => table.setPageSize(Number(value))}
                            >
                                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                                    <SelectValue placeholder={table.state.pagination.pageSize} />
                                </SelectTrigger>
                                <SelectContent side="top">
                                    <SelectGroup>
                                        {[10, 20, 30, 40, 50].map((pageSize) => (
                                            <SelectItem key={pageSize} value={`${pageSize}`}>
                                                {pageSize}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex w-fit items-center justify-center text-sm font-medium">
                            Página {table.state.pagination.pageIndex + 1} de {table.getPageCount()}
                        </div>
                        <div className="ml-auto flex items-center gap-2 @3xl/main:ml-0">
                            <Button
                                variant="outline"
                                className="hidden h-8 w-8 p-0 @3xl/main:flex"
                                onClick={() => table.setPageIndex(0)}
                                disabled={!table.getCanPreviousPage()}
                                aria-label="Ir a la primera página"
                            >
                                <ChevronsLeft />
                            </Button>
                            <Button
                                variant="outline"
                                className="size-8"
                                size="icon"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                                aria-label="Ir a la página anterior"
                            >
                                <ChevronLeft />
                            </Button>
                            <Button
                                variant="outline"
                                className="size-8"
                                size="icon"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                                aria-label="Ir a la página siguiente"
                            >
                                <ChevronRight />
                            </Button>
                            <Button
                                variant="outline"
                                className="hidden size-8 @3xl/main:flex"
                                size="icon"
                                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                                disabled={!table.getCanNextPage()}
                                aria-label="Ir a la última página"
                            >
                                <ChevronsRight />
                            </Button>
                        </div>
                    </div>
                </div>
            </TabsContent>
            {VIEWS.slice(1).map((v) => (
                <TabsContent key={v.value} value={v.value} className="flex flex-col px-4 lg:px-6">
                    <div className="aspect-video w-full flex-1 rounded-lg border border-dashed" />
                </TabsContent>
            ))}
        </Tabs>
    );
}

function TableCellViewer({ item }: { item: ServiceRow }) {
    const isMobile = useIsMobile();

    return (
        <Drawer direction={isMobile ? 'bottom' : 'right'}>
            <DrawerTrigger asChild>
                <Button variant="link" className="w-fit px-0 text-left text-foreground">
                    {item.name}
                </Button>
            </DrawerTrigger>
            <DrawerContent>
                <DrawerHeader className="gap-1">
                    <DrawerTitle>{item.name}</DrawerTitle>
                    <DrawerDescription>Turnos de los últimos 6 meses</DrawerDescription>
                </DrawerHeader>
                <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
                    {!isMobile && (
                        <>
                            <ChartContainer config={bookingsChartConfig}>
                                <AreaChart accessibilityLayer data={bookingsByMonth} margin={{ left: 0, right: 10 }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        tickFormatter={(value) => value.slice(0, 3)}
                                        hide
                                    />
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                                    <Area
                                        dataKey="cancelled"
                                        type="natural"
                                        fill="var(--color-cancelled)"
                                        fillOpacity={0.6}
                                        stroke="var(--color-cancelled)"
                                        stackId="a"
                                    />
                                    <Area
                                        dataKey="accepted"
                                        type="natural"
                                        fill="var(--color-accepted)"
                                        fillOpacity={0.4}
                                        stroke="var(--color-accepted)"
                                        stackId="a"
                                    />
                                </AreaChart>
                            </ChartContainer>
                            <Separator />
                            <div className="grid gap-2">
                                <div className="flex gap-2 leading-none font-medium">
                                    En alza un 5,2% este mes <TrendingUp className="size-4" />
                                </div>
                                <div className="text-muted-foreground">
                                    Turnos aceptados y cancelados de los últimos 6 meses. Es un texto de ejemplo para
                                    probar el diseño: ocupa varias líneas y se acomoda al ancho.
                                </div>
                            </div>
                            <Separator />
                        </>
                    )}
                    <form className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3">
                            <Label htmlFor="name">Servicio</Label>
                            <Input id="name" defaultValue={item.name} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-3">
                                <Label htmlFor="category">Categoría de Servicio</Label>
                                <Select defaultValue={item.category}>
                                    <SelectTrigger id="category" className="w-full">
                                        <SelectValue placeholder="Elegí una Categoría de Servicio" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {SERVICE_CATEGORIES.map((c) => (
                                                <SelectItem key={c.value} value={c.value}>
                                                    {c.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-3">
                                <Label htmlFor="status">Estado</Label>
                                <Select defaultValue={item.hidden ? 'hidden' : 'visible'}>
                                    <SelectTrigger id="status" className="w-full">
                                        <SelectValue placeholder="Elegí un estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="visible">Visible</SelectItem>
                                            <SelectItem value="hidden">Oculto</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-3">
                                <Label htmlFor="bookings">Turnos del mes</Label>
                                <Input id="bookings" inputMode="numeric" defaultValue={item.bookings} />
                            </div>
                            <div className="flex flex-col gap-3">
                                <Label htmlFor="limit">Límite diario</Label>
                                <Input id="limit" inputMode="numeric" defaultValue={item.dailyLimit} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-3">
                            <Label htmlFor="employee">Empleado</Label>
                            <Select defaultValue={item.employee ?? undefined}>
                                <SelectTrigger id="employee" className="w-full">
                                    <SelectValue placeholder="Asignar Empleado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {EMPLOYEES.map((employee) => (
                                            <SelectItem key={employee} value={employee}>
                                                {employee}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                    </form>
                </div>
                <DrawerFooter>
                    <Button>Guardar</Button>
                    <DrawerClose asChild>
                        <Button variant="outline">Cerrar</Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}
