export function getMetaData(target: any) {
    if (!target["_customMetaData"]) {
        target["_customMetaData"] = {};
    }
    return target["_customMetaData"];
}