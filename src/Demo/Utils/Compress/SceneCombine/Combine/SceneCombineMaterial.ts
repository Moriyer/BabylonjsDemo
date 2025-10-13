import * as BABYLON from 'babylonjs';
import { ISceneCombineMaterialInfo } from '../Parse/Material/SceneCombineMaterialData';

export class SceneCombineMaterial {
    root: BABYLON.TransformNode;
    materialInfos: ISceneCombineMaterialInfo[];


    combineMaterials: BABYLON.PBRMaterial[] = [];
    pbrMaterials: BABYLON.PBRMaterial[] = [];
    materialToCombineMaterialMap: Map<BABYLON.PBRMaterial, BABYLON.PBRMaterial> = new Map();

    constructor(root: BABYLON.TransformNode, asset: BABYLON.AssetContainer) {
        const materials = asset.materials as BABYLON.PBRMaterial[];
        this.root = new BABYLON.TransformNode("MaterialRoot", root.getScene());
        asset.transformNodes.push(this.root);
        this.root.setParent(root);
        this.materialInfos = new Array(materials.length);

        materials.forEach((material, index) => {
            if (material.getClassName() !== "PBRMaterial") return;
            this.materialInfos[index] = {
                index: index,
                alpha: material.alpha,
                alphaCutoff: material.alphaCutOff,
                metallic: material.metallic,
                roughness: material.roughness,
                albedo: [material.albedoColor.r, material.albedoColor.g, material.albedoColor.b],
                emissive: [material.emissiveColor.r, material.emissiveColor.g, material.emissiveColor.b],
                emissiveIntensity: material.emissiveIntensity,
                ambient: [material.ambientColor.r, material.ambientColor.g, material.ambientColor.b],
            }
            this.pbrMaterials.push(material);
            const cMat = this.getCombineMaterial(material);
            this.materialToCombineMaterialMap.set(material, cMat);
        })
        this.root.metadata = {
            "SceneCombine_MaterialData": this.materialInfos,
        }

    }

    private getCombineMaterial(material: BABYLON.PBRMaterial) {
        for (const cMat of this.combineMaterials) {
            if (cMat.transparencyMode !== material.transparencyMode) {
                continue;
            }
            if (!this.textureEqual(cMat.albedoTexture as any, material.albedoTexture as any)) {
                continue;
            }
            if (!this.textureEqual(cMat.bumpTexture as any, material.bumpTexture as any)) {
                continue;
            }
            if (!this.textureEqual(cMat.emissiveTexture as any, material.emissiveTexture as any)) {
                continue;
            }
            if (!this.textureEqual(cMat.ambientTexture as any, material.ambientTexture as any)) {
                continue;
            }
            if (!this.textureEqual(cMat.metallicTexture as any, material.metallicTexture as any)) {
                continue;
            }
            if (!this.textureEqual(cMat.opacityTexture as any, material.opacityTexture as any)) {
                continue;
            }
            return cMat;
        }
        const newMaterial = material;
        this.combineMaterials.push(newMaterial);
        return newMaterial;
    }

    private textureEqual(t1: BABYLON.Texture | null, t2: BABYLON.Texture | null) {
        if (t1 === t2) return true;
        if (t1 === null || t2 === null) return false;
        if (t1.url || t2.url) {
            if (t1.url !== t2.url) return false;
            if (t1.url === t2.url) return true;
        }
        return t1._buffer === t2._buffer;
    }

}