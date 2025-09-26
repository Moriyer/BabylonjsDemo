import { InspectorNode } from '@/Demo/Node/InspectorNode';
import * as BABYLON from 'babylonjs';
import { getMaterialOnChangedObservable } from '../MaterialUtils';

export class SceneCombine {
    static metaKey = [
        "meshMerge_MeshIndex",
        "meshMerge_MaterialIndex",
        "meshMerge_HideInInspector",
        "meshMerge_CombineMesh",
        "meshMerge_MaterialMesh",
        "meshMerge_MeshCount",
        "meshMerge_MaterialCount",
        "meshMerge_Enable",
        "meshMerge_Visible",
    ]

    static combine(asset: BABYLON.AssetContainer) {
        const vds: BABYLON.VertexData[] = [];
        const root = asset.meshes[0];
        const scene = root.getScene();
        const rootMeshes = root.getChildMeshes();
        const materialMap = this.mapMaterial(asset, rootMeshes);

        let indices: number[] = [];
        let positions: number[] = [];
        let normals: number[] = [];
        let uvs: number[] = [];
        let uvs2: number[] = [];
        let uvs3: number[] = [];
        let uvs4: number[] = [];

        const toVD = () => {
            if (positions.length === 0) return;
            const vd = new BABYLON.VertexData();
            vd.indices = indices.length < 65535 ? new Uint16Array(indices) : new Uint32Array(indices);
            vd.positions = positions;
            vd.normals = normals;
            vd.uvs = uvs.length > 0 ? uvs : null;
            vd.uvs2 = uvs2.length > 0 ? uvs2 : null;
            vd.uvs3 = uvs3.length > 0 ? uvs3 : null;
            vd.uvs4 = uvs4;
            vds.push(vd);
            indices = [];
            positions = [];
            normals = [];
            uvs = [];
            uvs2 = [];
            uvs3 = [];
            uvs4 = [];
        }
        let meshIndex = 0;
        const addNormals = (vdNormals: BABYLON.Nullable<BABYLON.FloatArray> | null, vdPositions: BABYLON.FloatArray, vdIndices: BABYLON.IndicesArray) => {
            if (!vdNormals && normals.length === 0) {
                return;
            }
            if (normals.length === 0) {
                BABYLON.VertexData.ComputeNormals(positions, indices, normals);
            }
            if (!vdNormals) {
                vdNormals = [];
                BABYLON.VertexData.ComputeNormals(vdPositions, vdIndices, vdNormals);
            }
            normals.push(...vdNormals);
        }
        const addUVs = (UVs: number[], vdUVs: BABYLON.Nullable<BABYLON.FloatArray>, posLength: number) => {
            if (!vdUVs && UVs?.length === 0) {
                return;
            }
            if (UVs.length === 0) {
                UVs = new Array(positions.length / 3 * 2).fill(0);
            }
            if (!vdUVs) {
                vdUVs = new Array(posLength * 2).fill(0);
            }
            UVs.push(...vdUVs);
        }
        rootMeshes.forEach(absMesh => {
            if (absMesh === root) return;
            const mesh = absMesh as BABYLON.Mesh;
            if (!mesh._isMesh) return;
            //避免Instance
            if (mesh.isAnInstance) return;
            //避免InstancedMesh
            if (mesh.hasInstances) return;
            const meshVD = BABYLON.VertexData.ExtractFromMesh(mesh);
            const vdPositions = meshVD.positions;
            if (!vdPositions) return;
            console.log(mesh.name);
            const node = new BABYLON.TransformNode(mesh.name, scene);
            node.setParent(mesh.parent);
            node.position.copyFrom(mesh.position);
            node.scaling.copyFrom(mesh.scaling);
            node.rotation.copyFrom(mesh.rotation);
            if (mesh.rotationQuaternion) {
                node.rotationQuaternion = mesh.rotationQuaternion.clone();
            }
            const meshChildren = mesh.getChildren();
            meshChildren.forEach(mc => {
                mc.parent = node;
            });

            const materialId = materialMap.get(mesh.material!) || 0;

            node.metadata = {
                meshMerge_MeshIndex: meshIndex,
                meshMerge_MaterialIndex: materialId,
            };

            //开始处理mesh
            if ((vdPositions.length + positions.length) / 3 > 8000000) toVD();
            const startIndex = positions.length / 3;
            //POSITION
            positions.push(...vdPositions);
            //Indices
            let vdIndices = meshVD.indices;
            if (vdIndices) {
                vdIndices.forEach(index => {
                    indices.push(index + startIndex);
                })
            }
            else {
                vdIndices = new Array(vdPositions.length / 3).fill(0).map((v, i) => i);
                for (let index = 0; index < vdPositions.length / 3; index++) {
                    indices.push(index + startIndex);
                }
            }
            //normals
            addNormals(meshVD.normals, vdPositions, vdIndices);
            //uvs
            addUVs(uvs, meshVD.uvs, vdPositions.length / 3);
            addUVs(uvs2, meshVD.uvs2, vdPositions.length / 3);
            addUVs(uvs3, meshVD.uvs3, vdPositions.length / 3);
            const vdUV4 = new Array(vdPositions.length / 3 * 2).fill(0);
            for (let index = 0; index < vdPositions.length / 3; index++) {
                vdUV4[index * 2] = meshIndex;
                vdUV4[index * 2 + 1] = materialId;
            }
            uvs4.push(...vdUV4);
            mesh.dispose();
            meshIndex++;
        })
        toVD();

        const meshRoot = new BABYLON.TransformNode("MeshRoot", scene);
        meshRoot.setParent(root);
        meshRoot.metadata = {
            meshMerge_HideInInspector: true,
        }
        vds.forEach((vd, i) => {
            const mesh = new BABYLON.Mesh(`VDCombine_${i}`, scene);
            mesh.setParent(meshRoot);
            mesh.metadata = {
                meshMerge_CombineMesh: true,
            }
            vd.applyToMesh(mesh);
        })

        const materialRoot = new BABYLON.TransformNode("MaterialRoot", scene);
        materialRoot.setParent(root);
        materialRoot.metadata = {
            meshMerge_HideInInspector: true,
        }
        for (const mat of materialMap.keys()) {
            const matMesh = BABYLON.MeshBuilder.CreatePlane(`${mat.name}_plane`, {
                width: 1,
                height: 1,
            }, scene);
            matMesh.setEnabled(false);
            matMesh.material = mat;
            matMesh.setParent(materialRoot);
            matMesh.metadata = {
                meshMerge_MaterialMesh: materialMap.get(mat),
            }
        }

        root.metadata ||= {};
        root.metadata.meshMerge_MeshCount = meshIndex;
        root.metadata.meshMerge_MaterialCount = materialMap.size;


        const initNode = (node: BABYLON.Node) => {
            node.metadata = node.metadata || {};
            node.metadata.meshMerge_Enable = node.isEnabled(false);
            const mesh = node as BABYLON.Mesh;
            if (mesh.isVisible !== undefined) {
                node.metadata.meshMerge_Visible = mesh.isVisible;
            }

            node.getChildren().forEach(child => {
                initNode(child);
            })
        }

        initNode(root);

    }

    private static mapMaterial(asset: BABYLON.AssetContainer, rootMeshes: BABYLON.AbstractMesh[]) {
        const scene = asset.scene;
        //处理material
        const defaultMaterial = new BABYLON.StandardMaterial("defaultMaterial", scene);
        let materialIndex = 0;
        const materialMap: Map<BABYLON.Material, number> = new Map();
        let useDefaultMaterial = false;
        const root = asset.meshes[0];
        rootMeshes.forEach(absMesh => {
            if (absMesh === root) return;
            const mesh = absMesh as BABYLON.Mesh;
            if (!mesh.material) {
                mesh.material = defaultMaterial;
                useDefaultMaterial = true;
            }
        });
        if (useDefaultMaterial) {
            materialMap.set(defaultMaterial, materialIndex++);
        }
        asset.materials.forEach(material => {
            materialMap.set(material, materialIndex++);
        })
        return materialMap;
    }
}


export class SceneCombineLoader {
    meshCount: number = 0;
    materialCount: number = 0;
    /**合并后的网格节点 */
    combineMesheNodes: BABYLON.Mesh[] = [];
    /**合并前的网格节点，现为TransformNode */
    meshNodes: BABYLON.TransformNode[] = [];
    /**材质节点 */
    materialNodes: BABYLON.Mesh[] = [];

    scene: BABYLON.Scene;
    asset: BABYLON.AssetContainer;

    meshIndexToMeshMap: Map<number, BABYLON.Mesh> = new Map();
    materialIndexToMaterialMap: Map<number, BABYLON.StandardMaterial> = new Map();
    meshIndexToMaterialIndexMap: Map<number, number> = new Map();

    material: BABYLON.ShaderMaterial = null as any;
    constructor(asset: BABYLON.AssetContainer) {
        this.asset = asset;
        this.scene = asset.scene;
        const __root__ = asset.meshes[0] as BABYLON.Mesh;
        const root = __root__.getChildren(undefined, true)[0];
        const rootMeta = this.getGLTFMeta(root.metadata);
        if (!rootMeta) {
            console.log("根元素Meta数据丢失");
            return;
        }
        //设置可视化
        asset.getNodes().forEach(node => {
            const gltfData = this.getGLTFMeta(node.metadata);
            if (!gltfData) return;
            if (gltfData.meshMerge_Enable !== undefined) {
                node.setEnabled(gltfData.meshMerge_Enable);
            }
            if (gltfData.meshMerge_Visible !== undefined) {
                (node as BABYLON.Mesh).isVisible = gltfData.meshMerge_Visible;
            }
        })

        this.meshCount = rootMeta.meshMerge_MeshCount;
        this.materialCount = rootMeta.meshMerge_MaterialCount;
        this.combineMesheNodes = this.getNode(asset.meshes, "meshMerge_CombineMesh") as BABYLON.Mesh[];
        this.meshNodes = this.getNode(asset.transformNodes, "meshMerge_MeshIndex") as BABYLON.TransformNode[];
        this.materialNodes = this.getNode(asset.meshes, "meshMerge_MaterialMesh") as BABYLON.Mesh[];

        this.meshNodes.forEach(node => {
            const gltfData = this.getGLTFMeta(node.metadata);
            const { meshMerge_MaterialIndex, meshMerge_MeshIndex } = gltfData;
            this.meshIndexToMeshMap.set(meshMerge_MeshIndex, node as BABYLON.Mesh);
            this.meshIndexToMaterialIndexMap.set(meshMerge_MeshIndex, meshMerge_MaterialIndex);
        });
        this.materialNodes.forEach(node => {
            const gltfData = this.getGLTFMeta(node.metadata);
            const materialMeshIndex = gltfData["meshMerge_MaterialMesh"] as number;
            this.materialIndexToMaterialMap.set(materialMeshIndex, node.material as BABYLON.StandardMaterial);
        });

        this.createMaterial();

        // this.createMaterial(asset.scene
        //     combineMeshes, meshNodes, materialNodes);
    }

    private createMaterial() {

        const material = new BABYLON.ShaderMaterial("meshMerge_Material", this.scene, {
            vertexSource: this.getVertexShader(),
            fragmentSource: this.getFragmentShader(),
        }, {
            attributes: ["position", 'uv4'],
            uniforms: ["world", "viewProjection", "uWorldArray", "uColorArray"],
            samplers: [],
        });
        this.material = material;
        //设置材质
        this.combineMesheNodes.forEach(mesh => {
            mesh.material = material;
            const vd = BABYLON.VertexData.ExtractFromMesh(mesh);
        })

        //配置矩阵
        const matrixArray: Array<BABYLON.Matrix> = new Array(this.meshCount);
        const colorArray: Array<BABYLON.Color3> = new Array(this.meshCount);
        for (let index = 0; index < colorArray.length; index++) {
            matrixArray[index] = BABYLON.Matrix.Identity();
            colorArray[index] = new BABYLON.Color3(1, 1, 1);
        }
        material.setMatrices("uWorldArray", matrixArray);
        material.setColor3Array("uColorArray", colorArray);

        const applyMatrix = (index: number, matrix: BABYLON.Matrix) => {
            const _matrixArrays = (material as any)._matrixArrays["uWorldArray"] as Float32Array;
            matrix.copyToArray(_matrixArrays, index * 16);
        }
        const applyColor = (index: number, color: BABYLON.Color3) => {
            const _colorArrays = (material as any)._colors3Arrays["uColorArray"] as Float32Array;
            color.toArray(_colorArrays, index * 3);
        }

        this.scene.debugLayer.select(this.meshNodes[0]);
        //Mesh专区
        this.meshNodes.forEach(node => {
            const gltfData = this.getGLTFMeta(node.metadata);
            const { meshMerge_MaterialIndex, meshMerge_MeshIndex } = gltfData;
            if (meshMerge_MaterialIndex === undefined || meshMerge_MeshIndex === undefined) {
                console.log("meshMerge_MaterialIndex or meshMerge_MeshIndex is undefined");
                return;
            }
            applyMatrix(meshMerge_MeshIndex, node.getWorldMatrix());
            node.onAfterWorldMatrixUpdateObservable.add(() => {
                applyMatrix(meshMerge_MeshIndex, node.getWorldMatrix());
            })

            colorArray[meshMerge_MeshIndex].set(Math.random(), Math.random(), Math.random());
            applyColor(meshMerge_MeshIndex, colorArray[meshMerge_MeshIndex]);

            InspectorNode.addRef(node, "颜色", "meshColor", colorArray[meshMerge_MeshIndex].clone(), (v) => {
                applyColor(meshMerge_MeshIndex, v);
            });
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


    private getVertexShader() {
        return `
            precision highp float;
            attribute vec3 position;
            
            attribute vec2 uv4;

            uniform mat4 world;
            uniform mat4 viewProjection;
            uniform mat4 uWorldArray[${this.meshCount}];

            flat varying ivec2 pData;
            void main(){
                vec3 positionUpdated = position;
                pData = ivec2(uv4);
                int meshIndex = int(uv4.x);
                mat4 uWorld = uWorldArray[meshIndex];
                // positionUpdated.x += mod(uv4.x,10.) * 2.;
                // positionUpdated.y += mod(floor(uv4.x/10.),10.)* 2.;
                // positionUpdated.z += mod(floor(uv4.x/100.),10.)* 2.;
                gl_Position = viewProjection * uWorld * vec4(positionUpdated,1.);
            }

        `;
    }

    private getFragmentShader() {
        return `
            precision highp float;

            // uniform vec3 uColorArray[${this.meshCount}];

            flat varying ivec2 pData;

            void main(){
               
                int meshIndex = pData.x;
                int materialIndex = pData.y;

                vec3 finColor = vec3(1.,1.,1.);

                // vec3 meshColor = uColorArray[meshIndex];
                // finColor*=meshColor;

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