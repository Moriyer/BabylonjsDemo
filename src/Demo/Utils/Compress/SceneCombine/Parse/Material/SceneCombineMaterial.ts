import { DisposeObject } from "@/Demo/Utils/DisposeObject";
import * as BABYLON from 'babylonjs';
import { SceneCombineMaterialManager } from "./SceneCombineMaterialManager";
import { SceneCombinePBRMaterial } from "./SceneCombinePBRMaterial";

export class SceneCombineMaterial extends DisposeObject {
    manager: SceneCombineMaterialManager;
    node: BABYLON.TransformNode;
    meshes: BABYLON.Mesh[];
    material: BABYLON.PBRMaterial = null as any;
    shaderMaterial: BABYLON.ShaderMaterial = null as any;

    vSpecularColor: BABYLON.Color4 = new BABYLON.Color4(1.0, 1.0, 1.0, 0.5);
    vRefractionInfos: BABYLON.Color4 = new BABYLON.Color4(0.0, 0.0, 0.0, 0.0);

    vLightDiffuse: BABYLON.Color4 = new BABYLON.Color4(1.0, 1.0, 1.0, 1.0);
    vLightSpecular: BABYLON.Color4 = new BABYLON.Color4(1.0, 1.0, 1.0, 1.0);
    vLightData: BABYLON.Vector4 = new BABYLON.Vector4(0.0, 0.0, 0.0, 0.0);

    vHemisLightData: BABYLON.Vector4 = new BABYLON.Vector4(1.0, 1.0, 1.0, 1.0);
    vHemisLightDiffuse: BABYLON.Color3 = new BABYLON.Color3(1.0, 1.0, 1.0);
    vHemisLightSpecular: BABYLON.Color3 = new BABYLON.Color3(1.0, 1.0, 1.0);
    vHemisLightGroundColor: BABYLON.Color3 = new BABYLON.Color3(1.0, 1.0, 1.0);

    needUpdateLight = true;
    constructor(manager: SceneCombineMaterialManager, node: BABYLON.TransformNode) {
        super();
        this.manager = manager;
        this.node = node;

        this.meshes = this.node.getChildMeshes();
        if (this.meshes.length === 0) return;
        this.material = this.meshes[0].material as BABYLON.PBRMaterial;
        const scene = node.getScene();

        this.shaderMaterial = SceneCombinePBRMaterial.createCustomPBRMaterial(this.manager, this.material);

        this.shaderMaterial.setColor4("vSpecularColor", this.vSpecularColor);
        this.shaderMaterial.setColor4("vRefractionInfos", this.vRefractionInfos);
        this.shaderMaterial.setColor4("vLightDiffuse", this.vLightDiffuse);
        this.shaderMaterial.setColor4("vLightSpecular", this.vLightSpecular);
        this.shaderMaterial.setVector4("vLightData", this.vLightData);

        this.shaderMaterial.setVector4("vHemisLightData", this.vHemisLightData);
        this.shaderMaterial.setColor3("vHemisLightDiffuse", this.vHemisLightDiffuse);
        this.shaderMaterial.setColor3("vHemisLightSpecular", this.vHemisLightSpecular);
        this.shaderMaterial.setColor3("vHemisLightGroundColor", this.vHemisLightGroundColor);

        const vEyePosition = new BABYLON.Vector3();
        this.shaderMaterial.setVector3("vEyePosition", vEyePosition);
        this.shaderMaterial.onBindObservable.add((mesh) => {
            if (scene.activeCamera) {
                vEyePosition.copyFrom(scene.activeCamera.globalPosition);
            }
            else {
                vEyePosition.setAll(0);
            }
        })
        this.meshes.forEach(mesh => {
            mesh.material = this.shaderMaterial;
            mesh.alwaysSelectAsActiveMesh = true;
        })
        const observer = scene.onBeforeRenderObservable.add(() => {
            // if (!this.needUpdateLight) return;
            this.needUpdateLight = false;
            this.vLightData.setAll(0);
            this.vLightSpecular.setAll(0);
            this.vLightDiffuse.setAll(0);
            this.vHemisLightDiffuse.setAll(0);
            this.vHemisLightSpecular.setAll(0);
            this.vHemisLightGroundColor.setAll(0);
            this.vHemisLightData.setAll(0);

            for (let index = 0; index < scene.lights.length; index++) {
                const light = scene.lights[index];
                if (light.getClassName() === "DirectionalLight") {
                    const dir = light as BABYLON.DirectionalLight;
                    this.vLightSpecular.set(dir.specular.r, dir.specular.g, dir.specular.b, 1);
                    this.vLightDiffuse.set(dir.diffuse.r * dir.intensity, dir.diffuse.g * dir.intensity, dir.diffuse.b * dir.intensity, dir.range);
                    this.vLightData.set(dir.direction.x, dir.direction.y, dir.direction.z, 1);
                }
                else if (light.getClassName() === "HemisphericLight") {
                    const hemis = light as BABYLON.HemisphericLight;
                    this.vHemisLightDiffuse.set(hemis.diffuse.r * hemis.intensity, hemis.diffuse.g * hemis.intensity, hemis.diffuse.b * hemis.intensity);
                    this.vHemisLightGroundColor.set(hemis.groundColor.r * hemis.intensity, hemis.groundColor.g * hemis.intensity, hemis.groundColor.b * hemis.intensity);
                    this.vHemisLightSpecular.set(hemis.specular.r, hemis.specular.g, hemis.specular.b);
                    this.vHemisLightData.set(hemis.direction.x, hemis.direction.y, hemis.direction.z, 0);
                }
            }

        })

        this.onDisposeObservable.add(() => {
            scene.onBeforeRenderObservable.remove(observer);
        });
    }
}