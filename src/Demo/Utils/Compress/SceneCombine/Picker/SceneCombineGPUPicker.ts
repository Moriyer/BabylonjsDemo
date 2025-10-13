import { DisposeObject } from '@/Demo/Utils/DisposeObject';
import * as BABYLON from 'babylonjs';
import { SceneCombineParse } from '../Parse/SceneCombineParse';
interface ISceneCombineGPUPickerResult {
    position: { x: number, y: number, z: number };
    normal: { x: number, y: number, z: number };
    meshIndex: number;
    meshNode: BABYLON.TransformNode | null;
}
export class SceneCombineGPUPicker extends DisposeObject {
    engine: BABYLON.Engine;
    textureScale: number = 1;
    scene: BABYLON.Scene;
    parse: SceneCombineParse;

    private _pickingTexture: BABYLON.Nullable<BABYLON.MultiRenderTarget> = null;
    constructor(parse: SceneCombineParse) {
        super();
        this.scene = parse.scene;
        this.parse = parse;
        this.engine = this.scene.getEngine() as any;
        this._createMeshCombineMaterial();
        this.onDisposeObservable.add(() => {
            this._pickingTexture?.dispose();
            this._meshCombineRenderMaterial?.dispose();
        })
    }

    //#region Pick
    private _pickingInProgress: boolean = false;
    public async pickAsync(x: number, y: number, disposeWhenDone = false): Promise<ISceneCombineGPUPickerResult | null> {
        if (this._pickingInProgress) {
            return null;
        }
        if (this._combineMeshList.length === 0) {
            return null;
        }
        const { x: adjustedX, y: adjustedY, rttSizeW, rttSizeH } = this._prepareForPicking(x, y);
        if (adjustedX < 0 || adjustedY < 0 || adjustedX >= rttSizeW || adjustedY >= rttSizeH) {
            return null;
        }

        this._pickingInProgress = true;

        const invertedY = rttSizeH - adjustedY - 1;
        this._preparePickingBuffer(this.engine!, rttSizeW, rttSizeH, adjustedX, invertedY);
        return this._executePicking(adjustedX, invertedY, disposeWhenDone);
    }

    private _executePicking(x: number, y: number, disposeWhenDone: boolean): Promise<ISceneCombineGPUPickerResult | null> {
        return new Promise((resolve, reject) => {
            if (!this._pickingTexture) {
                this._pickingInProgress = false;
                reject();
                return;
            }
            this._pickingTexture!.onAfterRender = async () => {
                this._disableScissor();
                if (this._checkRenderStatus()) {
                    // const index = this.scene.customRenderTargets.indexOf(this._pickingTexture!);
                    // if (index > -1) {
                    //     this.scene.customRenderTargets.splice(index, 1);
                    // }
                    this._pickingTexture!.onAfterRender = null as any;
                    if (await this._readTexturePixelsAsync(x, y)) {
                        const position = {
                            x: this.worldBuffer[0],
                            y: this.worldBuffer[1],
                            z: this.worldBuffer[2],
                        };
                        const meshIndex = this.worldBuffer[3];
                        const normal = {
                            x: this.normalBuffer[0],
                            y: this.normalBuffer[1],
                            z: this.normalBuffer[2],
                        }
                        const meshNode = this.parse.meshIndexToMeshNodeMap.get(meshIndex) || null;
                        this._pickingInProgress = false;
                        resolve({
                            position,
                            normal,
                            meshIndex,
                            meshNode,
                        });
                    }
                    else {
                        this._pickingInProgress = false;
                        resolve(null);
                    }
                    resolve(null);
                }
            };
        });
    }

    private _checkRenderStatus(): boolean {
        const wasSuccessfull = this._meshRenderingCount > 0;
        if (wasSuccessfull) {
            // Remove from the active RTTs
            const index = this.scene.customRenderTargets.indexOf(this._pickingTexture!);
            if (index > -1) {
                this.scene.customRenderTargets.splice(index, 1);
            }
            return true;
        }

        this._meshRenderingCount = 0;
        return false; // Wait for shaders to be ready
    }
    private worldBuffer = new Float32Array(4);
    private normalBuffer = new Float32Array(4);
    private async _readTexturePixelsAsync(x: number, y: number, w = 1, h = 1) {
        if (!this.scene || !this._pickingTexture) {
            return false;
        }
        const engine = this.scene.getEngine();
        await engine._readTexturePixels(this._pickingTexture!.textures[0].getInternalTexture()!, w, h, -1, 0, this.worldBuffer, true, true, x, y);
        await engine._readTexturePixels(this._pickingTexture!.textures[1].getInternalTexture()!, w, h, -1, 0, this.normalBuffer, true, true, x, y);
        return true;
    }

    //#endregion

    //#region Material
    private _combineMeshList: BABYLON.Mesh[] = [];

    setCombineMeshList(list: BABYLON.Mesh[]) {
        this._combineMeshList = [...list];
    }
    private _meshCombineRenderMaterial: BABYLON.Nullable<BABYLON.ShaderMaterial> = null as any;

    private _createMeshCombineMaterial() {
        const scene = this.parse.scene;
        if (this._meshCombineRenderMaterial) return this._meshCombineRenderMaterial;
        const texture = this.parse.material.texture;
        const vertex = `
            precision highp float;
            attribute vec3 position;
            attribute vec2 uv4;
            attribute vec3 normal;

            uniform mat4 world;
            uniform mat4 viewProjection;

            flat varying ivec2 pData;
            varying vec3 vWPosition;
            varying vec3 vWNormal;

            ${texture.matrixTexture.getShader()}
            void main(){
                vec3 positionUpdated = position;
                pData = ivec2(uv4);
                int meshIndex = int(uv4.x);
                ${texture.matrixTexture.shaderMatrixStruct("meshMatrix", "uv4.x")}
                vWNormal = (meshMatrixInv * vec4(normal,0.)).xyz;
                vec4 wPosition = meshMatrix * vec4(positionUpdated,1.);
                vWPosition = wPosition.xyz;
                gl_Position = viewProjection * wPosition;
            }
        
        `
        const fragment = `
            precision highp float;
            
            uniform float uMeshIndex;

            ${texture.meshDataTexture.getShader()}

            flat varying ivec2 pData;
            varying vec3 vWPosition;
            varying vec3 vWNormal;

            layout(location = 0)  out highp vec4 glFragData[${this.multiRTTCount}];

            void main(){
                int meshIndex = pData.x;
                float fMeshIndex = float(meshIndex);
                // int materialIndex = pData.y;
                //  ${texture.meshDataTexture.shaderStruct("meshColorData", "fMeshIndex")};
                // float visible = meshColorData.data1.x;
                // if (visible < 0.5) discard;

                // vec4 result = vec4(fMeshIndex,vWPosition);
                glFragData[0] = vec4(vWPosition,fMeshIndex);
                glFragData[1] = vec4(normalize(vWNormal),1.);
            }   
        
        `

        this._meshCombineRenderMaterial = new BABYLON.ShaderMaterial("pickingShader", scene, {
            vertexSource: vertex,
            fragmentSource: fragment,
        }, {
            attributes: ["position", 'normal', "uv", 'uv4'],
            uniforms: ["world", "viewProjection",
                ...texture.matrixTexture.getUniformNames(),
                ...texture.meshDataTexture.getUniformNames(),
            ],
            samplers: [
                ...texture.matrixTexture.getSamplerNames(),
                ...texture.meshDataTexture.getSamplerNames(),
            ],
        }, false);
        texture.matrixTexture.applyToMaterial(this._meshCombineRenderMaterial);
        texture.meshDataTexture.applyToMaterial(this._meshCombineRenderMaterial);
        this._meshCombineRenderMaterial.onBindObservable.add(this._combineMeshMaterialBindCallback, undefined, undefined, this);
    }

    private _combineMeshMaterialBindCallback(absMesh: BABYLON.AbstractMesh | undefined) {
        this._meshRenderingCount++;
    }
    //#endregion

    //#region Buffer

    private _meshRenderingCount: number = 0;
    private _preparePickingBuffer(engine: BABYLON.AbstractEngine, rttSizeW: number, rttSizeH: number, x: number, y: number, w = 1, h = 1) {
        this._meshRenderingCount = 0;

        const rtt = this._createPickingTexture(rttSizeW, rttSizeH);
        this._updateRenderList();

        // this._pickingTexture!.clearColor = new BABYLON.Color4(0, 0, 0, 0);

        this._pickingTexture!.onBeforeRender = () => {
            this._enableScissor(x, y, w, h);
        };

        this.scene.customRenderTargets.push(this._pickingTexture!);
    }

    private _prepareForPicking(x: number, y: number) {
        const scene = this.parse.scene!;
        const engine = scene.getEngine();
        const rttSizeW = engine.getRenderWidth() / this.textureScale;
        const rttSizeH = engine.getRenderHeight() / this.textureScale;
        const devicePixelRatio = 1 / engine._hardwareScalingLevel;

        const intX = (devicePixelRatio * x / this.textureScale) >> 0;
        const intY = (devicePixelRatio * y / this.textureScale) >> 0;

        return { x: intX, y: intY, rttSizeW, rttSizeH };
    }
    private multiRTTCount = 2;
    private _createPickingTexture(width: number, height: number) {

        if (this._pickingTexture) {
            if (this._pickingTexture.getRenderWidth() === width && this._pickingTexture.getRenderHeight() === height) {
                return this._pickingTexture;
            }
            this._pickingTexture.dispose();
            this._pickingTexture = null;
        }
        const count = this.multiRTTCount;
        const options: BABYLON.IMultiRenderTargetOptions = {
            generateMipMaps: false,
            types: new Array(count).fill(BABYLON.Constants.TEXTURETYPE_FLOAT),
            samplingModes: new Array(count).fill(BABYLON.Constants.TEXTURE_NEAREST_NEAREST),
            formats: new Array(count).fill(BABYLON.Constants.TEXTUREFORMAT_RGBA),
            targetTypes: new Array(count).fill(BABYLON.Constants.TEXTURE_2D),
        };
        this._pickingTexture = new BABYLON.MultiRenderTarget("pickingTexture", { width, height }, count, this.scene, options);
        return this._pickingTexture;
    }

    private _updateRenderList() {
        this._pickingTexture!.renderList = [];
        for (const mesh of this._combineMeshList!) {
            this._pickingTexture!.setMaterialForRendering(mesh, this._meshCombineRenderMaterial!);
            this._pickingTexture!.renderList.push(mesh);
        }
    }

    private _enableScissor(x: number, y: number, w = 1, h = 1) {
        if ((this.engine as BABYLON.WebGPUEngine | BABYLON.Engine).enableScissor) {
            (this.engine as BABYLON.WebGPUEngine | BABYLON.Engine).enableScissor(x, y, w, h);
        }
    }
    private _disableScissor() {
        if ((this.engine as BABYLON.WebGPUEngine | BABYLON.Engine).disableScissor) {
            (this.engine as BABYLON.WebGPUEngine | BABYLON.Engine).disableScissor();
        }
    }

    //#endregion



}