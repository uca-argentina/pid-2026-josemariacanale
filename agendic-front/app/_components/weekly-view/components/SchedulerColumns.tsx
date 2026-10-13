import React from 'react';

type Props = {
    gridStopsPerDay: number;
    children: React.ReactNode;
    zIndex?: number;
};

/** Una capa de columnas de la grilla, una por día, con una fila por celda; se apila sobre las demás en la misma celda del grid. */
export const SchedulerColumns = React.forwardRef<HTMLOListElement, Props>(function SchedulerColumns(
    { gridStopsPerDay, children, zIndex },
    ref,
) {
    return (
        <ol
            ref={ref}
            className="scheduler-grid-row-template scheduler-wrapper col-start-1 col-end-2 row-start-1 grid auto-cols-auto text-[0px]"
            style={{ marginTop: 'var(--gridDefaultSize)', zIndex }}
            data-gridstopsperday={gridStopsPerDay}
        >
            {children}
        </ol>
    );
});
