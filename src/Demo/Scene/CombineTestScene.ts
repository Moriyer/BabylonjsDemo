
import * as BABYLON from 'babylonjs';

import { GLTF2Export } from 'babylonjs-serializers';
import { InspectorNode } from '../Node/InspectorNode';
import { SceneCombineUtils } from '../Utils/Compress/SceneCombine';
import { SceneCombineLoader } from '../Utils/Compress/SceneCombineLoader';

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

        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 0.7;

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
                }
            }
        }
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
        return root;
    }
    static fileType = "10";
    static loadOriginScene(scene: BABYLON.Scene) {
        const ExportRoot = new InspectorNode("Export", scene);
        scene.debugLayer.select(ExportRoot);
        const metaKeys = [...SceneCombineUtils.metaKey];
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
            SceneCombineUtils.combine(asset);
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
            const target = new SceneCombineLoader(asset);
            console.timeEnd("解析");
            console.timeEnd("创建Engine");
        });
    }


}