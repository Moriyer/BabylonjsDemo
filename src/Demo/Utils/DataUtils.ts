export class DataUtils {
    static onUpdateCallBack(data: {
        copyFrom(source: any): void,
        set(...args: any[]): void,
    }, callback: (data: any) => void) {
        const copyFrom = data.copyFrom;
        data.copyFrom = (source: any) => {
            copyFrom.call(data, source);
            callback(data);
        }
        const set = data.set;
        data.set = (...args: any[]) => {
            set.call(data, ...args);
            callback(data);
        }
    }

    static getGLTFMeta(metadata: any) {
        if (!metadata) return {};
        if (!metadata["gltf"]) return {};
        return metadata["gltf"]["extras"] || {};
    }
}