<template>
  <div id="app">
    <canvas id="babylon-canvas"></canvas>
  </div>
</template>

<script lang="ts">
import { Vue } from 'vue-class-component';
import { createEngine } from './Demo/Engine/CreateEngine';

export default class App extends Vue {
  private engine: any | null = null;

  mounted() {
    const canvas = document.getElementById('babylon-canvas') as HTMLCanvasElement;
    if (canvas) {
      // 创建引擎和场景
      const engine = createEngine(canvas);
      this.engine = engine;
    }
  }

  beforeUnmount() {
    // 销毁引擎
    if (this.engine) {
      this.engine.dispose();
      this.engine = null;
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

#app {
  width: 100vw;
  height: 100vh;
  position: relative;
}

#babylon-canvas {
  width: 100%;
  height: 100%;
  display: block;
  outline: none;
}
</style>
