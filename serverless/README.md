## Создание / удалением snapshot c использованием serverless
##### Содержание
- [Цель](#Цель)
- [Описание](#Описание)
- [Нюансы](#Нюансы)
- [Пометим диски](#Пометим-диски-для-создания-снимков)
- [Создадим функции:](#Создадим-функции)
* [Создание моментальных снимков для критичных данных с жизненным циклом 7 дней](#Создание-моментальных-снимков-для-критичных-данных-с-жизненным-циклом-7-дней)

Создание моментальных снимков по умолчанию с жизненным циклом 14 дней
Удаление моментальных снимков с истекшим жизненным циклом
Создадим триггеры таймеры
Создание моментальных снимков каждый день в 18:00
Создание моментальных снимков каждое воскресение в 18:00
Удаление моментальных снимков каждый день в 12:00
Просмотр моментальных снимков

### Цель
Создавать и удалять моментальные по таймеру и с разделение на критичные данных и по умолчанию.

### Описание.

- Критически важные снимки создаются каждый день в 18:00, срок жизни 7 дней.
- Все снимки один раз в неделю в воскресение в 08:00, срок жизни 14 день.
- Удаление снимков выполняется ежедневно в 23:59.

Графическая схема ссылка

За основу взята публикация https://cloud.yandex.ru/blog/posts/2020/01/snapshot-triggers.

#### Нюансы: ###

- имя моментального снимка будет в формате: <Название диск>-ГГГГ-ММ-ДД
- моментальные снимки будут иметь атрибут срок жизни
- триггер по удалению снимков с истекшим сроком жизни

### Пометим диски для создания снимков ###
Возможно потребуется инициализация cli
Получим список дисков

    yc compute disk list

чтобы получить с метками воспользуемся ConvertFrom-Json

    (yc compute disk list --format json | ConvertFrom-Json) | Select id,name,status,labels

Дискам в зависимости от цели установим метки (labels)

snapshot-default - все диски для которых выполняются снимки
snapshot-critical - только те диски для которых нужно выполнять снимки чаще
yc compute disk update --id <id диска> --labels snapshot-default=14 --labels snapshot-critical=7
yc compute disk update --id <id диска> --labels snapshot-default=14
Если потребуется удалить labels

    yc compute disk remove-labels --id <id диска> --labels snapshot-default
    yc compute disk remove-labels --id <id диска> --labels snapshot-critical

### Создадим функции ###
Описание метода create https://cloud.yandex.ru/docs/compute/api-ref/Snapshot/create

### Создание моментальных снимков для критичных данных с жизненным циклом 7 дней ###
Будет запускается каждый день

create-snapshot-critical

    // Префикс имени диска ГГГГ-ММ-ДД
    let today = new Date();
    var yyyymmdd = today.toISOString().substring(0, 10);
    var hh = today.getHours().toString();
    var mm = today.getMinutes().toString();
    var ss = today.getSeconds().toString();
    var yyyymmddhhmmss = yyyymmdd + "-" + hh + mm + ss;

    // Метка диска жизненный цикл
    let label = {
    "lifecycle": "7"
    };

    const ycsdk = require("yandex-cloud/api/compute/v1");
    const FOLDER_ID = process.env.FOLDER_ID;
    const snapshotService = new ycsdk.SnapshotService();
    const diskService = new ycsdk.DiskService();

    async function handler(event, context) {

        const diskList = await diskService.list({
            folderId: FOLDER_ID,
        });

        for (const disk of diskList.disks) {
            if ('snapshot-critical' in disk.labels) {
                snapshotService.create({
                    folderId: FOLDER_ID,
                    diskId: disk.id,
                    name: disk.name + "-" + yyyymmddhhmmss,
                    labels: label
                });
            }
        }

    return {
            statusCode: 200,
            body: JSON.stringify({
                event: event,
                context: context,
                labels: label
            })
        }

    }
    exports.handler = handler;

Создание моментальных снимков по умолчанию с жизненным циклом 14 дней
Будет запускаться один раз в неделю

create-snapshot-default

    // Префикс имени диска ГГГГ-ММ-ДД
    let today = new Date();
    var yyyymmdd = today.toISOString().substring(0, 10);
    var hh = today.getHours().toString();
    var mm = today.getMinutes().toString();
    var ss = today.getSeconds().toString();
    var yyyymmddhhmmss = yyyymmdd + "-" + hh + mm + ss;

    // Метка диска жизненный цикл
    let label = {
    "lifecycle": "21"
    };

    const ycsdk = require("yandex-cloud/api/compute/v1");
    const FOLDER_ID = process.env.FOLDER_ID;
    const snapshotService = new ycsdk.SnapshotService();
    const diskService = new ycsdk.DiskService();

    async function handler(event, context) {

        const diskList = await diskService.list({
            folderId: FOLDER_ID,
        });

        for (const disk of diskList.disks) {
            if ('snapshot-default' in disk.labels) {
                snapshotService.create({
                    folderId: FOLDER_ID,
                    diskId: disk.id,
                    name: disk.name + "-" + yyyymmddhhmmss,
                    labels: label
                });
            }
        }

    return {
            statusCode: 200,
            body: JSON.stringify({
                event: event,
                context: context,
                labels: label
            })
        }

    }
    exports.handler = handler;

Удаление моментальных снимков с истекшим жизненным циклом
Будет выполнятся каждый день

delete-snapshot-lifecycle

    // yc compute snapshot list - список дисков
    // yc compute snapshot get <id> - метка диска
    // yc compute snapshot update --id <id>  --labels lifecycle=14 // изменение метки

    const today = Date.parse(new Date());
    const ycsdk = require("yandex-cloud/api/compute/v1");
    const FOLDER_ID = process.env.FOLDER_ID;
    const snapshotService = new ycsdk.SnapshotService();
    const diskService = new ycsdk.DiskService();

    module.exports.handler = async function (event, context) {

        const snapList = await snapshotService.list({
        folderId: FOLDER_ID
        });

        for (const snapshot of snapList.snapshots) {
            if ('lifecycle' in snapshot.labels) {
                let createdAt = snapshot.createdAt.seconds.low * 1000;
                let diff = (today - createdAt) / (60 * 60 * 24 * 1000);
                let snapid = snapshot.id;
                let d = snapshot.labels.lifecycle;
                //throw new Error(diff);
                //throw new Error(d);
                if (diff > d) {
                    snapshotService.delete({
                    folderId: FOLDER_ID,
                    snapshotId: snapshot.id
                    });
                }
            }
        }

        return {
            statusCode: 200,
            today: `${today}`,
            body: FOLDER_ID//,
            //createdAt: `${createdAt}`,
        };
    };

Создадим триггеры таймеры
Описание cron выражение https://cloud.yandex.ru/docs/functions/concepts/trigger/timer#cron-expression

Создание моментальных снимков каждый день в 18:00
cron-snapshot-create-critical

Cron-выражение: 00 18 ? _ 2-6 _ Функция: create-snapshot-critical

Создание моментальных снимков каждое воскресение в 18:00
cron-snapshot-create-default

Cron-выражение: 00 18 ? _ 1 _ Функция: create-snapshot-default

Удаление моментальных снимков каждый день в 12:00
cron-snapshot-delete-lifecycle

Cron-выражение: 00 12 ? \* \* \* Функция: delete-snapshot-lifecycle

Просмотр моментальных снимков
(yc compute snapshot list –format json | ConvertFrom-Json) | Select id,name,labels,status
