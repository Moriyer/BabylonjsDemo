
import { MeshUtils } from '@/Demo/Utils/MeshUtils';
import * as BABYLON from 'babylonjs';
import { SceneCombineMaterial } from './SceneCombineMaterial';

export class SceneCombineHelper {
    static metaKey: string[] = [
        "SceneCombine_Root",
        "SceneCombine_MeshIndex",
        "SceneCombine_MeshCount",
        "SceneCombine_MaterialData",
    ]
    static combine(asset: BABYLON.AssetContainer) {
        const root = asset.meshes[0];
        const scene = asset.scene;
        const newRoot = new BABYLON.TransformNode("SceneRoot", scene);
        asset.transformNodes.push(newRoot);
        newRoot.addChild(root);
        newRoot.metadata = {
            SceneCombine_Root: true,
        };

        //处理网格
        const newMeshList: BABYLON.AbstractMesh[] = [];
        const meshNodeList: BABYLON.Mesh[] = [];
        asset.meshes.forEach((absMesh) => {
            if (absMesh === root || absMesh.isAnInstance || absMesh.hasInstances || absMesh.hasThinInstances) {
                newMeshList.push(absMesh);
                return;
            }
            const mesh = absMesh as BABYLON.Mesh;
            if (!mesh._isMesh) {
                newMeshList.push(mesh);
                return;
            }
            meshNodeList.push(mesh);
        })
        asset.meshes = newMeshList;
        let meshIndex = 0;

        const defaultMaterial = new BABYLON.PBRMaterial("DefaultMaterial", scene);
        defaultMaterial.albedoColor.set(1, 1, 1);
        defaultMaterial.metallic = 1;
        defaultMaterial.roughness = 1;
        asset.materials.push(defaultMaterial);
        meshNodeList.forEach((mesh) => {
            const newNode = new BABYLON.TransformNode(mesh.name, scene);
            newNode.setParent(mesh.parent);
            newNode.position.copyFrom(mesh.position);
            newNode.rotation.copyFrom(mesh.rotation);
            newNode.scaling.copyFrom(mesh.scaling);
            if (mesh.rotationQuaternion) {
                newNode.rotationQuaternion = mesh.rotationQuaternion.clone();
            }
            newNode.metadata = {};
            newNode.metadata["SceneCombine_MeshIndex"] = meshIndex++;
            mesh.metadata ||= {};
            mesh.metadata["SceneCombine_MeshIndex"] = newNode.metadata["SceneCombine_MeshIndex"];
            asset.transformNodes.push(newNode);
            const meshChildren = mesh.getChildren();
            meshChildren.forEach(mc => {
                mc.parent = newNode;
            });
            if (!mesh.material) {
                mesh.material = defaultMaterial;
            }
        })
        newRoot.metadata["SceneCombine_MeshCount"] = meshIndex;

        const scMaterial = new SceneCombineMaterial(newRoot, asset);
        //收集所有的网格数据
        const materialDataMap = new Map<BABYLON.PBRMaterial, { vertexData: BABYLON.VertexData[] }>();
        const addToMaterialDataMap = (material: BABYLON.PBRMaterial, vd: BABYLON.VertexData, meshIndex: number) => {
            const positions = vd.positions!;
            const count = positions.length / 3;
            const uvs4 = new Float32Array(count * 2);
            const materialIndex = scMaterial.pbrMaterials.indexOf(material);
            for (let index = 0; index < count; index++) {
                uvs4[index * 2] = meshIndex;
                uvs4[index * 2 + 1] = materialIndex;
            }
            vd.uvs4 = uvs4;
            if (!vd.uvs) {
                vd.uvs = new Float32Array(count * 2).fill(0);
            }

            const combineMat = scMaterial.materialToCombineMaterialMap.get(material) || scMaterial.materialToCombineMaterialMap.get(defaultMaterial)!;

            if (!materialDataMap.has(combineMat)) {
                materialDataMap.set(combineMat, {
                    vertexData: [],
                });
            }
            const data = materialDataMap.get(combineMat)!;
            data.vertexData.push(vd);
        }
        meshNodeList.forEach(mesh => {
            const meshIndex = mesh.metadata["SceneCombine_MeshIndex"] as number;
            const vd = BABYLON.VertexData.ExtractFromMesh(mesh);
            const positions = vd.positions!;
            const count = positions.length / 3;
            const normals: number[] = [];
            BABYLON.VertexData.ComputeNormals(vd.positions, vd.indices, normals);
            vd.normals = normals;
            //处理indices
            if (!vd.indices) {
                const indices = new Array(count);
                for (let index = 0; index < count; index++) {
                    indices[index] = index;
                }
                vd.indices = indices;
            }
            const vds = MeshUtils.splitVertexDataByMaterial(vd, mesh.material, defaultMaterial);
            vds.forEach((subVD) => {
                addToMaterialDataMap(subVD.material as BABYLON.PBRMaterial, subVD.vertexData, meshIndex);
            })
        })
        const combineMeshes: BABYLON.Mesh[] = [];
        //合并
        materialDataMap.forEach((data, material) => {
            const node = new BABYLON.TransformNode(material.name, scene);
            node.setParent(scMaterial.root);
            const vds = data.vertexData;
            let positions: number[] = [];
            let indices: number[] = [];
            let normals: number[] = [];
            let uvs: number[] = [];
            let uvs4: number[] = [];

            const toMesh = () => {
                if (positions.length === 0) return;
                const vd = new BABYLON.VertexData();
                vd.positions = positions;
                vd.indices = indices.length > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);
                vd.normals = normals;
                vd.uvs = uvs;
                vd.uvs4 = uvs4;
                const mesh = new BABYLON.Mesh(material.name, scene);
                vd.applyToMesh(mesh);
                mesh.material = material;
                mesh.setParent(node);
                combineMeshes.push(mesh);

                meshIndex++;
                positions = [];
                indices = [];
                normals = [];
                uvs = [];
                uvs4 = [];
            }

            vds.forEach(vd => {
                if (vd.positions!.length + positions.length > 10000000) toMesh();
                const indicesStart = positions.length / 3;
                positions.push(...vd.positions!);
                indices.push(...[...vd.indices!].map(index => index + indicesStart));
                normals.push(...vd.normals!);
                uvs.push(...vd.uvs!);
                uvs4.push(...vd.uvs4!);
            })
            toMesh();
        })
        asset.meshes = [...newMeshList, ...combineMeshes];

        meshNodeList.forEach(mesh => {
            mesh.dispose();
        })


        return newRoot;
    }
}