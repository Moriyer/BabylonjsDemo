import * as BABYLON from 'babylonjs';
import "babylonjs-inspector";
import "babylonjs-loaders";
import "babylonjs-serializers";
//Change Import Here Start

import { Playground } from '../Scene/CombineTestScene';
//Change Import Here End

export function createEngine(canvas: HTMLCanvasElement): BABYLON.Engine {
    const engine = new BABYLON.Engine(canvas, true);

    const scene = Playground.CreateScene(engine, canvas);
    engine.runRenderLoop(() => {
        scene.render();
    })

    const resize = () => {
        engine.resize();
    };
    console.time("创建Engine");
    scene.onReadyObservable.add(() => {
        scene.debugLayer.show();
        console.timeEnd("创建Engine");
    })

    canvas.addEventListener("resize", resize);
    engine.onDisposeObservable.add(() => {
        canvas.removeEventListener("resize", resize);
    })

    return engine;
}