import { InspectorNode } from '@/Demo/Node/InspectorNode';
import * as BABYLON from 'babylonjs';
import { IShaderPart, IShaderPartResult } from '../ShaderType';

/**
 * 来源于https://www.shadertoy.com/view/XdXBRH
 */

interface IHashShaderPartResult extends IShaderPartResult {
    getStaticCode():string;
}

export function s_GetIntHash2D(options:IShaderPart): IHashShaderPartResult {
    const shader = `
        #define USE_INT_HASH;
        uniform vec2 hashSeed2D1;
        uniform vec2 hashSeed2D2;
        vec2 hash( in ivec2 p )  // this hash is not production ready, please
        {                        // replace this by something better

            // 2D -> 1D
            ivec2 ihashSeed2D1 = ivec2(floor(hashSeed2D1));
            ivec2 ihashSeed2D2 = ivec2(floor(hashSeed2D2));
            ivec2 n = p.x*ihashSeed2D1 + p.y*ihashSeed2D2;

            // 1D hash by Hugo Elias
            n = (n << 13) ^ n;
            n = n * (n * n * 15731 + 789221) + 1376312589;
            return -1.0+2.0*vec2( n & ivec2(0x0fffffff))/float(0x0fffffff);
        }
    `;
    const uniforms: string[] = [
        "hashSeed2D1",
        "hashSeed2D2"
    ];
    const hash1 = new BABYLON.Vector2(114, 514);
    const hash2 = new BABYLON.Vector2(318, 787);
    options.uniforms.concat(uniforms);
    return {
        define:shader,
        applyToNode(node: InspectorNode) {
            node.addRef("HashSeed1","HashSeed1",hash1);
            node.addRef("HashSeed2","HashSeed2",hash2);
            node.addButton("获取","GetHashFunc",()=>{
                console.log(this.getStaticCode());
            })
            },
        applyToMaterial(material: BABYLON.ShaderMaterial) {
            material.setVector2("hashSeed2D1", hash1);
            material.setVector2("hashSeed2D2", hash2);
        },
        getStaticCode():string {
            return `s_GetIntHash2DStatic(${hash1.x},${hash1.y},${hash2.x},${hash2.y})`;
        },
    };
}
export function s_GetIntHash2DStatic(hash1x:number,hash1y:number,hash2x:number,hash2y:number):string {
    return `
        vec2 hash( in ivec2 p )  // this hash is not production ready, please
        {                        // replace this by something better

            // 2D -> 1D
            ivec2 n = p.x*ivec2(${Math.floor(hash1x)},${Math.floor(hash1y)}) + p.y*ivec2(${Math.floor(hash2x)},${Math.floor(hash2y)});
            // 1D hash by Hugo Elias
            n = (n << 13) ^ n;
            n = n * (n * n * 15731 + 789221) + 1376312589;
            return -1.0+2.0*vec2( n & ivec2(0x0fffffff))/float(0x0fffffff);
        }
    ` 
}

export function s_GetFloatHash2D(options:IShaderPart): IHashShaderPartResult {
    const shader = `
        uniform vec2 hashSeed2D1;
        vec2 hash( in vec2 x )   // this hash is not production ready, please
        {                        // replace this by something better
            vec2 k = hashSeed2D1;
            x = x*k + k.yx;
            return -1.0 + 2.0*fract( 16.0 * k*fract( x.x*x.y*(x.x+x.y)) );
        }
    `;
    const uniforms: string[] = [
        "hashSeed2D1",
    ];
    const hash1 = new BABYLON.Vector2(0.3183099, 0.3678794 );
    options.uniforms.concat(uniforms);
    return {
        define:shader,
        applyToNode(node: InspectorNode) {
            node.addRef("HashSeed1","HashSeed1",hash1);
            node.addButton("获取","GetHashFunc",()=>{
                console.log(this.getStaticCode());
            })
            },
        applyToMaterial(material: BABYLON.ShaderMaterial) {
            material.setVector2("hashSeed2D1", hash1);
        },
        getStaticCode():string {
            return `s_GetIntHash2DStatic(${hash1.x},${hash1.y})`;
        },
    };
}

export function s_GetFloatHash2DStatic(hash1x:number,hash1y:number):string {
    return `
        vec2 hash( in vec2 x )   // this hash is not production ready, please
        {                        // replace this by something better
            const vec2 k = vec2(${hash1x},${hash1y});
            x = x*k + k.yx;
            return -1.0 + 2.0*fract( 16.0 * k*fract( x.x*x.y*(x.x+x.y)) );
        }
    ` 
}


// export function s_GetHash3DMethod1() {
//     return `
//         uniform ivec3 hashSeed3D1;
//         uniform ivec3 hashSeed3D2;
//         uniform ivec3 hashSeed3D3;
//         vec3 hash( in ivec3 p )  // this hash is not production ready, please
//         {                        // replace this by something better
//             // 2D -> 1D
//             ivec3 n = p.x*hashSeed2D1 + p.y*hashSeed2D2 + ;

//             // 1D hash by Hugo Elias
//             n = (n << 13) ^ n;
//             n = n * (n * n * 15731 + 789221) + 1376312589;
//             return -1.0+2.0*vec2( n & ivec2(0x0fffffff))/float(0x0fffffff);
//         }
    
//     `;
// }
