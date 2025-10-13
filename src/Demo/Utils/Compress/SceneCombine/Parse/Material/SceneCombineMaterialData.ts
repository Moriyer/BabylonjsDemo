import { DataTexture } from '@/Demo/Utils/Texture/DataTexture';
import * as BABYLON from 'babylonjs';
import { SceneCombineMaterialManager } from './SceneCombineMaterialManager';
export interface ISceneCombineMaterialInfo {
    index: number;
    alpha: number;
    alphaCutoff: number;
    metallic: number | null;
    roughness: number | null;
    albedo: number[];
    emissive: number[];
    emissiveIntensity: number;
    ambient: number[];
}

export class SceneCombineMaterialData {
    manager: SceneCombineMaterialManager;
    private _index: number;
    get index() { return this._index; }

    alpha: number = 1;
    alphaCutoff: number = 0.45;
    albedo: BABYLON.Color3 = new BABYLON.Color3(1, 1, 1);
    emissive: BABYLON.Color3 = new BABYLON.Color3(0, 0, 0);
    metallic: number = 1;
    roughness: number = 1;
    emissiveIntensity: number = 0;
    ambient: BABYLON.Color3 = new BABYLON.Color3(0, 0, 0);

    static readonly dataCount = 5;
    dataTexture: DataTexture;
    constructor(manager: SceneCombineMaterialManager, index: number, dataTexture: DataTexture) {
        this._index = index;
        this.manager = manager;
        this.dataTexture = dataTexture;
    }

    initWithInfo(info: ISceneCombineMaterialInfo) {
        this.alpha = info.alpha;
        this.alphaCutoff = info.alphaCutoff;
        this.metallic = info.metallic ?? this.metallic;
        this.roughness = info.roughness ?? this.roughness;
        this.albedo.set(info.albedo[0], info.albedo[1], info.albedo[2]);
        this.emissive.set(info.emissive[0], info.emissive[1], info.emissive[2]);
        this.emissiveIntensity = info.emissiveIntensity;
        this.ambient.set(info.ambient[0], info.ambient[1], info.ambient[2]);
        this.onValueChanged();
    }

    onValueChanged() {
        const data = [
            this.alpha, this.alphaCutoff, 0,
            this.metallic, this.roughness, this.emissiveIntensity,
            this.albedo.r, this.albedo.g, this.albedo.b,
            this.emissive.r, this.emissive.g, this.emissive.b,
            this.ambient.r, this.ambient.g, this.ambient.b,
        ];
        this.dataTexture.setFullData(this.index, data);
    }
}