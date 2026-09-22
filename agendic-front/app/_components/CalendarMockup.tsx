import { Button } from './ui/button';
import { Card } from './ui/card';

export function CalendarMockup() {
    return (
        <div className="mx-16 mt-12 relative h-[520px] overflow-hidden">
            <div className="absolute inset-x-0 top-0 -bottom-[60px] bg-white border border-[#d6dbe6] rounded-t-[16px] shadow-[0_24px_60px_rgba(15,27,45,0.12)] grid grid-cols-[200px_1fr]">
                {/* Sidebar */}
                <div className="border-r border-[#e6e9f0] px-4 py-5 flex flex-col gap-1.5 text-[14px]">
                    <div className="font-extrabold mb-3 text-[#0f1b2d]">
                        agendic<span className="text-[#2d5bff]">.</span>
                    </div>
                    <div className="px-3 py-[9px] rounded-lg bg-[#e8edff] text-[#2d5bff] font-semibold">
                        Agenda
                    </div>
                    <div className="px-3 py-[9px] text-[#4b5567]">Clientes</div>
                    <div className="px-3 py-[9px] text-[#4b5567]">
                        Profesionales
                    </div>
                    <div className="px-3 py-[9px] text-[#4b5567]">
                        Sucursales
                    </div>
                    <div className="px-3 py-[9px] text-[#4b5567]">
                        Lista de espera
                    </div>
                    <div className="mt-auto text-[12px] text-[#6b7587] p-3 bg-[#f3f5fa] rounded-lg">
                        <div className="font-semibold text-[#0f1b2d]">
                            Sucursal Centro
                        </div>
                        Lun–Sáb · 9:00–19:00
                    </div>
                </div>

                {/* Right Pane */}
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-[18px] font-bold text-[#0f1b2d]">
                            Semana del 14 al 19 de septiembre
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="px-3 py-[7px] border border-[#d6dbe6] rounded-lg text-[13px] font-semibold text-[#0f1b2d] h-auto bg-white hover:bg-gray-50"
                            >
                                Todos los profesionales
                            </Button>
                            <Button
                                size="sm"
                                className="px-3 py-[7px] bg-[#2d5bff] text-white rounded-lg text-[13px] font-semibold h-auto border-0 hover:bg-[#2d5bff]/90"
                            >
                                + Nuevo turno
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-[48px_repeat(6,1fr)] gap-0 text-[12px] text-[#6b7587] border-b border-[#e6e9f0] pb-2">
                        <div></div>
                        <div>Lun 14</div>
                        <div>Mar 15</div>
                        <div>Mié 16</div>
                        <div>Jue 17</div>
                        <div>Vie 18</div>
                        <div>Sáb 19</div>
                    </div>

                    <div
                        className="grid grid-cols-[48px_repeat(6,1fr)] relative h-[440px]"
                        style={{
                            backgroundImage:
                                'repeating-linear-gradient(to bottom, transparent 0 59px, #eef0f5 59px 60px)',
                        }}
                    >
                        <div className="text-[11px] text-[#9aa6ba] flex flex-col justify-between p-0 h-[420px]">
                            <span>9:00</span>
                            <span>10:00</span>
                            <span>11:00</span>
                            <span>12:00</span>
                            <span>13:00</span>
                            <span>14:00</span>
                            <span>15:00</span>
                            <span>16:00</span>
                        </div>

                        {/* Lunes */}
                        <div className="relative border-l border-[#eef0f5]">
                            <div className="absolute top-1 left-1 right-1 h-[52px] bg-[#e8edff] border-l-[3px] border-[#2d5bff] rounded-md px-2 py-1.5 text-[12px]">
                                <b className="text-[#0f1b2d]">
                                    Consulta · Dra. Ruiz
                                </b>
                                <br />
                                <span className="text-[#4b5567]">
                                    Camila P. · 9:00
                                </span>
                            </div>
                            <div className="absolute top-[124px] left-1 right-1 h-[112px] bg-[#e6f6ec] border-l-[3px] border-[#16a34a] rounded-md px-2 py-1.5 text-[12px]">
                                <b className="text-[#0f1b2d]">
                                    Masaje 60&apos; · Sala 2
                                </b>
                                <br />
                                <span className="text-[#4b5567]">
                                    Lucas F. · 11:00
                                </span>
                                <div className="mt-1.5 text-[11px] text-[#16a34a] font-semibold">
                                    ✓ Asistencia confirmada
                                </div>
                            </div>
                            <div className="absolute top-[304px] left-1 right-1 h-[52px] bg-[#fff4e5] border-l-[3px] border-[#f59e0b] rounded-md px-2 py-1.5 text-[12px]">
                                <b className="text-[#0f1b2d]">Corte y barba</b>
                                <br />
                                <span className="text-[#4b5567]">
                                    Martín G. · 14:00
                                </span>
                            </div>
                        </div>

                        {/* Martes */}
                        <div className="relative border-l border-[#eef0f5]">
                            <div className="absolute top-[64px] left-1 right-1 h-[52px] bg-[#fff4e5] border-l-[3px] border-[#f59e0b] rounded-md px-2 py-1.5 text-[12px]">
                                <b className="text-[#0f1b2d]">
                                    Color · Valentina
                                </b>
                                <br />
                                <span className="text-[#4b5567]">
                                    Sofía M. · 10:00
                                </span>
                            </div>
                            <div className="absolute top-[184px] left-1 right-1 h-[112px] bg-[#e8edff] border-l-[3px] border-[#2d5bff] rounded-md px-2 py-1.5 text-[12px]">
                                <b className="text-[#0f1b2d]">
                                    Clase funcional
                                </b>
                                <br />
                                <span className="text-[#4b5567]">
                                    8 inscriptos · 12:00
                                </span>
                            </div>
                        </div>

                        {/* Miércoles */}
                        <div className="relative border-l border-[#eef0f5]">
                            <div className="absolute top-1 left-1 right-1 h-[112px] bg-[#f3e8ff] border-l-[3px] border-[#8b5cf6] rounded-md px-2 py-1.5 text-[12px]">
                                <b className="text-[#0f1b2d]">
                                    Sesión · Psicología
                                </b>
                                <br />
                                <span className="text-[#4b5567]">
                                    Julián R. · 9:00
                                </span>
                            </div>
                            <div className="absolute top-[244px] left-1 right-1 h-[52px] bg-[#e6f6ec] border-l-[3px] border-[#16a34a] rounded-md px-2 py-1.5 text-[12px]">
                                <b className="text-[#0f1b2d]">
                                    Nutrición · control
                                </b>
                                <br />
                                <span className="text-[#4b5567]">
                                    Ana L. · 13:00
                                </span>
                            </div>
                        </div>

                        {/* Jueves */}
                        <div className="relative border-l border-[#eef0f5]">
                            <div className="absolute top-[64px] left-1 right-1 h-[52px] bg-[#e8edff] border-l-[3px] border-[#2d5bff] rounded-md px-2 py-1.5 text-[12px]">
                                <b className="text-[#0f1b2d]">
                                    Consulta · Dr. Peña
                                </b>
                                <br />
                                <span className="text-[#4b5567]">
                                    Rocío B. · 10:00
                                </span>
                            </div>
                            <div className="absolute top-[124px] left-1 right-1 h-[52px] border-[1.5px] border-dashed border-[#9aa6ba] rounded-md px-2 py-1.5 text-[12px] text-[#6b7587]">
                                <b className="text-[#6b7587]">
                                    Liberado · lista de espera
                                </b>
                                <br />
                            </div>
                            <div className="absolute top-[304px] left-1 right-1 h-[112px] bg-[#fff4e5] border-l-[3px] border-[#f59e0b] rounded-md px-2 py-1.5 text-[12px]">
                                <b className="text-[#0f1b2d]">Barba + cejas</b>
                                <br />
                                <span className="text-[#4b5567]">
                                    Tomás D. · 14:00
                                </span>
                            </div>
                        </div>

                        {/* Viernes */}
                        <div className="relative border-l border-[#eef0f5]">
                            <div className="absolute top-1 left-1 right-1 h-[52px] bg-[#e6f6ec] border-l-[3px] border-[#16a34a] rounded-md px-2 py-1.5 text-[12px]">
                                <b className="text-[#0f1b2d]">
                                    Facial · Sala 1
                                </b>
                                <br />
                                <span className="text-[#4b5567]">
                                    Carla V. · 9:00
                                </span>
                            </div>
                            <div className="absolute top-[184px] left-1 right-1 h-[112px] bg-[#f3e8ff] border-l-[3px] border-[#8b5cf6] rounded-md px-2 py-1.5 text-[12px]">
                                <b className="text-[#0f1b2d]">
                                    Clase de inglés B1
                                </b>
                                <br />
                                <span className="text-[#4b5567]">
                                    6 alumnos · 12:00
                                </span>
                            </div>
                        </div>

                        {/* Sábado */}
                        <div
                            className="relative border-l border-[#eef0f5]"
                            style={{
                                backgroundImage:
                                    'repeating-linear-gradient(135deg, #f7f8fb 0 6px, #fff 6px 12px)',
                            }}
                        >
                            <div className="absolute top-1 left-1 right-1 h-[52px] bg-[#fff4e5] border-l-[3px] border-[#f59e0b] rounded-md px-2 py-1.5 text-[12px]">
                                <b className="text-[#0f1b2d]">Corte · Martín</b>
                                <br />
                                <span className="text-[#4b5567]">
                                    Nico S. · 9:00
                                </span>
                            </div>
                        </div>

                        {/* Floating Notification */}
                        <Card className="absolute right-5 top-24 w-[260px] bg-white border border-[#d6dbe6] rounded-xl p-3.5 shadow-[0_12px_32px_rgba(15,27,45,0.16)] text-[13px]">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-7 h-7 rounded-full bg-[#e6f6ec] text-[#16a34a] flex items-center justify-center font-extrabold text-[12px]">
                                    ✓
                                </div>
                                <div>
                                    <b className="text-[#0f1b2d]">
                                        Recordatorio enviado
                                    </b>
                                    <br />
                                    <span className="text-[#6b7587]">
                                        24 h antes · por email
                                    </span>
                                </div>
                            </div>
                            <div className="text-[#4b5567]">
                                Camila confirmó su asistencia con un toque.
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
