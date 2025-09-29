import * as BABYLON from 'babylonjs';
import { DataTexture } from "./DataTexture";

export class MatrixAndInvTexture extends DataTexture {

    constructor(name: string, scene: BABYLON.Scene, count: number) {
        super(name, scene, count, 8, 4, false);

    }
    setMatrix(index: number, matrix: BABYLON.Matrix) {
        const tempMatrix = BABYLON.TmpVectors.Matrix[0].copyFrom(matrix);
        tempMatrix.invert();
        BABYLON.Matrix.TransposeToRef(tempMatrix, tempMatrix);
        this.setFullData(index, [...matrix.m, ...tempMatrix.m]);
    }
    // getMatrix(index: number) {
    //     //将二维数组转换成一维数组
    //     const data = this.getFullData(index).flat();
    //     return data;
    // }
    //     getShader(): string {
    //         let shader = super.getShader();
    //         shader += `
    // mat4 get${this.name}Matrix(float index){
    //     ${this.name}Data data = get${this.name}Data(index);
    //     return mat4(
    //         data.data0.x, data.data0.y, data.data0.z, data.data0.w,
    //         data.data1.x, data.data1.y, data.data1.z, data.data1.w,
    //         data.data2.x, data.data2.y, data.data2.z, data.data2.w,
    //         data.data3.x, data.data3.y, data.data3.z, data.data3.w
    //     );
    // } 
    // mat4 get${this.name}InvMatrix(float index){
    //     ${this.name}Data data = get${this.name}Data(index);
    //     return mat4(
    //         data.data4.x, data.data4.y, data.data4.z, data.data4.w,
    //         data.data5.x, data.data5.y, data.data5.z, data.data5.w,
    //         data.data6.x, data.data6.y, data.data6.z, data.data6.w,
    //         data.data7.x, data.data7.y, data.data7.z, data.data7.w
    //     );
    // } 
    //         `;
    //         return shader;
    //     }
    shaderMatrixStruct(name: string, index: string) {
        return `
        ${this.name}Data ${name}Data = get${this.name}Data(${index});
        mat4 ${name} = mat4(
             ${name}Data.data0.x,  ${name}Data.data0.y,  ${name}Data.data0.z,  ${name}Data.data0.w,
             ${name}Data.data1.x,  ${name}Data.data1.y,  ${name}Data.data1.z,  ${name}Data.data1.w,
             ${name}Data.data2.x,  ${name}Data.data2.y,  ${name}Data.data2.z,  ${name}Data.data2.w,
             ${name}Data.data3.x,  ${name}Data.data3.y,  ${name}Data.data3.z,  ${name}Data.data3.w
        );
        mat4 ${name}Inv = mat4(
             ${name}Data.data4.x,  ${name}Data.data4.y,  ${name}Data.data4.z,  ${name}Data.data4.w,
             ${name}Data.data5.x,  ${name}Data.data5.y,  ${name}Data.data5.z,  ${name}Data.data5.w,
             ${name}Data.data6.x,  ${name}Data.data6.y,  ${name}Data.data6.z,  ${name}Data.data6.w,
             ${name}Data.data7.x,  ${name}Data.data7.y,  ${name}Data.data7.z,  ${name}Data.data7.w
        );
        `
    }

}