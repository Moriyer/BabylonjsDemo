
import * as BABYLON from 'babylonjs';
import { InspectorNode } from '../Node/InspectorNode';
import { s_GetGradientNoiseValueDir2D } from '../Shader/Noise/GradientNoise';
import { s_GetFloatHash2D, s_GetIntHash2D, s_GetIntHash2DStatic } from '../Shader/Noise/Hash';
import { IShaderPart } from '../Shader/ShaderType';

export class Playground {
    static timeData: BABYLON.Vector4 = new BABYLON.Vector4();

    public static CreateScene(engine: BABYLON.Engine, canvas: HTMLCanvasElement): BABYLON.Scene {
        // This creates a basic Babylon Scene object (non-mesh)
        const scene = new BABYLON.Scene(engine);

        // This creates and positions a free camera (non-mesh)
        const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2, 50, BABYLON.Vector3.Zero(), scene);

        // This targets the camera to scene origin
        camera.setTarget(BABYLON.Vector3.Zero());

        // This attaches the camera to the canvas
        camera.attachControl(canvas, true);

        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        const light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);

        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 0.7;
        const timeData = Playground.timeData;
        timeData.w = 0;
        scene.onBeforeRenderObservable.add(() => {
            const dt = engine.getDeltaTime();
            timeData.w = dt;
            timeData.x += dt;
            timeData.y = timeData.x / 10;
            timeData.z = timeData.x / 100;
        })
        // // Our built-in 'sphere' shape. Params: name, options, scene
        // const sphere = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 2, segments: 32 }, scene);

        // // Move the sphere upward 1/2 its height
        // sphere.position.y = 1;

        // // Our built-in 'ground' shape. Params: name, options, scene
        // const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 6, height: 6 }, scene);
        const gradientNoise = this.createGradientNoise2DIntHash(scene, false);
        gradientNoise.position.set(-15, 5, 0);
         const gradientNoise2 = this.createGradientNoise2DFloatHash(scene, false);
        gradientNoise2.position.set(-15, -5, 0);
        return scene;
    }

    private static createGradientNoise2DIntHash(scene: BABYLON.Scene, isStatic: boolean = false) {
        const root = new InspectorNode("GradientNoise2DInt", scene);
        root.position = new BABYLON.Vector3(0, 0, 0);

        const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 4, height: 4 }, scene);
        ground.setParent(root);
        ground.rotateAround(BABYLON.Vector3.ZeroReadOnly, BABYLON.Vector3.RightReadOnly, -Math.PI / 2);
        let shader: string;
        let uniforms: string[];
        let applyToMaterial: ((material: BABYLON.ShaderMaterial) => void) | undefined = undefined;
        const options: IShaderPart = {
            uniforms: ["world", "viewProjection"],
            attributes: ["position"],
            samplers: []
        }
        if (isStatic) {
            shader = s_GetIntHash2DStatic(114, 514, 318, 787);
            uniforms = [];
        }
        else {
            const shaderPart = s_GetIntHash2D(options);
            shader = shaderPart.define!;
            applyToMaterial = shaderPart.applyToMaterial;
            shaderPart.applyToNode(root);
        }

        const material = new BABYLON.ShaderMaterial("gradientNoise", scene, {
            vertexSource: `
                precision highp float;
                attribute vec3 position;
                uniform mat4 world;
                uniform mat4 viewProjection;

                varying vec3 vPosition;
                void main(){
                    vPosition.xy = position.xz;
                    gl_Position = viewProjection *  world * vec4(position, 1.0);
                    vPosition.z = position.x;
                }
            `,
            fragmentSource: `
                precision highp float;
                varying vec3 vPosition;
                uniform vec4 timeData;
                ${shader}
                ${s_GetGradientNoiseValueDir2D}
                void main(){
                    vec3 noise = getGradientNoiseValueDir2D(vPosition.xy*5.);
                    gl_FragColor = vec4(mix(vec3(noise.x), vec3(noise.yz,1.), step(0.,vPosition.z)), 1.0);
                }
            `,
        }, {
            uniforms: options.uniforms,
            attributes: options.attributes,
        });
        material.setVector4("timeData", Playground.timeData);
        ground.material = material;
        if (applyToMaterial) {
            applyToMaterial(material);
        }
        return root;
    }

    private static createGradientNoise2DFloatHash(scene: BABYLON.Scene, isStatic: boolean = false) {
        const root = new InspectorNode("GradientNoise2DFloat", scene);
        root.position = new BABYLON.Vector3(0, 0, 0);

        const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 4, height: 4 }, scene);
        ground.setParent(root);
        ground.rotateAround(BABYLON.Vector3.ZeroReadOnly, BABYLON.Vector3.RightReadOnly, -Math.PI / 2);
        let shader: string;
        let uniforms: string[];
        let applyToMaterial: ((material: BABYLON.ShaderMaterial) => void) | undefined = undefined;
        const options: IShaderPart = {
            uniforms: ["world", "viewProjection"],
            attributes: ["position"],
            samplers: []
        }
        if (isStatic) {
            shader = "";
            uniforms = [];
        }
        else {
            const shaderPart = s_GetFloatHash2D(options);
            shader = shaderPart.define!;
            applyToMaterial = shaderPart.applyToMaterial;
            shaderPart.applyToNode(root);
        }

        const material = new BABYLON.ShaderMaterial("gradientNoise", scene, {
            vertexSource: `
                precision highp float;
                attribute vec3 position;
                uniform mat4 world;
                uniform mat4 viewProjection;

                varying vec3 vPosition;
                void main(){
                    vPosition.xy = position.xz;
                    gl_Position = viewProjection *  world * vec4(position, 1.0);
                    vPosition.z = position.x;
                }
            `,
            fragmentSource: `
                precision highp float;
                varying vec3 vPosition;
                uniform vec4 timeData;
                ${shader}
                ${s_GetGradientNoiseValueDir2D}
                void main(){
                    vec3 noise = getGradientNoiseValueDir2D(vPosition.xy*5.);
                    gl_FragColor = vec4(mix(vec3(noise.x), vec3(noise.yz,1.), step(0.,vPosition.z)), 1.0);
                }
            `,
        }, {
            uniforms: options.uniforms,
            attributes: options.attributes,
        });
        material.setVector4("timeData", Playground.timeData);
        ground.material = material;
        if (applyToMaterial) {
            applyToMaterial(material);
        }
        return root;
    }
}