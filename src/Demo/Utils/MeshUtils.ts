import * as BABYLON from 'babylonjs';

export class MeshUtils {
    static splitMeshByMaterial(mesh: BABYLON.Mesh, defaultMaterial: BABYLON.Material) {
        const vd = BABYLON.VertexData.ExtractFromMesh(mesh);
        return MeshUtils.splitVertexDataByMaterial(vd, mesh.material, defaultMaterial);


    }
    static splitVertexDataByMaterial(vd: BABYLON.VertexData, meshMaterial: BABYLON.Nullable<BABYLON.Material>, defaultMaterial: BABYLON.Material) {
        const vds: {
            vertexData: BABYLON.VertexData,
            material: BABYLON.Material
        }[] = [];
        let getMaterial: (index: number) => BABYLON.Nullable<BABYLON.Material>;
        const material = meshMaterial;
        if (material && material.getClassName() === "MultiMaterial") {
            const multi = material as BABYLON.MultiMaterial;
            getMaterial = (index) => {
                index = Math.min(index, multi.subMaterials.length - 1);
                return multi.getSubMaterial(index);
            }
        }
        else {
            getMaterial = (index) => material;
        }
        const splitVds = vd.splitBasedOnMaterialID();
        splitVds.forEach((subVD, index) => {
            const subMaterial = getMaterial(index) || defaultMaterial;
            vds.push({
                vertexData: subVD,
                material: subMaterial
            });
        })
        return vds;
    }
}