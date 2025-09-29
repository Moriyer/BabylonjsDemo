import * as BABYLON from 'babylonjs';
import { DisposeObject } from '../DisposeObject';

export class DataTexture extends DisposeObject {
    scene: BABYLON.Scene;

    readonly name: string;


    private _dataCount: number;
    get dataCount(): number {
        return this._dataCount;
    }

    private _dataNumber: number;
    get dataNumber(): number {
        return this._dataNumber;
    }
    private _dataStrike: number;
    get dataStrike(): number {
        return this._dataStrike;
    }

    private _textureSize: number;
    get textureSize(): number {
        return this._textureSize;
    }
    private _texture: BABYLON.RawTexture;
    get texture() {
        return this._texture;
    }
    private _dataArray: Float16Array | Float32Array;

    private _isDirty: boolean = false;
    /**
     * 数据纹理
     * @param scene 场景
     * @param count 数据结构体数量
     * @param dataCount 数据结构体内有多少个数据
     * @param dataStrike 每个数据有几个值 3-4
     * @param half 
     */
    constructor(name: string, scene: BABYLON.Scene, dataCount: number, dataNumber: number, dataStrike: 3 | 4, half: boolean = false) {
        super();
        //half有问题暂不支持
        half = false;

        this.name = name;
        this.mapName = `${name}Map`;
        this.mapSizeName = `${name}MapSize`;
        this._dataStrike = dataStrike;
        this._dataCount = dataCount;
        this._dataNumber = dataNumber;
        this.scene = scene;
        const pixelCount = dataCount * dataNumber;
        this._textureSize = Math.ceil(Math.pow(pixelCount, 0.5));
        this.mapSizeValue.set(this._textureSize, this._textureSize, dataNumber);
        const totalPixelCount = this._textureSize * this._textureSize;
        const format = dataStrike === 3 ? BABYLON.Constants.TEXTUREFORMAT_RGB : BABYLON.Constants.TEXTUREFORMAT_RGBA;
        const textureType = half ? BABYLON.Constants.TEXTURETYPE_HALF_FLOAT : BABYLON.Constants.TEXTURETYPE_FLOAT;
        this._dataArray = half ? new Float16Array(totalPixelCount * dataStrike) : new Float32Array(totalPixelCount * dataStrike);
        this._texture = new BABYLON.RawTexture(this._dataArray, this._textureSize, this._textureSize, format,
            scene, false, false, BABYLON.Constants.TEXTURE_NEAREST_NEAREST, textureType, undefined);
        this._texture.name = `${this.name}Map`;
        const observer = scene.onBeforeRenderObservable.add(() => {
            this.update();
        });
        this.onDisposeObservable.add(() => {
            scene.onBeforeRenderObservable.remove(observer);
            this.texture.dispose();
            this._dataArray = undefined as any;
        })
    }

    getFullData(index: number): number[][] {
        const result: number[][] = [];
        const array = this._dataArray;
        const startIndex = index * this.dataNumber * this.dataStrike;
        for (let j = 0; j < this.dataNumber; j++) {
            const data: number[] = [];
            for (let i = 0; i < this.dataStrike; i++) {
                data.push(array[startIndex + j * this.dataStrike + i]);
            }
            result.push(data);
        }
        return result;
    }
    getData(index: number, dataIndex: number): number[] {
        if (dataIndex >= this._dataNumber) {
            console.log(`getData index:${index} dataIndex:${dataIndex} 超出范围`);
            return [];
        }
        const result: number[] = [];
        const array = this._dataArray;
        const startIndex = index * this.dataNumber * this.dataStrike + dataIndex * this.dataStrike;
        for (let i = 0; i < this.dataStrike; i++) {
            const index = startIndex + i;
            result.push(array[index]);
        }
        return result;
    }
    setFullData(index: number, data: number[]) {
        if (data.length !== this._dataNumber * this._dataStrike) {
            console.log(`setFullData index:${index} data长度错误`);
            return;
        }
        const array = this._dataArray;
        const copyLength = this.dataNumber * this.dataStrike;
        const startIndex = index * copyLength;
        for (let index = 0; index < copyLength; index++) {
            array[startIndex + index] = data[index];
        }
        this._isDirty = true;
    }
    setData(index: number, dataIndex: number, data: number[]) {
        if (data.length !== this._dataStrike) {
            console.log(`setData index:${index} dataIndex:${dataIndex} data长度错误`);
            return;
        }
        const array = this._dataArray;
        const startIndex = index * this.dataNumber * this.dataStrike + dataIndex * this.dataStrike;
        const copyLength = this._dataStrike;
        for (let index = 0; index < copyLength; index++) {
            array[startIndex + index] = data[index];
        }
        this._isDirty = true;
    }
    update() {
        if (!this._isDirty) return;
        this._isDirty = false;
        this._texture.update(this._dataArray);
    }

    //#region Shader相关

    readonly mapName: string;
    readonly mapSizeName: string;
    private mapSizeValue = new BABYLON.Vector3()
    getUniformNames() {
        return [
            this.mapSizeName,
        ]
    }
    getSamplerNames() {
        return [
            this.mapName,
        ]
    }
    applyToMaterial(material: BABYLON.ShaderMaterial) {
        material.setTexture(this.mapName, this.texture);
        material.setVector3(this.mapSizeName, this.mapSizeValue);
    }
    getShader() {
        const vec = this.dataStrike === 3 ? "vec3" : "vec4";
        const getStruct = () => {
            let str = "\r\n";
            for (let i = 0; i < this.dataNumber; i++) {
                str += `    ${vec} data${i};\r\n`;
            }
            return str;
        }
        const samplerValue = () => {
            let str = "\r\n";
            for (let i = 0; i < this.dataNumber; i++) {
                str += `    result.data${i} = sampler${this.name}(startIndex + ${i}.);\r\n`
            }
            return str;
        }
        return `
uniform sampler2D ${this.mapName};
uniform vec3 ${this.mapSizeName};

struct ${this.name}Data{
${getStruct()}
};

${vec} sampler${this.name}(float index){
    float res = ${this.mapSizeName}.x;
    float mRes = 1./res;
    float hmRes = mRes * 0.5;
    float x = mod(index,res)*mRes+hmRes;
    float y = floor(index / res)*mRes+hmRes;
    
    vec4 data4 = texture(${this.mapName},vec2(x,y));
    ${this.dataStrike === 3 ? "return data4.rgb;" : "return data4;"}            
}

${this.name}Data get${this.name}Data(float index){
    ${this.name}Data result;
    float startIndex = index * ${this.mapSizeName}.z;
${samplerValue()}
    return result;
}
        `
    }
    shaderStruct(name: string, index: string) {
        return `${this.name}Data ${name} = get${this.name}Data(${index});`;
    }
    //#endregion

}

