# Días festivos desde Google Calendar

Los Días festivos salen de los calendarios públicos de feriados de Google Calendar, como en cal.diy (`packages/lib/holidays/`). El back los consulta con una API key propia (`GOOGLE_CALENDAR_API_KEY`, solo en el env, nunca en el repo) y los cachea en una tabla durante 7 días. Solo aplica al back; el front consume la lista ya resuelta.

Motivos:

- **Lo fiel a cal.diy.** La lista de países y de calendarios religiosos (cristiano, hindú, judío, musulmán, ortodoxo) es la de cal.diy. Una librería estática como `date-holidays` no necesita key ni caché, pero no tiene los calendarios religiosos y sus listas no coinciden con las de Google.
- **Caché en Postgres.** Google se consulta como mucho una vez por semana por calendario, no en cada cálculo de Horarios reservables.

## Consecuencias

- Se usan los calendarios `es.*` de Google, no los `en.*` de cal.diy, para que los Días festivos lleguen en castellano.
- Un entorno sin la key no tiene Días festivos, pero el back arranca igual: el cálculo de Horarios reservables los ignora y sus endpoints responden 503. Así dev y CI no necesitan la key, que queda como un secreto más del deploy.
- Si Google deja de publicar esos calendarios, hay que cambiar de fuente. Por la caché, el resto del back no se entera de dónde salen.
