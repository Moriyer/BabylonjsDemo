import * as BABYLON from 'babylonjs';
import { DisposeObject } from '../DisposeObject';
import { SceneCombineLoader } from './SceneCombineLoader';



export class SceneCombineGPUPicker extends DisposeObject {
    _engine: BABYLON.WebGPUEngine | BABYLON.Engine;
    scene: BABYLON.Scene;
    loader: SceneCombineLoader;
    textureScale: number = 2;
    private _pickingTexture: BABYLON.Nullable<BABYLON.RenderTargetTexture> = null;
    private _meshCombineRenderMaterial: BABYLON.Nullable<BABYLON.ShaderMaterial> = null as any;


    //todo
    private _instanceId: number = 1;
    constructor(meshCombine: SceneCombineLoader) {
        super();
        this.loader = meshCombine;
        this.scene = this.loader.scene!;
        this._engine = this.scene.getEngine() as any;



        this._createMeshCombineMaterial();
        this.onDisposeObservable.add(() => {
            if (this._pickingTexture) {
                this._pickingTexture.dispose();
            }
            if (this._meshCombineRenderMaterial) {
                this._meshCombineRenderMaterial.dispose();
            }
        })

    }

    private _combineMeshList: BABYLON.Mesh[] = [];
    private _meshRenderingCount: number = 0;

    setCombineMeshList(list: BABYLON.Mesh[]) {
        this._combineMeshList = [...list];
    }



    //#region Create
    private _createRenderTarget(scene: BABYLON.Scene, width: number, height: number) {
        if (this._pickingTexture) {
            this._pickingTexture.dispose();
        }
        this._pickingTexture = new BABYLON.RenderTargetTexture(
            "pickingTexure",
            { width: width, height: height },
            scene,
            false,
            undefined,
            BABYLON.Constants.TEXTURETYPE_FLOAT,
            false,
            BABYLON.Constants.TEXTURE_NEAREST_NEAREST, false
            , undefined, undefined, BABYLON.Constants.TEXTUREFORMAT_RGBA,
        );
    }

    private _createMeshCombineMaterial() {
        const scene = this.loader.scene;
        if (this._meshCombineRenderMaterial) {
            this._meshCombineRenderMaterial.dispose();
        }
        this._meshCombineRenderMaterial = null;

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

            ${this.loader.matrixTexture.getShader()}
            void main(){
                vec3 positionUpdated = position;
                pData = ivec2(uv4);
                int meshIndex = int(uv4.x);
                ${this.loader.matrixTexture.shaderMatrixStruct("meshMatrix", "uv4.x")}
                vWNormal = (meshMatrixInv * vec4(normal,0.)).xyz;
                vec4 wPosition = meshMatrix *  vec4(positionUpdated,1.);
                vWPosition = wPosition.xyz;
                gl_Position = viewProjection * wPosition;
            }
        
        `

        const fragment = `
            precision highp float;
            
            uniform float uMeshIndex;

            ${this.loader.meshColorTexture.getShader()}

            flat varying ivec2 pData;
            varying vec3 vWPosition;
            varying vec3 vWNormal;

            void main(){
                int meshIndex = pData.x;
                float fMeshIndex = float(meshIndex);
                int materialIndex = pData.y;
                 ${this.loader.meshColorTexture.shaderStruct("meshColorData", "fMeshIndex")};
                float visible = meshColorData.data1.x;
                if (visible < 0.5) discard;



                vec4 result = vec4(fMeshIndex,vWPosition);
                gl_FragColor = result;
            }   
        
        `

        this._meshCombineRenderMaterial = new BABYLON.ShaderMaterial("pickingShader", scene, {
            vertexSource: vertex,
            fragmentSource: fragment,
        }, {
            attributes: ["position", 'normal', 'uv4'],
            uniforms: ["world", "viewProjection",
                ...this.loader.matrixTexture.getUniformNames(),
                ...this.loader.meshColorTexture.getUniformNames(),
            ],
            samplers: [
                ...this.loader.matrixTexture.getSamplerNames(),
                ...this.loader.meshColorTexture.getSamplerNames(),
            ],
        }, false);
        this.loader.matrixTexture.applyToMaterial(this._meshCombineRenderMaterial);
        this.loader.meshColorTexture.applyToMaterial(this._meshCombineRenderMaterial);
        this._meshCombineRenderMaterial.onBindObservable.add(this._combineMeshMaterialBindCallback, undefined, undefined, this);
    }

    private _combineMeshMaterialBindCallback(absMesh: BABYLON.AbstractMesh | undefined) {
        this._meshRenderingCount++;
    }

    //#endregion

    //#region Pick
    private _pickingInProgress: boolean = false;
    public async pickAsync(x: number, y: number, disposeWhenDone = false) {
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
        // // Invert Y
        const invertedY = rttSizeH - adjustedY - 1;
        this._preparePickingBuffer(this._engine!, rttSizeW, rttSizeH, adjustedX, invertedY);
        return this._executePicking(adjustedX, invertedY, disposeWhenDone);
    }

    private _executePicking(x: number, y: number, disposeWhenDone: boolean) {
        return new Promise((resolve, reject) => {
            if (!this._pickingTexture) {
                this._pickingInProgress = false;
                reject();
                return;
            }

            this._pickingTexture!.onAfterRender = async () => {
                this._disableScissor();

                if (this._checkRenderStatus()) {
                    this._pickingTexture!.onAfterRender = null as any;

                    // Remove from the active RTTs
                    const index = this.scene.customRenderTargets.indexOf(this._pickingTexture!);
                    if (index > -1) {
                        this.scene.customRenderTargets.splice(index, 1);
                    }
                    let pickedMesh: BABYLON.Nullable<BABYLON.Mesh> = null;
                    // Do the actual picking
                    if (await this._readTexturePixelsAsync(x, y)) {
                        // this.scene.debugLayer.select(this._pickingTexture);
                        pickedMesh = null;
                        const buffer = this._readBuffer;
                        console.log(buffer);
                        // if (buffer[0] < 0) {
                        //     const meshIndex = -buffer[0] + 1;

                        // }
                        // if (buffer[0] > 0 && buffer[1] < this._instanceStart) {
                        //     pickedMesh = this._combineMeshId2MeshMap.get(buffer[0])!;
                        //     // this.scene.debugLayer.select(pickedMesh);
                        // }
                        // else {
                        //     //Todo
                        // }
                        // const colorId = this._getColorIdFromReadBuffer(0);
                        // // Thin?
                        // if (this._thinIdMap[colorId]) {
                        //     pickedMesh = this._pickableMeshes![this._thinIdMap[colorId].meshId];
                        //     thinInstanceIndex = this._thinIdMap[colorId].thinId;
                        // } else {
                        //     pickedMesh = this._pickableMeshes![this._idMap[colorId]];
                        // }
                    }

                    if (disposeWhenDone) {
                        this.dispose();
                    }

                    this._pickingInProgress = false;
                    if (pickedMesh) {
                        resolve({ mesh: pickedMesh });
                    } else {
                        resolve(null);
                    }
                }
            };
        });
    }

    private async _readTexturePixelsAsync(x: number, y: number, w = 1, h = 1) {
        if (!this.scene || !this._pickingTexture?._texture) {
            return false;
        }
        const engine = this.scene.getEngine();
        await engine._readTexturePixels(this._pickingTexture._texture, w, h, -1, 0, this._readBuffer, true, true, x, y);
        return true;
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

    private _prepareForPicking(x: number, y: number) {
        const scene = this.loader.scene!;
        const engine = scene.getEngine();
        const rttSizeW = engine.getRenderWidth() / this.textureScale;
        const rttSizeH = engine.getRenderHeight() / this.textureScale;
        const devicePixelRatio = 1 / engine._hardwareScalingLevel;

        const intX = (devicePixelRatio * x / this.textureScale) >> 0;
        const intY = (devicePixelRatio * y / this.textureScale) >> 0;

        return { x: intX, y: intY, rttSizeW, rttSizeH };
    }
    private _readBuffer = new Float32Array(4);
    private _preparePickingBuffer(engine: BABYLON.AbstractEngine, rttSizeW: number, rttSizeH: number, x: number, y: number, w = 1, h = 1) {
        this._meshRenderingCount = 0;

        // Do we need to rebuild the RTT?
        if (this._pickingTexture) {
            const size = this._pickingTexture!.getSize();
            if (size.width !== rttSizeW || size.height !== rttSizeH) {
                this._createRenderTarget(this.loader.scene, rttSizeW, rttSizeH);
                this._updateRenderList();
            }
        }
        else {
            this._createRenderTarget(this.loader.scene, rttSizeW, rttSizeH);
            this._updateRenderList();
        }

        this._pickingTexture!.clearColor = new BABYLON.Color4(0, 0, 0, 0);

        this._pickingTexture!.onBeforeRender = () => {
            this._enableScissor(x, y, w, h);
        };

        this.scene.customRenderTargets.push(this._pickingTexture!);
    }
    private _updateRenderList() {
        this._pickingTexture!.renderList = [];
        for (const mesh of this._combineMeshList!) {
            this._pickingTexture!.setMaterialForRendering(mesh, this._meshCombineRenderMaterial!);
            this._pickingTexture!.renderList.push(mesh);
        }
    }

    private _enableScissor(x: number, y: number, w = 1, h = 1) {
        if ((this._engine as BABYLON.WebGPUEngine | BABYLON.Engine).enableScissor) {
            (this._engine as BABYLON.WebGPUEngine | BABYLON.Engine).enableScissor(x, y, w, h);
        }
    }
    private _disableScissor() {
        if ((this._engine as BABYLON.WebGPUEngine | BABYLON.Engine).disableScissor) {
            (this._engine as BABYLON.WebGPUEngine | BABYLON.Engine).disableScissor();
        }
    }

    //#endregion
}