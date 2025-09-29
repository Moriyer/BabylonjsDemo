import { InspectorNode } from '@/Demo/Node/InspectorNode';
import * as BABYLON from 'babylonjs';
import { DisposeObject } from '../DisposeObject';
import { getMaterialOnChangedObservable } from '../MaterialUtils';
import { MeshPicker } from '../MeshPicker';
import { DataTexture } from '../Texture/DataTexture';
import { MatrixAndInvTexture } from '../Texture/MatrixAndInvTexture';
import { SceneCombineGPUPicker } from './SceneCombineGPUPicker';
import { SceneCombineItem } from './SceneCombineItem';



export class SceneCombineLoader extends DisposeObject {
    meshCount: number = 0;
    materialCount: number = 0;
    /**合并后的网格节点 */
    combineMesheNodes: BABYLON.Mesh[] = [];
    /**合并前的网格节点，现为TransformNode */
    meshNodes: {
        node: BABYLON.TransformNode,
        meshIndex: number,
        materialIndex: number,
    }[] = [];
    /**材质节点 */
    materialNodes: BABYLON.Mesh[] = [];

    scene: BABYLON.Scene;
    asset: BABYLON.AssetContainer;

    meshIndexToMeshNodeMap: Map<number, BABYLON.TransformNode> = new Map();
    materialIndexToMaterialMap: Map<number, BABYLON.StandardMaterial> = new Map();
    meshIndexToMaterialIndexMap: Map<number, number> = new Map();

    material: BABYLON.ShaderMaterial = null as any;
    matrixTexture: MatrixAndInvTexture = null as any;
    meshColorTexture: DataTexture = null as any;
    meshPicker: MeshPicker = null as any;
    gpuPicker: SceneCombineGPUPicker = null as any;

    constructor(asset: BABYLON.AssetContainer) {
        super();
        this.asset = asset;
        this.scene = asset.scene;
        const __root__ = asset.meshes[0] as BABYLON.Mesh;
        const root = __root__.getChildren(undefined, true)[0];
        const rootMeta = this.getGLTFMeta(root.metadata);
        if (!rootMeta) {
            console.log("根元素Meta数据丢失");
            return;
        }
        this.scene.skipPointerDownPicking = true;
        this.scene.skipPointerUpPicking = true;

        //设置可视化
        asset.getNodes().forEach(node => {
            const item = new SceneCombineItem(node);
            const gltfData = this.getGLTFMeta(node.metadata);
            if (!gltfData) return;
            if (gltfData.meshMerge_Enable !== undefined) {
                node.setEnabled(gltfData.meshMerge_Enable);
            }
            if (gltfData.meshMerge_Visible !== undefined) {
                (node as BABYLON.Mesh).isVisible = gltfData.meshMerge_Visible;
                item.visible = gltfData.meshMerge_Visible;
            }
        })

        // asset.meshes.forEach(mesh => {
        //     mesh.isPickable = false;
        //     mesh.checkCollisions = false;
        // })
        this.meshCount = rootMeta.meshMerge_MeshCount;
        this.materialCount = rootMeta.meshMerge_MaterialCount;
        this.combineMesheNodes = this.getNode(asset.meshes, "meshMerge_CombineMesh") as BABYLON.Mesh[];
        this.combineMesheNodes.forEach(mesh => {
            mesh.isPickable = true;
            mesh.checkCollisions = true;
            const vd = BABYLON.VertexData.ExtractFromMesh(mesh);
        })
        this.meshNodes = (this.getNode(asset.transformNodes, "meshMerge_MeshIndex") as BABYLON.TransformNode[]).map(node => {
            const gltfData = this.getGLTFMeta(node.metadata);
            const meshIndex = gltfData["meshMerge_MeshIndex"] as number;
            const materialIndex = gltfData["meshMerge_MaterialIndex"] as number;
            this.meshIndexToMeshNodeMap.set(meshIndex, node);
            this.meshIndexToMaterialIndexMap.set(meshIndex, materialIndex);
            return {
                node,
                meshIndex,
                materialIndex
            }
        });
        setTimeout(() => {
            this.scene.debugLayer.select(this.meshNodes[0].node);
        }, 3000);
        this.materialNodes = this.getNode(asset.meshes, "meshMerge_MaterialMesh") as BABYLON.Mesh[];

        this.materialNodes.forEach(node => {
            const gltfData = this.getGLTFMeta(node.metadata);
            const materialMeshIndex = gltfData["meshMerge_MaterialMesh"] as number;
            this.materialIndexToMaterialMap.set(materialMeshIndex, node.material as BABYLON.StandardMaterial);
        });

        this.createMaterial();
        this.initPicker();

        this.onDisposeObservable.add(() => {
            this.material.dispose();
            this.gpuPicker.dispose();
            this.meshPicker.dispose();
            if (this.matrixTexture) {
                this.matrixTexture.dispose();
            }
        })

        // this.createMaterial(asset.scene
        //     combineMeshes, meshNodes, materialNodes);
    }

    private initPicker() {
        if (this.meshPicker) return;
        this.meshPicker = new MeshPicker(this.scene);
        this.gpuPicker = new SceneCombineGPUPicker(this);
        this.gpuPicker.setCombineMeshList(this.combineMesheNodes);
        this.meshPicker.leftButton.onDownObservable.add(() => {
            console.log("Down");
            const result = this.gpuPicker.pickAsync(this.scene.pointerX, this.scene.pointerY);
        })
    }

    private createMaterial() {
        this.createMatrixTexture();
        this.createMeshColortexture();
        const material = new BABYLON.ShaderMaterial("meshMerge_Material", this.scene, {
            vertexSource: this.getVertexShader(),
            fragmentSource: this.getFragmentShader(),
        }, {
            attributes: ["position", 'normal', 'uv4'],
            uniforms: ["world", "viewProjection",
                ...this.matrixTexture.getUniformNames(),
                ...this.meshColorTexture.getUniformNames(),
            ],
            samplers: [
                ...this.matrixTexture.getSamplerNames(),
                ...this.meshColorTexture.getSamplerNames(),
            ],
        });
        this.material = material;
        this.matrixTexture.applyToMaterial(this.material);
        this.meshColorTexture.applyToMaterial(this.material);
        //设置材质
        this.combineMesheNodes.forEach(mesh => {
            mesh.material = material;
        })



        //Material
        const setDataToMaterial = (material: BABYLON.StandardMaterial, index: number) => {

        }

        this.materialNodes.forEach(node => {
            const gltfData = this.getGLTFMeta(node.metadata);
            const materialMeshIndex = gltfData["meshMerge_MaterialMesh"] as number;
            const onMaterialChanged = getMaterialOnChangedObservable(node.material!);
            onMaterialChanged.add((data) => {
                setDataToMaterial(node.material! as any, materialMeshIndex);
            })
        })
    }



    private createMatrixTexture() {
        if (this.matrixTexture) return this.matrixTexture;
        const meshNodes = this.meshNodes;
        this.matrixTexture = new MatrixAndInvTexture("Matrix", this.scene, this.meshCount);
        meshNodes.forEach((node) => {
            this.matrixTexture.setMatrix(node.meshIndex, node.node.getWorldMatrix());
            node.node.onAfterWorldMatrixUpdateObservable.add(() => {
                this.matrixTexture.setMatrix(node.meshIndex, node.node.getWorldMatrix());
            })
        })
        this.matrixTexture.update();
        return this.matrixTexture;
    }

    private createMeshColortexture() {
        if (this.meshColorTexture) return this.meshColorTexture;
        this.meshColorTexture = new DataTexture("Color", this.scene, this.meshCount, 2, 3, false);
        const applyColor = (index: number, color: BABYLON.Color3) => {
            this.meshColorTexture.setData(index, 0, [color.r, color.g, color.b]);
        }
        this.meshNodes.forEach(node => {
            const color = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
            applyColor(node.meshIndex, color);

            const item = SceneCombineItem.getItem(node.node)!;
            this.meshColorTexture.setData(node.meshIndex, 1, item.parameter1);
            item.onParameter1ChangedObservable.add(() => {
                this.meshColorTexture.setData(node.meshIndex, 1, item.parameter1);
            })

            InspectorNode.addRef(node.node, "颜色", "c_meshColor", color.clone(), (v) => {
                applyColor(node.meshIndex, v);
            });
            InspectorNode.addNumber(node.node, "Visible", "c_Visible", item.visible ? 1 : 0, (V) => {
                item.visible = V > 0.5;
            });
        })
        this.meshColorTexture.update();
        return this.meshColorTexture;
    }

    private getVertexShader() {
        const vertex = `
            precision highp float;
            attribute vec3 position;
            attribute vec2 uv4;
            attribute vec3 normal;

            uniform mat4 world;
            uniform mat4 viewProjection;

            flat varying ivec2 pData;
            varying vec3 vWNormal;

            ${this.matrixTexture.getShader()}
            flat varying vec4 vDebugger;
            void main(){
                vec3 positionUpdated = position;
                pData = ivec2(uv4);
                int meshIndex = int(uv4.x);
                ${this.matrixTexture.shaderMatrixStruct("meshMatrix", "uv4.x")}
                vWNormal = (meshMatrixInv * vec4(normal,0.)).xyz;

                gl_Position = viewProjection * meshMatrix *  vec4(positionUpdated,1.);
            }

        `;
        return vertex;
    }

    private getFragmentShader() {
        return `
            precision highp float;

            flat varying ivec2 pData;
            flat varying vec4 vDebugger;
            varying vec3 vWNormal;

            ${this.meshColorTexture.getShader()}

            void main(){
               
                int meshIndex = pData.x;
                float fMeshIndex = float(meshIndex);
                int materialIndex = pData.y;
                 ${this.meshColorTexture.shaderStruct("meshColorData", "fMeshIndex")};
                vec3 meshColor = meshColorData.data0;
                float visible = meshColorData.data1.x;
                if (visible < 0.5) discard;

                vec3 finColor = vec3(1.,1.,1.);

                finColor*=meshColor;
                finColor = vWNormal*0.5+0.5;
                gl_FragColor = vec4(finColor,1.);
            }
        
        `;
    }

    private getGLTFMeta(metadata: any) {
        if (!metadata) return null;
        if (!metadata["gltf"]) return null;
        return metadata["gltf"]["extras"] || null;
    }

    private getNode<T>(array: T[], key: string): T[] {
        const results: T[] = [];
        array.forEach(item => {
            const meta = this.getGLTFMeta((item as any).metadata);
            if (meta && meta[key] !== undefined) {
                results.push(item);
            }
        })
        return results;
    }
}