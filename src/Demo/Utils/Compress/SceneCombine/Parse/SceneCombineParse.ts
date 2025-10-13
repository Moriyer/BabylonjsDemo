import { DataUtils } from "@/Demo/Utils/DataUtils";
import { DisposeObject } from "@/Demo/Utils/DisposeObject";
import { MousePicker } from "@/Demo/Utils/MousePicker";
import * as BABYLON from 'babylonjs';
import { SceneCombineGPUPicker } from "../Picker/SceneCombineGPUPicker";
import { SceneCombineMaterialManager } from "./Material/SceneCombineMaterialManager";

export class SceneCombineParse extends DisposeObject {
    material: SceneCombineMaterialManager = null as any;
    asset: BABYLON.AssetContainer;
    scene: BABYLON.Scene;
    root: BABYLON.TransformNode = null as any;

    meshCount: number = 0;
    /**合并前的网格节点，现为TransformNode */
    meshNodes: {
        node: BABYLON.TransformNode,
        meshIndex: number,
    }[] = [];
    meshIndexToMeshNodeMap: Map<number, BABYLON.TransformNode> = new Map();

    // gpuPicker: SceneCombineGPUPicker = null as any;
    mousePicker: MousePicker = null as any;
    gpuPicker: SceneCombineGPUPicker = null as any;
    constructor(asset: BABYLON.AssetContainer) {
        super();
        this.asset = asset;
        this.scene = asset.scene;
        const meshRoot = asset.meshes[0];
        const root = meshRoot.getChildren()[0];
        const noCombineFile = () => {
            console.log("不是预处理过的文件,无法通过优化显示,联系后端检查");
        }
        if (!root) {
            noCombineFile();
            return;
        }
        this.root = root as any;
        const rootMeta = DataUtils.getGLTFMeta(root.metadata);
        if (!rootMeta["SceneCombine_Root"]) {
            noCombineFile();
            return;
        }

        const materialRoot = root.getChildren().find(n => n.name === "MaterialRoot")!;
        if (!materialRoot) {
            noCombineFile();
            return;
        }

        this.initDataAndMap();

        this.meshCount = rootMeta["SceneCombine_MeshCount"];
        this.material = new SceneCombineMaterialManager(this, materialRoot as any);

        this.initPicker();

        this.onDisposeObservable.add(() => {
            this.material.dispose();
            if (this.mousePicker) this.mousePicker.dispose();
            if (this.gpuPicker) this.gpuPicker.dispose();

        })


    }

    private initPicker() {
        this.scene.skipPointerDownPicking = true;
        this.scene.skipPointerUpPicking = true;
        this.mousePicker = new MousePicker(this.scene);
        this.gpuPicker = new SceneCombineGPUPicker(this);

        const pickers: BABYLON.Mesh[] = [];
        this.material.materials.forEach(material => {
            pickers.push(...material.meshes);
        });
        this.gpuPicker.setCombineMeshList(pickers);

        this.mousePicker.leftButton.onDoubleObservable.add(async (info) => {
            const result = await this.gpuPicker.pickAsync(this.scene.pointerX, this.scene.pointerY);
            console.log(result);
            if (result) {
                if (result.meshNode) {
                    this.scene.debugLayer.select(result.meshNode);
                }
            }
        })
    }

    private initDataAndMap() {
        this.meshNodes = (this.getNode(this.asset.transformNodes, "SceneCombine_MeshIndex") as BABYLON.TransformNode[]).map(node => {
            const gltfData = DataUtils.getGLTFMeta(node.metadata);
            const meshIndex = gltfData["SceneCombine_MeshIndex"] as number;
            this.meshIndexToMeshNodeMap.set(meshIndex, node);
            return {
                node,
                meshIndex,
            }
        });
    }




    private getNode<T>(array: T[], key: string): T[] {
        const results: T[] = [];
        array.forEach(item => {
            const meta = DataUtils.getGLTFMeta((item as any).metadata);
            if (meta && meta[key] !== undefined) {
                results.push(item);
            }
        })
        return results;
    }

}