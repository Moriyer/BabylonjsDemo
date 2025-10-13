import { DataUtils } from "@/Demo/Utils/DataUtils";
import { DisposeObject } from "@/Demo/Utils/DisposeObject";
import * as BABYLON from 'babylonjs';
import { SceneCombineParse } from "../SceneCombineParse";
import { SceneCombineMaterial } from "./SceneCombineMaterial";
import { ISceneCombineMaterialInfo, SceneCombineMaterialData } from "./SceneCombineMaterialData";
import { SceneCombineTextureManager } from "./SceneCombineTextureManager";

export class SceneCombineMaterialManager extends DisposeObject {
    root: BABYLON.TransformNode;
    parse: SceneCombineParse;
    texture: SceneCombineTextureManager;
    materialCount: number = 0;

    materialDatas: SceneCombineMaterialData[] = [];
    materials: SceneCombineMaterial[] = [];

    constructor(parse: SceneCombineParse, root: BABYLON.TransformNode) {
        super();
        this.root = root;
        this.parse = parse;


        const meta = DataUtils.getGLTFMeta(root.metadata);
        const infos = meta["SceneCombine_MaterialData"] as ISceneCombineMaterialInfo[];
        this.materialCount = infos.length;

        this.texture = new SceneCombineTextureManager(this);

        infos.forEach((info, index) => {
            if (info.index === undefined) {
                info.index = index;
            }
            const data = new SceneCombineMaterialData(this, info.index, this.texture.materialDataTexture);
            data.initWithInfo(info);
            this.materialDatas.push(data);
        })
        this.texture.materialDataTexture.update();
        this.initCombineMaterial();
        this.onDisposeObservable.add(() => {
            this.texture.dispose();
        })
    }

    private initCombineMaterial() {
        this.root.getChildren().forEach(node => {
            this.materials.push(new SceneCombineMaterial(this, node as BABYLON.TransformNode));
        })
    }
}