
import * as BABYLON from 'babylonjs';

import { GLTF2Export } from 'babylonjs-serializers';
import { InspectorNode } from '../Node/InspectorNode';
import { SceneCombineHelper } from '../Utils/Compress/SceneCombine/Combine/SceneCombineHelper';
import { SceneCombineParse } from '../Utils/Compress/SceneCombine/Parse/SceneCombineParse';

export class Playground {
    public static CreateScene(engine: BABYLON.Engine, canvas: HTMLCanvasElement): BABYLON.Scene {
        // This creates a basic Babylon Scene object (non-mesh)
        const scene = new BABYLON.Scene(engine);

        // This creates and positions a free camera (non-mesh)
        const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI, 1, 10, BABYLON.Vector3.Zero(), scene);

        // This targets the camera to scene origin
        camera.setTarget(BABYLON.Vector3.Zero());

        // This attaches the camera to the canvas
        camera.attachControl(canvas, true);

        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        const light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
        light.groundColor.set(0.5, 0.5, 0.5);
        light.intensity = 0.5;
        const dir = new BABYLON.DirectionalLight("dir", new BABYLON.Vector3(1, 1, 1), scene);
        // Default intensity is 1. Let's dim the light a small amount
        dir.intensity = 0.5;

        const generateMode: number = 2;
        if (generateMode === 0) {
            const root = this.generateScene(scene);
            scene.debugLayer.select(root);
        }
        else if (generateMode === 1) {
            this.loadOriginScene(scene);
        }
        else {
            this.loadCombineScene(scene);
        }
        return scene;
    }

    static generateScene(scene: BABYLON.Scene) {
        const root = new InspectorNode("Root", scene);
        const size = Number(this.fileType);

        const createPBR = () => {
            const pbr = new BABYLON.PBRMaterial("pbr", scene);
            pbr.albedoColor.set(1, 1, 1);
            pbr.metallic = 1;
            pbr.roughness = 1;
            return pbr;
        }

        const defaultMaterial = createPBR();
        const material1 = createPBR();
        material1.albedoTexture = new BABYLON.Texture("resources/textures/Default_albedo.jpg", scene);
        material1.bumpTexture = new BABYLON.Texture("resources/textures/Default_normal.jpg", scene);
        material1.metadata = new BABYLON.Texture("resources/textures/Default_metalRoughness.jpg", scene);
        material1.emissiveTexture = new BABYLON.Texture("resources/textures/Default_emissive.jpg", scene);
        const material2 = createPBR();
        material2.opacityTexture = new BABYLON.Texture("resources/textures/opacity.jpg", scene);
        material2.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHATEST;
        const material3 = createPBR();
        material3.albedoTexture = new BABYLON.Texture("resources/textures/grass.jpg", scene);
        material3.bumpTexture = new BABYLON.Texture("resources/textures/normalMap.jpg", scene);
        const materials = [material1, material2, material3];
        const getMaterial = () => {
            const random = Math.random();
            const r2 = Math.random();
            if (random < 0.6) {
                if (r2 < 0.5) return defaultMaterial;
                const clone = defaultMaterial.clone("default");
                clone.albedoColor.set(Math.random(), Math.random(), Math.random());
                return clone;
            }
            const material = materials[Math.floor(Math.random() * materials.length)];
            if (r2 < 0.5) return material;
            const clone = material.clone(material.name);
            clone.albedoColor.set(Math.random(), Math.random(), Math.random());
            return clone;
        }

        for (let i = 0; i < size; i++) {
            const rootI = new BABYLON.TransformNode(`Root_${i}`, scene);
            rootI.setParent(root);
            for (let j = 0; j < size; j++) {
                const rootJ = new BABYLON.TransformNode(`Root_${i}_${j}`, scene);
                rootJ.setParent(rootI);
                for (let k = 0; k < size; k++) {
                    const rootK = new BABYLON.TransformNode(`Root_${i}_${j}_${k}`, scene);
                    rootK.setParent(rootJ);
                    let mesh: BABYLON.Mesh;
                    const random = Math.random();
                    if (random < 0.25) {
                        mesh = BABYLON.MeshBuilder.CreateBox(`box_${i}_${j}_${k}`, { size: 1 }, scene);
                    }
                    else if (random < 0.5) {
                        mesh = BABYLON.MeshBuilder.CreateSphere(`sphere_${i}_${j}_${k}`, { diameter: 1 }, scene);
                    }
                    else {
                        mesh = BABYLON.MeshBuilder.CreateCylinder(`cylinder_${i}_${j}_${k}`, { height: 1, diameter: 1 }, scene);
                    }
                    mesh.setParent(rootK);
                    mesh.position.set(i * 2, j * 2, k * 2);
                    mesh.material = getMaterial();
                }
            }
        }

        console.log(`总材质数量：${materials.length}`);
        root.addButton("导出", "export", () => {
            GLTF2Export.GLBAsync(scene, `scene${this.fileType}`, {
                exportUnusedUVs: true,
                removeNoopRootNodes: false,
                shouldExportNode(node) {
                    if (node === root) return true;
                    let parent = node.parent;
                    while (parent) {
                        if (parent === root) return true;
                        parent = parent.parent;
                    }
                    return false;
                },
            }).then(glb => {
                glb.downloadFiles();
            });
        })

        console.log(`python pyTools/SceneCombine/main.py -i public/resources/models/CombineTestScene/scene${this.fileType}.glb -o public/resources/models/CombineTestScene/scene${this.fileType}_2.glb`)
        return root;
    }
    static fileType = "10";
    static loadOriginScene(scene: BABYLON.Scene) {
        const ExportRoot = new InspectorNode("Export", scene);
        scene.debugLayer.select(ExportRoot);
        const metaKeys = [...SceneCombineHelper.metaKey];
        let root: BABYLON.TransformNode | null = null;
        ExportRoot.addButton("导出", "export", () => {
            GLTF2Export.GLBAsync(scene, `scene${this.fileType}_2`, {
                exportUnusedUVs: true,
                removeNoopRootNodes: false,
                shouldExportNode(node) {
                    if (node === root) return true;
                    let parent = node.parent;
                    while (parent) {
                        if (parent === root) return true;
                        parent = parent.parent;
                    }
                    return false;
                },
                metadataSelector(metadata) {
                    if (!metadata) return;
                    const newMeta = {} as any;
                    metaKeys.forEach(key => {
                        if (metadata[key] !== undefined) {
                            newMeta[key] = metadata[key];
                        }
                    })
                    return newMeta;
                },


            },).then(glb => {
                glb.downloadFiles();
            });
        })

        BABYLON.LoadAssetContainerAsync(`resources/models/CombineTestScene/scene${this.fileType}.glb`, scene, {
            pluginExtension: ".glb"
        }).then(asset => {
            root = asset.meshes[0];
            asset.addAllToScene();
            root = SceneCombineHelper.combine(asset);
        });
    }

    static loadCombineScene(scene: BABYLON.Scene) {
        console.time("下载");
        BABYLON.LoadAssetContainerAsync(`resources/models/CombineTestScene/scene${this.fileType}_2.glb`, scene, {
            pluginExtension: ".glb",
        }).then(asset => {
            console.timeEnd("下载");
            console.time("解析");
            asset.addAllToScene();
            const target = new SceneCombineParse(asset);
            console.timeEnd("解析");
            console.timeEnd("创建Engine");
        });
    }


}