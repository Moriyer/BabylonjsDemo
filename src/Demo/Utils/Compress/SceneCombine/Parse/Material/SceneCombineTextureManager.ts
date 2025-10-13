import { InspectorNode } from '@/Demo/Node/InspectorNode';
import { DisposeObject } from '@/Demo/Utils/DisposeObject';
import { DataTexture } from '@/Demo/Utils/Texture/DataTexture';
import { MatrixAndInvTexture } from '@/Demo/Utils/Texture/MatrixAndInvTexture';
import { SceneCombineMeshData } from '../SceneCombineMeshData';
import { SceneCombineParse } from '../SceneCombineParse';
import { SceneCombineMaterialData } from './SceneCombineMaterialData';
import { SceneCombineMaterialManager } from './SceneCombineMaterialManager';
export class SceneCombineTextureManager extends DisposeObject {
    parse: SceneCombineParse;
    material: SceneCombineMaterialManager;

    matrixTexture: MatrixAndInvTexture = null as any;
    meshDataTexture: DataTexture = null as any;
    materialDataTexture: DataTexture = null as any;
    constructor(material: SceneCombineMaterialManager) {
        super();
        this.parse = material.parse;
        this.material = material;


        this.createMatrixTexture();
        this.createMeshDataTexture();
        this.createMaterialDataTexture();


        this.onDisposeObservable.add(() => {
            this.matrixTexture?.dispose();
            this.meshDataTexture?.dispose();
            this.materialDataTexture?.dispose();
        })
    }

    update() {
        this.matrixTexture?.update();
        this.meshDataTexture?.update();
        this.materialDataTexture?.update();
    }


    private createMatrixTexture() {
        if (this.matrixTexture) return this.matrixTexture;
        const meshNodes = this.parse.meshNodes;
        this.matrixTexture = new MatrixAndInvTexture("Matrix", this.parse.scene, this.parse.meshCount);
        meshNodes.forEach((node) => {
            this.matrixTexture.setMatrix(node.meshIndex, node.node.getWorldMatrix());
            node.node.onAfterWorldMatrixUpdateObservable.add(() => {
                this.matrixTexture.setMatrix(node.meshIndex, node.node.getWorldMatrix());
            })
        })
        this.matrixTexture.update();
        return this.matrixTexture;
    }

    private createMeshDataTexture() {
        if (this.meshDataTexture) return this.meshDataTexture;
        this.meshDataTexture = new DataTexture("Color", this.parse.scene, this.parse.meshCount, SceneCombineMeshData.dataCount, 3, false);
        this.parse.meshNodes.forEach(data => {
            const meshData = new SceneCombineMeshData(data.node, data.meshIndex, this.meshDataTexture);

            InspectorNode.addRef(data.node, "颜色", "c_meshColor", meshData.color.clone(), (v) => {
                meshData.color.copyFrom(v);
            });
            InspectorNode.addNumber(data.node, "Visible", "c_Visible", meshData.visible ? 1 : 0, (V) => {
                meshData.visible = V > 0.5;
            });
        })
        this.meshDataTexture.update();
        return this.meshDataTexture;
    }

    private createMaterialDataTexture() {
        if (this.materialDataTexture) return this.materialDataTexture;
        this.materialDataTexture = new DataTexture("Material", this.parse.scene, this.material.materialCount, SceneCombineMaterialData.dataCount, 3, false);
    }
}