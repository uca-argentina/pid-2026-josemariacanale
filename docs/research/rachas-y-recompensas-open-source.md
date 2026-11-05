# Rachas y recompensas configurables: qué hace el código open source

Investigación para diseñar la Racha del Cliente y las recompensas que configura el Dueño en Agendic. Todo lo que sigue se leyó en el código fuente (no en READMEs), con permalinks a un commit fijo. Fecha: 2026-11-04.

Commits leídos:

| Proyecto | Repo | Commit |
|---|---|---|
| Odoo `loyalty` / `sale_loyalty` (rama 19.0) | `odoo/odoo` | `b40ef36` |
| Habitica | `HabitRPG/habitica` (develop) | `12091ca` |
| Loop Habit Tracker | `iSoron/uhabits` (dev) | `82c1ff2` |
| Saleor | `saleor/saleor` (main) | `697574a` |
| Medusa v2 | `medusajs/medusa` (develop) | `2740f22` |

**Open Loyalty quedó descartado**: `gh api repos/OpenLoyalty/openloyalty` devuelve 404, y los únicos repos con ese nombre son forks viejos de terceros (el más activo, `kwarambatendai/openloyalty`, con último push en 2017). No hay código vigente que leer. En su lugar se suma **Loop Habit Tracker** (uhabits), que es el ejemplo más limpio de racha calculada al leer. No encontré ningún sistema de turnos/booking open source con fidelidad, ni ninguna implementación open source de rachas "estilo Duolingo" con *freeze* que valga la pena (la búsqueda `streak` en GitHub devuelve sobre todo widgets de rachas de commits).

## Resumen

| | Racha: dónde vive | Quemada | Recompensa / umbral | Canje y vencimiento | Configurable sin código |
|---|---|---|---|---|---|
| **Habitica** | contador `task.streak` guardado | "cron" por usuario, **perezoso**: corre en el primer request del día, no con un scheduler | fija en el código (logro cada 21) | — | No |
| **Loop (uhabits)** | **no se guarda**: se recalcula desde las entradas | **al leer**: un hueco en las fechas corta la racha | — | — | Solo la frecuencia del hábito |
| **Odoo loyalty** | no hay rachas; saldo `loyalty.card.points` | — | `loyalty.reward.required_points` | puntos al confirmar la venta, vencimiento **verificado al canjear** (sin cron) | Sí: programa + reglas + recompensas |
| **Saleor** | no hay rachas | — | regla con predicados JSON | cupón con `usage_limit`, `end_date` verificado **al leer**; job solo para efectos secundarios | Sí |
| **Medusa** | no hay rachas | — | regla `attribute/operator/values` | `limit/used` con lock `FOR UPDATE`; vigencia **al leer** | Sí |

Conclusión corta: **nadie usa un job para "romper" algo cuando vence el plazo**. Habitica parece hacerlo, pero su "cron" corre perezosamente con el primer request del usuario. Odoo, Saleor y Medusa deciden vigencia y vencimiento comparando fechas en la consulta. Saleor usa un job solo para *avisar* que algo empezó o terminó, con una marca de idempotencia.

---

## Habitica (Node + Mongo)

Activo: último push el 2026-11-04.

**Modelo.** La racha es un contador por tarea (Daily): `streak: Number, default 0` ([task.js#L404](https://github.com/HabitRPG/habitica/blob/12091ca02990533fdf38c2f0947397f0b4e39d59/website/server/models/task.js#L404)). El usuario guarda `lastCron` ([user/schema.js#L472](https://github.com/HabitRPG/habitica/blob/12091ca02990533fdf38c2f0947397f0b4e39d59/website/server/models/user/schema.js#L472)), `preferences.dayStart` (hora custom de inicio de día), `timezoneOffset` y `timezoneOffsetAtLastCron` ([schema.js#L548-L566](https://github.com/HabitRPG/habitica/blob/12091ca02990533fdf38c2f0947397f0b4e39d59/website/server/models/user/schema.js#L548-L566)), y `preferences.sleep` (la "posada", o *Rest in the Inn*) ([#L573](https://github.com/HabitRPG/habitica/blob/12091ca02990533fdf38c2f0947397f0b4e39d59/website/server/models/user/schema.js#L573)).

**Quemada.**
- El `cronWrapper` no lo dispara un scheduler. Lo llama el endpoint `POST /api/v3/cron` ([controllers/api-v3/cron.js#L16-L24](https://github.com/HabitRPG/habitica/blob/12091ca02990533fdf38c2f0947397f0b4e39d59/website/server/controllers/api-v3/cron.js#L16-L24)), que el cliente invoca al abrir la app. Si `daysMissed <= 0`, no hace nada ([libs/cron.js#L428-L439](https://github.com/HabitRPG/habitica/blob/12091ca02990533fdf38c2f0947397f0b4e39d59/website/server/libs/cron.js#L428-L439)). En la práctica es "calcular al leer", pero persistiendo el resultado.
- Para no correr dos veces a la vez usa un lock optimista en el documento, `_cronSignature`, con timeout de 5 minutos ([libs/cron.js#L389-L418](https://github.com/HabitRPG/habitica/blob/12091ca02990533fdf38c2f0947397f0b4e39d59/website/server/libs/cron.js#L389-L418)). Guarda el usuario y las tareas en una transacción ([#L485-L495](https://github.com/HabitRPG/habitica/blob/12091ca02990533fdf38c2f0947397f0b4e39d59/website/server/libs/cron.js#L485-L495)).
- Por cada Daily debida y no completada llama a `scoreTask(..., cron: true)` ([libs/cron.js#L218-L276](https://github.com/HabitRPG/habitica/blob/12091ca02990533fdf38c2f0947397f0b4e39d59/website/server/libs/cron.js#L218-L276)), y ahí se hace `task.streak = 0` ([scoreTask.js#L305-L310](https://github.com/HabitRPG/habitica/blob/12091ca02990533fdf38c2f0947397f0b4e39d59/website/common/script/ops/scoreTask.js#L305-L310)).
- Varios días sin entrar cuentan como uno solo (`multiDaysCountAsOneDay`) ([libs/cron.js#L185-L188](https://github.com/HabitRPG/habitica/blob/12091ca02990533fdf38c2f0947397f0b4e39d59/website/server/libs/cron.js#L185-L188), [#L247](https://github.com/HabitRPG/habitica/blob/12091ca02990533fdf38c2f0947397f0b4e39d59/website/server/libs/cron.js#L247)).
- **Congelamiento** de dos formas:
  - con `preferences.sleep` no se llama a `scoreTask` y la racha sobrevive ([libs/cron.js#L268](https://github.com/HabitRPG/habitica/blob/12091ca02990533fdf38c2f0947397f0b4e39d59/website/server/libs/cron.js#L268));
  - el buff `stats.buffs.streaks` ("Chilling Frost") evita el reset una vez ([scoreTask.js#L310](https://github.com/HabitRPG/habitica/blob/12091ca02990533fdf38c2f0947397f0b4e39d59/website/common/script/ops/scoreTask.js#L310)) y el mismo cron lo apaga ([libs/cron.js#L332-L352](https://github.com/HabitRPG/habitica/blob/12091ca02990533fdf38c2f0947397f0b4e39d59/website/server/libs/cron.js#L332-L352)).
- **Zona horaria.** `startOfDay` corre el inicio del día a `dayStart` en el offset del usuario ([common/script/cron.js#L83-L92](https://github.com/HabitRPG/habitica/blob/12091ca02990533fdf38c2f0947397f0b4e39d59/website/common/script/cron.js#L83-L92)), y `daysSince` cuenta días entre esos inicios ([#L98-L104](https://github.com/HabitRPG/habitica/blob/12091ca02990533fdf38c2f0947397f0b4e39d59/website/common/script/cron.js#L98-L104)). `daysUserHasMissed` compara el offset del último cron con el que manda el browser (`x-user-timezoneoffset`) para que viajar o el cambio de horario de verano no disparen dos crons ni quemen la racha antes de tiempo ([models/user/methods.js#L380-L440](https://github.com/HabitRPG/habitica/blob/12091ca02990533fdf38c2f0947397f0b4e39d59/website/server/models/user/methods.js#L380-L440)). Guarda **offsets en minutos**, no nombres IANA, y por eso necesita todo ese código defensivo.

**Recompensa.** Está fija en el código: al subir la racha, si `streak % 21 === 0` incrementa `achievements.streak` y notifica ([scoreTask.js#L338-L352](https://github.com/HabitRPG/habitica/blob/12091ca02990533fdf38c2f0947397f0b4e39d59/website/common/script/ops/scoreTask.js#L338-L352)). Desmarcar la tarea revierte racha y logro ([#L374-L388](https://github.com/HabitRPG/habitica/blob/12091ca02990533fdf38c2f0947397f0b4e39d59/website/common/script/ops/scoreTask.js#L374-L388)). No hay canje ni configuración.

**Lecciones.** (1) Un contador persistido obliga a escribir la reversión de cada acción que lo movió (el desmarcar). (2) La quemada perezosa deja el valor desactualizado hasta que alguien "entra". Para un Cliente sin cuenta (ADR 0005), ese momento no existe. (3) Usar offsets en lugar de zonas IANA cuesta caro.

---

## Loop Habit Tracker / uhabits (Kotlin)

Activo: último push el 2026-10-22.

**Modelo.** No hay columna de racha. `StreakList.recompute` toma las entradas completadas hasta hoy, recorre las fechas desde la más nueva y arma intervalos `Streak(begin, end)` mientras sean contiguas (`current == begin.minus(1)`). Ante el primer hueco cierra la racha ([StreakList.kt#L37-L71](https://github.com/iSoron/uhabits/blob/82c1ff287a8ac05321bfa95b61399fa8a2d1da5b/uhabits-core/src/commonMain/kotlin/org/isoron/uhabits/core/models/StreakList.kt#L37-L71)). `Habit.recompute()` regenera entradas, puntaje y rachas cada vez ([Habit.kt#L76-L114](https://github.com/iSoron/uhabits/blob/82c1ff287a8ac05321bfa95b61399fa8a2d1da5b/uhabits-core/src/commonMain/kotlin/org/isoron/uhabits/core/models/Habit.kt#L76-L114)).

**Quemada = tolerancia por frecuencia, al leer.** En un hábito "3 veces por semana", `recomputeFrom` rellena los días cubiertos con entradas `YES_AUTO`, así un día sin marca no corta la racha mientras la frecuencia se cumpla ([EntryList.kt#L88-L100](https://github.com/iSoron/uhabits/blob/82c1ff287a8ac05321bfa95b61399fa8a2d1da5b/uhabits-core/src/commonMain/kotlin/org/isoron/uhabits/core/models/EntryList.kt#L88-L100), [#L255-L301](https://github.com/iSoron/uhabits/blob/82c1ff287a8ac05321bfa95b61399fa8a2d1da5b/uhabits-core/src/commonMain/kotlin/org/isoron/uhabits/core/models/EntryList.kt#L255-L301)). Es el análogo directo de un "tiempo de quemada" configurable: la racha sigue viva mientras el próximo evento llegue dentro de la ventana. La zona horaria es la del dispositivo (`getToday()`); no lo seguí más porque es una app local.

**Lecciones.** Editar o borrar un evento del pasado no necesita código de reversión, porque se recalcula todo. Es una app local con pocos datos; en un servidor el costo sería un escaneo de los eventos del Cliente, acotado (ver la comparativa).

---

## Odoo `loyalty` + `sale_loyalty` (Python)

Activo: último push el 2026-11-04. No hay rachas, pero es el mejor modelo de **programa → reglas → recompensas** configurable por el dueño.

**Modelo.**
- `loyalty.program` tiene `program_type` (coupons, loyalty, promotion, buy_x_get_y, next_order_coupons…), `date_from`/`date_to`, `limit_usage`/`max_usage`, `applies_on` (`current`/`future`/`both`: canjear en la misma orden o generar un cupón para la próxima) y `trigger` (`auto`/`with_code`) ([loyalty_program.py#L95-L144](https://github.com/odoo/odoo/blob/b40ef3651d3c37e0fab4fd86ee130f619341aea6/addons/loyalty/models/loyalty_program.py#L95-L144)).
- `loyalty.rule` define **cómo se ganan puntos**: `reward_point_amount`, `reward_point_mode` (por orden, por unidad o por dinero), `minimum_qty`, `minimum_amount`, productos y código ([loyalty_rule.py#L54-L87](https://github.com/odoo/odoo/blob/b40ef3651d3c37e0fab4fd86ee130f619341aea6/addons/loyalty/models/loyalty_rule.py#L54-L87)).
- `loyalty.reward` define **qué se obtiene**: `reward_type` `product` (regalo) o `discount` ([loyalty_reward.py#L63-L70](https://github.com/odoo/odoo/blob/b40ef3651d3c37e0fab4fd86ee130f619341aea6/addons/loyalty/models/loyalty_reward.py#L63-L70)), con `discount`, `discount_mode`, `discount_max_amount`, `reward_product_id`/`qty`, y el **umbral** `required_points` con `CHECK > 0` ([#L131-L137](https://github.com/odoo/odoo/blob/b40ef3651d3c37e0fab4fd86ee130f619341aea6/addons/loyalty/models/loyalty_reward.py#L131-L137)). Las recompensas se ordenan por `required_points asc` ([#L15](https://github.com/odoo/odoo/blob/b40ef3651d3c37e0fab4fd86ee130f619341aea6/addons/loyalty/models/loyalty_reward.py#L15)).
- `loyalty.card` es la tarjeta o cupón de un `partner_id`, con `points`, `code` y `expiration_date` ([loyalty_card.py#L28-L48](https://github.com/odoo/odoo/blob/b40ef3651d3c37e0fab4fd86ee130f619341aea6/addons/loyalty/models/loyalty_card.py#L28-L48)). Una tarjeta de tipo `loyalty` **no puede tener vencimiento** ([#L71-L75](https://github.com/odoo/odoo/blob/b40ef3651d3c37e0fab4fd86ee130f619341aea6/addons/loyalty/models/loyalty_card.py#L71-L75)).
- `loyalty.history` es un libro de movimientos `issued`/`used` por orden ([loyalty_history.py#L6-L20](https://github.com/odoo/odoo/blob/b40ef3651d3c37e0fab4fd86ee130f619341aea6/addons/loyalty/models/loyalty_history.py#L6-L20)).

**Emisión y canje.**
- Los puntos se suman **al confirmar** la venta (`coupon.points += change`) ([sale_order.py#L142-L185](https://github.com/odoo/odoo/blob/b40ef3651d3c37e0fab4fd86ee130f619341aea6/addons/sale_loyalty/models/sale_order.py#L142-L185)) y **se restan al cancelarla**, borrando el historial ([#L187-L209](https://github.com/odoo/odoo/blob/b40ef3651d3c37e0fab4fd86ee130f619341aea6/addons/sale_loyalty/models/sale_order.py#L187-L209)).
- Una recompensa es reclamable si `points >= reward.required_points` ([#L1036](https://github.com/odoo/odoo/blob/b40ef3651d3c37e0fab4fd86ee130f619341aea6/addons/sale_loyalty/models/sale_order.py#L1036)). Canjearla descuenta `required_points`, o todo el saldo con `clear_wallet` ([#L599](https://github.com/odoo/odoo/blob/b40ef3651d3c37e0fab4fd86ee130f619341aea6/addons/sale_loyalty/models/sale_order.py#L599)).
- Al cruzar un umbral se manda un mail de *milestone* (`trigger == 'points_reach'`) ([loyalty_card.py#L160-L184](https://github.com/odoo/odoo/blob/b40ef3651d3c37e0fab4fd86ee130f619341aea6/addons/loyalty/models/loyalty_card.py#L160-L184)).

**Vencimiento: al leer, sin cron.**
- El vencimiento del cupón se filtra al calcular las recompensas reclamables ([sale_order.py#L1011-L1012](https://github.com/odoo/odoo/blob/b40ef3651d3c37e0fab4fd86ee130f619341aea6/addons/sale_loyalty/models/sale_order.py#L1011-L1012)), al recalcular la orden ([#L1093-L1098](https://github.com/odoo/odoo/blob/b40ef3651d3c37e0fab4fd86ee130f619341aea6/addons/sale_loyalty/models/sale_order.py#L1093-L1098)) y al ingresar un código ([#L1490](https://github.com/odoo/odoo/blob/b40ef3651d3c37e0fab4fd86ee130f619341aea6/addons/sale_loyalty/models/sale_order.py#L1490)).
- La vigencia del programa también es un filtro de dominio (`date_from <= today <= date_to`) ([#L676-L677](https://github.com/odoo/odoo/blob/b40ef3651d3c37e0fab4fd86ee130f619341aea6/addons/sale_loyalty/models/sale_order.py#L676-L677)), y `max_usage` se compara al aplicar ([#L1079](https://github.com/odoo/odoo/blob/b40ef3651d3c37e0fab4fd86ee130f619341aea6/addons/sale_loyalty/models/sale_order.py#L1079), [#L1509](https://github.com/odoo/odoo/blob/b40ef3651d3c37e0fab4fd86ee130f619341aea6/addons/sale_loyalty/models/sale_order.py#L1509)).
- En los `data/*.xml` de `loyalty` y `sale_loyalty` no hay ningún `ir.cron`: revisé ambos archivos de datos y el árbol de `models/`.

**Configuración.** Todo lo de arriba son registros que el dueño edita en la UI. `_program_type_default_values` precarga plantillas por tipo de programa (por ejemplo, loyalty con `required_points: 200`) ([loyalty_program.py#L284-L432](https://github.com/odoo/odoo/blob/b40ef3651d3c37e0fab4fd86ee130f619341aea6/addons/loyalty/models/loyalty_program.py#L284-L432)).

---

## Saleor (Python / Django)

Activo: último push el 2026-11-04.

**Modelo.**
- `Voucher` tiene `usage_limit`, `start_date`/`end_date`, `apply_once_per_customer` y `single_use` ([discount/models.py#L122-L150](https://github.com/saleor/saleor/blob/697574a4c4d9af3add0bbd21b07f86024c89a336/saleor/discount/models.py#L122-L150)).
- `VoucherCode` lleva un contador `used` y un `is_active` por código ([#L261-L270](https://github.com/saleor/saleor/blob/697574a4c4d9af3add0bbd21b07f86024c89a336/saleor/discount/models.py#L261-L270)).
- **`VoucherCustomer` identifica al cliente por `customer_email`**, sin cuenta ([#L312-L320](https://github.com/saleor/saleor/blob/697574a4c4d9af3add0bbd21b07f86024c89a336/saleor/discount/models.py#L312-L320)), igual que la Ficha del Cliente.
- `Promotion` + `PromotionRule` guardan predicados JSON (`catalogue_predicate`, `order_predicate`), `reward_value_type`/`reward_value`, `reward_type` y `gifts` (regalo) ([#L363-L456](https://github.com/saleor/saleor/blob/697574a4c4d9af3add0bbd21b07f86024c89a336/saleor/discount/models.py#L363-L456)).

**Vencimiento al leer.** `VoucherQueryset.active(date)` filtra `start_date <= date`, `end_date` nulo o futuro, y `usage_limit > SUM(used)` ([#L76-L91](https://github.com/saleor/saleor/blob/697574a4c4d9af3add0bbd21b07f86024c89a336/saleor/discount/models.py#L76-L91)). `expired()` es el filtro inverso ([#L105-L117](https://github.com/saleor/saleor/blob/697574a4c4d9af3add0bbd21b07f86024c89a336/saleor/discount/models.py#L105-L117)). `Promotion.is_active` también se calcula ([#L393-L396](https://github.com/saleor/saleor/blob/697574a4c4d9af3add0bbd21b07f86024c89a336/saleor/discount/models.py#L393-L396)). `validate_once_per_customer` rechaza el cupón con un error genérico porque el email del checkout no está verificado, y un mensaje más preciso dejaría sondear el historial de otro ([#L234-L249](https://github.com/saleor/saleor/blob/697574a4c4d9af3add0bbd21b07f86024c89a336/saleor/discount/models.py#L234-L249)).

**Job solo para efectos secundarios.** La tarea de Celery beat `handle_promotion_toggle` ([settings.py#L710-L712](https://github.com/saleor/saleor/blob/697574a4c4d9af3add0bbd21b07f86024c89a336/saleor/settings.py#L710-L712)) no decide si la promoción está vigente. Manda los webhooks de inicio y fin y marca precios para recalcular, en lotes de 100. La idempotencia sale de `last_notification_scheduled_at`: busca promociones con `start_date <= now` y una marca nula o anterior a `start_date` ([discount/tasks.py#L49-L172](https://github.com/saleor/saleor/blob/697574a4c4d9af3add0bbd21b07f86024c89a336/saleor/discount/tasks.py#L49-L172)). Es el mismo patrón que `ratingRequestSentAt` en Agendic.

---

## Medusa v2 (Node / TypeScript)

Activo: último push el 2026-11-04.

**Modelo.**
- `Promotion` tiene `code`, `is_automatic`, `limit`/`used`, `status` y `campaign` ([promotion.ts#L7-L42](https://github.com/medusajs/medusa/blob/2740f227be4cee1351d829924b653f4e2c83893a/packages/modules/promotion/src/models/promotion.ts#L7-L42)).
- `ApplicationMethod` dice **qué** se da: `value`, `type`, `target_type`, `allocation` y `max_quantity` ([application-method.ts#L6-L35](https://github.com/medusajs/medusa/blob/2740f227be4cee1351d829924b653f4e2c83893a/packages/modules/promotion/src/models/application-method.ts#L6-L35)).
- `PromotionRule` es una regla genérica `attribute` + `operator` + `values` ([promotion-rule.ts#L13-L19](https://github.com/medusajs/medusa/blob/2740f227be4cee1351d829924b653f4e2c83893a/packages/modules/promotion/src/models/promotion-rule.ts#L13-L19)).
- `Campaign` tiene `starts_at`/`ends_at` ([campaign.ts#L13-L14](https://github.com/medusajs/medusa/blob/2740f227be4cee1351d829924b653f4e2c83893a/packages/modules/promotion/src/models/campaign.ts#L13-L14)).
- `CampaignBudget` tiene `limit`/`used` y `attribute` (por ejemplo `customer_email`) ([campaign-budget.ts#L10-L29](https://github.com/medusajs/medusa/blob/2740f227be4cee1351d829924b653f4e2c83893a/packages/modules/promotion/src/models/campaign-budget.ts#L10-L29)). `CampaignBudgetUsage` cuenta por `attribute_value` (por ejemplo un email) con índice único `(attribute_value, budget_id)` ([campaign-budget-usage.ts#L7-L28](https://github.com/medusajs/medusa/blob/2740f227be4cee1351d829924b653f4e2c83893a/packages/modules/promotion/src/models/campaign-budget-usage.ts#L7-L28)).

**Vigencia al leer.** `listActivePromotions_` filtra `status = ACTIVE` y `starts_at <= now < ends_at` con un único `now` compartido por todos los filtros ([promotion-module.ts#L166-L200](https://github.com/medusajs/medusa/blob/2740f227be4cee1351d829924b653f4e2c83893a/packages/modules/promotion/src/services/promotion-module.ts#L166-L200)).

**Canje concurrente.** `registerUsage` toma `SELECT … FOR UPDATE` sobre las promociones y los presupuestos en orden de id estable, para no gastar de más ni generar deadlocks, y falla si no hay transacción ([#L340-L365](https://github.com/medusajs/medusa/blob/2740f227be4cee1351d829924b653f4e2c83893a/packages/modules/promotion/src/services/promotion-module.ts#L340-L365)). `computeActions` informa `PROMOTION_LIMIT_EXCEEDED` si `used >= limit` ([#L1029-L1033](https://github.com/medusajs/medusa/blob/2740f227be4cee1351d829924b653f4e2c83893a/packages/modules/promotion/src/services/promotion-module.ts#L1029-L1033)).

---

## Quemada: job programado vs. cálculo al leer

| | (a) Job que rompe la racha al vencer | (b) Calcular al leer desde el último Turno |
|---|---|---|
| Quién lo hace | Ninguno de los cinco lo hace así para la vigencia. Habitica se le parece, pero dispara su "cron" desde un request ([cron.js#L16-L24](https://github.com/HabitRPG/habitica/blob/12091ca02990533fdf38c2f0947397f0b4e39d59/website/server/controllers/api-v3/cron.js#L16-L24)). | uhabits (rachas), Odoo, Saleor y Medusa (vencimientos y vigencia) |
| Exactitud | El valor queda desactualizado hasta el próximo ciclo; hay que manejar ejecuciones dobles con un lock (`_cronSignature`, [cron.js#L392-L418](https://github.com/HabitRPG/habitica/blob/12091ca02990533fdf38c2f0947397f0b4e39d59/website/server/libs/cron.js#L392-L418)) | Siempre exacto en el momento de leer, con un `now` único ([Medusa#L171-L172](https://github.com/medusajs/medusa/blob/2740f227be4cee1351d829924b653f4e2c83893a/packages/modules/promotion/src/services/promotion-module.ts#L171-L172)) |
| Cambios retroactivos (Cancelar o Reagendar un Turno pasado, o que el Dueño cambie el plazo) | Hay que escribir la reversión en cada caso: Habitica la tiene para desmarcar ([scoreTask.js#L374-L388](https://github.com/HabitRPG/habitica/blob/12091ca02990533fdf38c2f0947397f0b4e39d59/website/common/script/ops/scoreTask.js#L374-L388)) y Odoo resta puntos al cancelar ([sale_order.py#L198-L202](https://github.com/odoo/odoo/blob/b40ef3651d3c37e0fab4fd86ee130f619341aea6/addons/sale_loyalty/models/sale_order.py#L198-L202)) | Gratis: se recalcula ([StreakList.kt#L46](https://github.com/iSoron/uhabits/blob/82c1ff287a8ac05321bfa95b61399fa8a2d1da5b/uhabits-core/src/commonMain/kotlin/org/isoron/uhabits/core/models/StreakList.kt#L46)) |
| Zonas horarias | El job necesita saber "qué día es" para cada sujeto; Habitica gasta unas 60 líneas en eso ([methods.js#L380-L440](https://github.com/HabitRPG/habitica/blob/12091ca02990533fdf38c2f0947397f0b4e39d59/website/server/models/user/methods.js#L380-L440)) | Con plazos en horas o días absolutos (`lastAt + plazo < now`) la zona no importa; solo importa si el plazo se mide en "días calendario" |
| Costo | Un barrido periódico de todos los sujetos | Una consulta acotada por Cliente al leer; para listar "todas las rachas del Negocio" conviene un índice o un snapshot |
| Efectos secundarios (mail de "tu racha está por quemarse" o "se quemó") | Natural | Igual necesita un job, solo para avisar, con una marca idempotente como `last_notification_scheduled_at` de Saleor ([tasks.py#L136-L153](https://github.com/saleor/saleor/blob/697574a4c4d9af3add0bbd21b07f86024c89a336/saleor/discount/tasks.py#L136-L153)) |

**Lo que muestra el código.** El estado se calcula al leer, y el job, si existe, solo produce efectos secundarios y es idempotente. Encaja con ADR 0035: el job recalcula con el mismo cálculo que ve el Cliente, en lugar de mantener un estado paralelo.

---

## Patrones que aplican a Agendic (NestJS + Prisma)

Estado actual del schema, verificado: `Client` (`bookingId` + `email` indexado, `agendic-back/prisma/schema.prisma` L340-349), `BookingStatus` = `PENDING | BOOKED | REJECTED | CANCELLED` (L25-30), `Branch.timeZone` IANA (L118), `noShowAt` (L297). **No hay ninguna columna para Turno atendido** (no existe un `attendedAt`), aunque el glosario lo define. Los jobs existentes usan `@nestjs/schedule` `@Cron` (`rating-requests.job.ts`, `free-slot-notices.job.ts`).

**1. Racha = cálculo, no columna** (patrón de uhabits, Odoo, Saleor y Medusa). Un caso de uso de dominio puro, `computeStreak(turnosQueCuentan, plazo, now)`: ordena los Turnos por `startsAt` y corta donde el hueco entre dos supera el plazo. La racha está viva si `now - último <= plazo`. Va en `domain/`, sin Prisma, y se testea con fechas fijas. El repositorio expone algo como `findCountingByBusinessIdAndClientEmail(businessId, email, since?)` con `select` mínimo.

**2. Identidad = (Negocio, email del Cliente)**, igual que la Ficha del Cliente y que `VoucherCustomer` de Saleor y `CampaignBudgetUsage.attribute_value` de Medusa. No hace falta una cuenta (ADR 0005), porque el email ya está verificado en cada Turno.

**3. Entidades Prisma tentativas:**

```prisma
model StreakProgram {            // uno por Negocio (¿o por Usuario en Servicios personales?)
  id            Int  @id @default(autoincrement())
  businessId    Int  @unique
  burnAfterDays Int              // tiempo de quemada
  active        Boolean @default(true)
  rewards       StreakReward[]
}

model StreakReward {             // ≈ loyalty.reward / ApplicationMethod
  id             Int @id @default(autoincrement())
  programId      Int
  requiredCount  Int             // umbral (CHECK > 0, como Odoo required_points)
  type           StreakRewardType // DISCOUNT_PERCENT | DISCOUNT_AMOUNT | GIFT
  value          Decimal? @db.Decimal(10, 2)
  description    String           // regalo en texto libre (Agendic no cobra: como la Seña, ADR 0027)
  validForDays   Int?             // vencimiento del premio emitido
  deletedAt      DateTime? @db.Timestamptz(3)
}

model StreakRewardGrant {        // premio emitido = ≈ loyalty.card / VoucherCode
  id           Int @id @default(autoincrement())
  rewardId     Int
  businessId   Int
  clientEmail  String
  streakStart  DateTime @db.Timestamptz(3) // identifica la racha que lo ganó
  grantedAt    DateTime @db.Timestamptz(3)
  expiresAt    DateTime? @db.Timestamptz(3)
  redeemedAt   DateTime? @db.Timestamptz(3)
  redeemedBookingId Int? @unique
  @@unique([rewardId, clientEmail, streakStart])  // idempotencia: un premio por umbral y racha
}
```

- La racha no se persiste. Lo que se persiste es el **premio emitido**, porque tiene vida propia: vence y se canjea. Si el premio se recalculara al leer, cancelar un Turno haría desaparecer un premio ya canjeado.
- El vencimiento se valida al leer o canjear (`expiresAt > now`), como en Odoo, Saleor y Medusa. El canje lleva una escritura con guarda (`redeemedAt IS NULL AND expiresAt > now`), al estilo de `depositPaidAt` en ADR 0027 o del `FOR UPDATE` de Medusa.
- La emisión puede ir en el use case que vuelve "contable" al Turno (por ejemplo, Marcar atendido), o en un job idempotente estilo ADR 0035 que recalcula y crea los grants que falten (el `@@unique` lo hace seguro). El job cubre cualquier causa futura sin tocar otros casos de uso.
- Avisos ("tu racha se quema en N días", "ganaste X"): un job `@Cron` con marca idempotente, como `ratingRequestSentAt` o `last_notification_scheduled_at`.

**4. Zona horaria.** Si el plazo es "N días" medidos como duración (`último startsAt + N×24h`), la zona no importa. Si es "N días calendario", hay que leerlo en `Branch.timeZone` (IANA, nunca un offset: el código de Habitica muestra lo que cuesta usar offsets).

**Decisiones abiertas para la entrevista de diseño:**
1. **Qué Turno cuenta**: solo el **Turno atendido** (hoy sin columna en el schema), cualquier `BOOKED` cuyo horario pasó sin `noShowAt`, o también los futuros. ¿Una Ausencia del Invitado quema la racha o solo no suma?
2. **Qué es "la racha"**: ¿Turnos consecutivos con huecos menores al plazo (uhabits), o un conteo acumulado que se resetea al quemarse? ¿"Cantidad de rachas" significa largo de la racha actual o cantidad de rachas completadas?
3. **Alcance**: ¿por Negocio, por Sucursal o por Servicio? ¿Y en los Servicios personales (Ficha del Usuario)?
4. **Unidad del plazo**: duración (horas o días absolutos) o días calendario en la zona de la Sucursal.
5. **Recompensas**: ¿se pierden al quemarse la racha? ¿Son repetibles (cada N, como el `% 21` de Habitica) o se dan una vez por umbral? ¿Vencen?
6. **Canje**: ¿lo aplica el Empleado a mano sobre un Turno, o el Cliente al Reservar? Agendic no cobra (ADR 0027), así que un "descuento" es una marca informativa sobre `price`.
7. **Retroactividad**: si el Dueño cambia el plazo o los umbrales, ¿se recalculan las rachas en curso? Con el cálculo al leer, sí, automáticamente. ¿Y los premios ya emitidos?
8. **Congelamiento**: ¿hace falta algo como el `sleep` de Habitica (por ejemplo, que el Negocio cerrado por vacaciones no queme las rachas)?
9. **Emisión**: en el caso de uso, o en un job (ADR 0035). Comunicación: ¿un mail nuevo, o una línea en el Aviso de cambio del Turno?
