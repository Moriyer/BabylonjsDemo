import * as BABYLON from 'babylonjs';
import { DataTexture } from "./DataTexture";

export class MatrixDataTexture extends DataTexture {

    constructor(name: string, scene: BABYLON.Scene, count: number) {
        super(name, scene, count, 4, 4, false);

    }
    setMatrix(index: number, matrix: BABYLON.Matrix) {
        const m = matrix.m;
        this.setFullData(index, m as any);
    }
    getMatrix(index: number) {
        //将二维数组转换成一维数组
        const data = this.getFullData(index).flat();
        return data;
    }
    getShader(): string {
        let shader = super.getShader();
        shader += `
mat4 get${this.name}Matrix(float index){
    ${this.name}Data data = get${this.name}Data(index);
    return mat4(
        data.data0.x, data.data0.y, data.data0.z, data.data0.w,
        data.data1.x, data.data1.y, data.data1.z, data.data1.w,
        data.data2.x, data.data2.y, data.data2.z, data.data2.w,
        data.data3.x, data.data3.y, data.data3.z, data.data3.w
    );
} 
        `;
        return shader;
    }
    shaderMatrixStruct(name: string, index: string) {
        return `mat4 ${name} = get${this.name}Matrix(${index});`;
    }
}