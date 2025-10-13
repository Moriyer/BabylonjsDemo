import { DataTexture } from '@/Demo/Utils/Texture/DataTexture';
import { MatrixAndInvTexture } from '@/Demo/Utils/Texture/MatrixAndInvTexture';
import * as BABYLON from 'babylonjs';
import { SceneCombineMaterialManager } from "./SceneCombineMaterialManager";
interface IDataTexture {
    matrix: MatrixAndInvTexture;
    meshData: DataTexture;
    materialData: DataTexture;
}
export class SceneCombinePBRMaterial {
    static createCustomPBRMaterial(material: SceneCombineMaterialManager, pbr: BABYLON.PBRMaterial) {
        const textures: IDataTexture = {
            matrix: material.texture.matrixTexture,
            meshData: material.texture.meshDataTexture,
            materialData: material.texture.materialDataTexture,
        };
        const shaderMaterial = new BABYLON.ShaderMaterial("meshMerge_Material", pbr.getScene(), {
            vertexSource: SceneCombinePBRMaterial.getVertexShader(textures),
            fragmentSource: SceneCombinePBRMaterial.getFragmentShader(textures, pbr),
        }, {
            attributes: ["position", 'normal', 'uv', 'uv4'],
            uniforms: ["world", "viewProjection", "vEyePosition",
                ...textures.matrix.getUniformNames(),
                ...textures.meshData.getUniformNames(),
                ...textures.materialData.getUniformNames(),
                "vSpecularColor",
                "vLightDiffuse", "vLightSpecular", "vLightData",
                "vHemisLightData", "vHemisLightDiffuse", "vHemisLightSpecular", "vHemisLightGroundColor",
            ],
            samplers: [
                ...textures.matrix.getSamplerNames(),
                ...textures.meshData.getSamplerNames(),
                ...textures.materialData.getSamplerNames(),
                "albedoSampler", "bumpSampler", "emissiveSampler",
                "ambientSampler", "metallicSampler", "opacitySampler",
            ],
        });

        textures.matrix.applyToMaterial(shaderMaterial);
        textures.meshData.applyToMaterial(shaderMaterial);
        textures.materialData.applyToMaterial(shaderMaterial);

        shaderMaterial.transparencyMode = pbr.transparencyMode;


        if (pbr.albedoTexture) {
            shaderMaterial.setTexture("albedoSampler", pbr.albedoTexture);
        }
        if (pbr.bumpTexture) {
            shaderMaterial.setTexture("bumpSampler", pbr.bumpTexture);
        }
        if (pbr.emissiveTexture) {
            shaderMaterial.setTexture("emissiveSampler", pbr.emissiveTexture);
        }
        if (pbr.ambientTexture) {
            shaderMaterial.setTexture("ambientSampler", pbr.ambientTexture);
        }
        if (pbr.opacityTexture) {
            shaderMaterial.setTexture("opacitySampler", pbr.opacityTexture);
        }
        if (pbr.metallicTexture) {
            shaderMaterial.setTexture("metallicSampler", pbr.metallicTexture);
        }
        return shaderMaterial;
    }

    private static getVertexShader(textures: IDataTexture) {
        const vertex = `
            precision highp float;
            attribute vec3 position;
            attribute vec2 uv;
            attribute vec2 uv4;
            attribute vec3 normal;

            uniform mat4 world;
            uniform mat4 viewProjection;

            flat varying ivec2 pData;
            varying vec2 vUV;
            varying vec3 vPositionW;
            varying vec3 vNormalW;

            ${textures.matrix.getShader()}
            flat varying vec4 vDebugger;

#include<clipPlaneVertexDeclaration>


            void main(){
                vec3 positionUpdated = position;
                vec3 normalUpdated = normal;

                pData = ivec2(uv4);
                int meshIndex = int(uv4.x);
                ${textures.matrix.shaderMatrixStruct("meshMatrix", "uv4.x")}
                vNormalW = (meshMatrixInv * vec4(normal,0.)).xyz;
                vUV = uv;
                vec4 positionW = meshMatrix *  vec4(positionUpdated,1.);
                vPositionW = positionW.xyz;
                gl_Position = viewProjection * positionW;

#include<clipPlaneVertex>

            }

        `;
        return vertex;
    }

    private static getFragmentShader(textures: IDataTexture, pbr: BABYLON.PBRMaterial) {
        const meshData = `

            struct MeshInfo{
                vec3 color;
                float visible;
            };
            
            MeshInfo getMeshInfo(float meshIndex){
                ${textures.meshData.shaderStruct("meshData", "meshIndex")};
                MeshInfo res;
                res.color = meshData.data0;
                res.visible = meshData.data1.x;
                return res;
            }
        `

        const materialData = `
           struct MaterialInfo{
                vec3 albedo;
                vec3 emissive;
                vec3 ambient;
                float alpha;
                float alphaCutoff;
                float metallic;
                float roughness;
                float emissiveIntensity;
            };

            MaterialInfo getMaterialInfo(float materialIndex){
                ${textures.materialData.shaderStruct("materialData", "materialIndex")};
                MaterialInfo res;
                res.alpha = materialData.data0.r;
                res.alphaCutoff = materialData.data0.g;
                
                res.metallic = materialData.data1.r;
                res.roughness = materialData.data1.g;
                res.emissiveIntensity = materialData.data1.b;

                res.albedo = materialData.data2;
                res.emissive = materialData.data3;
                res.ambient = materialData.data4;

                return res;
            }
        
        `

        const ALBEDO = !!pbr.albedoTexture;
        const BUMP = !!pbr.bumpTexture;
        const OPACITY = !!pbr.opacityTexture;
        const AO = !!pbr.ambientTexture;
        const EMISSIVE = !!pbr.emissiveTexture;

        const define = `
            ${ALBEDO ? `#define ALBEDO` : ``}
            ${BUMP ? `#define BUMP` : ``}
            ${OPACITY ? `#define OPACITY` : ``}
            ${AO ? `#define AO` : ``}
            ${EMISSIVE ? `#define EMISSIVE` : ``}
        `

        const bumpDefine = `
#ifdef BUMP
        vec3 perturbNormalBase(mat3 cotangentFrame, vec3 normal, float scale)
        {
            #ifdef NORMALXYSCALE
                normal = normalize(normal * vec3(scale, scale, 1.0));
            #endif

            return normalize(cotangentFrame * normal);
        }

        vec3 perturbNormal(mat3 cotangentFrame, vec3 textureSample, float scale)
        {
            return perturbNormalBase(cotangentFrame, textureSample * 2.0 - 1.0, scale);
        }

        mat3 cotangent_frame(vec3 normal, vec3 p, vec2 uv, vec2 tangentSpaceParams)
        {
            // get edge vectors of the pixel triangle
            vec3 dp1 = dFdx(p);
            vec3 dp2 = dFdy(p);
            vec2 duv1 = dFdx(uv);
            vec2 duv2 = dFdy(uv);

            // solve the linear system
            vec3 dp2perp = cross(dp2, normal);
            vec3 dp1perp = cross(normal, dp1);
            vec3 tangent = dp2perp * duv1.x + dp1perp * duv2.x;
            vec3 bitangent = dp2perp * duv1.y + dp1perp * duv2.y;

            // invert the tangent/bitangent if requested
            tangent *= tangentSpaceParams.x;
            bitangent *= tangentSpaceParams.y;

            // construct a scale-invariant frame
            float det = max(dot(tangent, tangent), dot(bitangent, bitangent));
            float invmax = det == 0.0 ? 0.0 : inversesqrt(det);
            return mat3(tangent * invmax, bitangent * invmax, normal);
        }
#endif
        `

        const bumpMain = `
#ifdef BUMP
            vec2 vBumpUV = vUV;
            vec2 TBNUV = gl_FrontFacing ? vBumpUV : -vBumpUV;
            float bumpScale = 1.;
		    mat3 TBN = cotangent_frame(normalW * bumpScale, vPositionW, TBNUV,  vec2(1., 1.));
            normalW = perturbNormal(TBN, texture2D(bumpSampler, vBumpUV).xyz, bumpScale);
#endif
        `

        const albedoMain = `
            float albedoAlpha = materialInfo.alpha;
            vec3 surfaceAlbedo = materialInfo.albedo * meshInfo.color;

#ifdef ALBEDO
            vec2 vAlbedoUV = vUV;
            vec4 albedoTexture = texture2D(albedoSampler, vAlbedoUV );
            surfaceAlbedo *= albedoTexture.rgb;
            albedoAlpha *= albedoTexture.a;
#endif

#ifdef OPACITY
            albedoAlpha *= texture2D(opacitySampler, vUV).a;
#endif
        `

        const aoMain = `
            vec3 AOColor = vec3(1.,1.,1.);
#ifdef AO
            float AOMixStep = 1.;
            vec3 AOColorMap = texture2D(ambientSampler, vUV).rgb;
            AOColor = mix(AOColor,AOColorMap,AOMixStep);
#endif
        `

        const lightFunc = `
        // Light Computing
struct lightingInfo
{
	vec3 diffuse;
#ifdef SPECULARTERM
	vec3 specular;
#endif
#ifdef NDOTL
	float ndl;
#endif
};

lightingInfo computeLighting(vec3 viewDirectionW, vec3 vNormal, vec4 lightData, vec3 diffuseColor, vec3 specularColor, float range, float glossiness) {
	lightingInfo result;

	vec3 lightVectorW;
	float attenuation = 1.0;
	if (lightData.w == 0.)
	{
		vec3 direction = lightData.xyz - vPositionW;

		attenuation = max(0., 1.0 - length(direction) / range);
		lightVectorW = normalize(direction);
	}
	else
	{
		lightVectorW = normalize(-lightData.xyz);
	}

	// diffuse
	float ndl = max(0., dot(vNormal, lightVectorW));
#ifdef NDOTL
	result.ndl = ndl;
#endif
	result.diffuse = ndl * diffuseColor * attenuation;
#ifdef SPECULARTERM
	// Specular
	vec3 angleW = normalize(viewDirectionW + lightVectorW);
	float specComp = max(0., dot(vNormal, angleW));
	specComp = pow(specComp, max(1., glossiness));

	result.specular = specComp * specularColor * attenuation;
#endif
	return result;
}

lightingInfo computeHemisphericLighting(vec3 viewDirectionW, vec3 vNormal, vec4 lightData, vec3 diffuseColor, vec3 specularColor, vec3 groundColor, float glossiness) {
	lightingInfo result;
    
	// Diffuse
	float ndl = dot(vNormal, lightData.xyz) * 0.5 + 0.5;
#ifdef NDOTL
	result.ndl = ndl;
#endif

	result.diffuse = mix(groundColor, diffuseColor, ndl);

#ifdef SPECULARTERM
	// Specular
	vec3 angleW = normalize(viewDirectionW + lightData.xyz);
	float specComp = max(0., dot(vNormal, angleW));
	specComp = pow(specComp, max(1., glossiness));

	result.specular = specComp * specularColor;
#endif
		return result;
}
        
        `

        const alpha = pbr.transparencyMode !== 0;
        return `
    precision highp float;

    uniform vec3 vEyePosition;
    uniform vec4 vSpecularColor;

    uniform vec4 vLightDiffuse;
    uniform vec4 vLightData;
    uniform vec4 vLightSpecular;

    uniform vec4 vHemisLightData;
    uniform vec3 vHemisLightDiffuse;
    uniform vec3 vHemisLightSpecular;
    uniform vec3 vHemisLightGroundColor;

    

    flat varying ivec2 pData;
    flat varying vec4 vDebugger;
    varying vec2 vUV;
    varying vec3 vPositionW;
    varying vec3 vNormalW;

    ${define}
#ifdef ALBEDO
    uniform sampler2D albedoSampler;
#endif
#ifdef BUMP
    uniform sampler2D bumpSampler;
#endif
#ifdef OPACITY
    uniform sampler2D opacitySampler;
#endif
#ifdef EMISSIVE
    uniform sampler2D emissiveSampler;
#endif
#ifdef AO
    uniform sampler2D ambientSampler;
#endif


    ${textures.meshData.getShader()}
    ${textures.materialData.getShader()}
#include<clipPlaneFragmentDeclaration>
#include<helperFunctions>
    ${meshData}
    ${materialData}
    ${bumpDefine}
    ${lightFunc}

void main(){
    
#include<clipPlaneFragment>

    int meshIndex = pData.x;
    float fMeshIndex = float(meshIndex);
    int materialIndex = pData.y;
    float fMaterialIndex = float(materialIndex);

	vec3 viewDirectionW = normalize(vEyePosition.xyz - vPositionW);

    MeshInfo meshInfo = getMeshInfo(fMeshIndex);
    if(meshInfo.visible<0.5) discard;
    MaterialInfo materialInfo = getMaterialInfo(fMaterialIndex);
    
    vec3 normalW = normalize(vNormalW) * 2. - 1.;

    ${bumpMain}
    ${albedoMain}
    ${aoMain}

    float glossiness = vSpecularColor.a;
    vec3 specularColor = vSpecularColor.rgb;

    vec3 diffuseBase = vec3(0., 0., 0.);
    
    float shadow = 1.;
	float aggShadow = 0.;
	float numLights = 0.;
    aggShadow = aggShadow / numLights;
	lightingInfo info = computeLighting(viewDirectionW, normalW, vLightData, vLightDiffuse.rgb,vLightSpecular.rgb, vLightDiffuse.a, glossiness);
    diffuseBase+=info.diffuse;
    info = computeHemisphericLighting(viewDirectionW, normalW, -vHemisLightData, vHemisLightDiffuse, vHemisLightSpecular, vHemisLightGroundColor, glossiness);
    diffuseBase+=info.diffuse;
	

	// Refraction
	vec4 refractionColor = vec4(0., 0., 0., 1.);
    vec4 reflectionColor = vec4(0., 0., 0., 1.);
    
    //Emissive
    vec3 emissiveColor = materialInfo.emissive * materialInfo.emissiveIntensity;
#ifdef EMISSIVE
    vec2 vEmissiveUV = vUV;
    emissiveColor += texture2D(emissiveSampler, vEmissiveUV).rgb * materialInfo.emissiveIntensity;
#endif
    vec3 diffuseColor = surfaceAlbedo;
    
	// vec3 finalDiffuse = clamp(diffuseBase * diffuseColor + emissiveColor + AOColor, 0.0, 1.0) ;
	vec3 finalDiffuse = clamp(diffuseBase * diffuseColor , 0.0, 1.0) ;


	vec3 finalSpecular = vec3(0.);
    vec3 color = finalDiffuse * AOColor + finalSpecular + reflectionColor.rgb + refractionColor.rgb;
    float finAlpha = ${alpha}? albedoAlpha : 1.0;

    gl_FragColor = vec4(color,finAlpha);
}
        
        `;
    }
}