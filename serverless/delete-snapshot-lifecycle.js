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