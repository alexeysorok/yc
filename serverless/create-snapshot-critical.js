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