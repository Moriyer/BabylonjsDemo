import * as BABYLON from 'babylonjs';

export class SceneCombineUtils {
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
        const addNormals = (vdPositions: BABYLON.FloatArray, vdIndices: BABYLON.IndicesArray) => {
            const vdNormals: number[] = [];
            BABYLON.VertexData.ComputeNormals(vdPositions, vdIndices, vdNormals);
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
            if (mesh.hasThinInstances) return;
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
            addNormals(vdPositions, vdIndices);
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

