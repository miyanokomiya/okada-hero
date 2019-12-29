import * as THREE from 'three'
import { OrbitControls } from 'three-orbitcontrols-ts'
import okageo, { ISvgPath, ISvgStyle } from 'okageo'
import { parseFont, splirtGrid, IBlock, craeteBlock } from './utils'

export default class App {
  width: number
  height: number
  canvas: HTMLCanvasElement
  style: ISvgStyle
  running = false
  scene: THREE.Scene
  renderer: THREE.WebGLRenderer
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  faceMaterial: THREE.MeshBasicMaterial
  wallMaterial: THREE.MeshBasicMaterial
  blocks: IBlock[] = []

  constructor(args: { canvas: HTMLCanvasElement; width: number; height: number }) {
    const { width, height, canvas } = args
    this.width = width
    this.height = height
    this.canvas = canvas
    this.style = {
      ...okageo.svg.createStyle(),
      fill: true,
      fillStyle: 'green',
      stroke: false,
    }
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(75, width / height, 1, 1000)
    this.camera.position.set(16, -1, 30)
    this.camera.lookAt(0, 0, 0)
    this.faceMaterial = new THREE.MeshBasicMaterial({
      color: this.style.fillStyle,
      side: THREE.DoubleSide,
    })
    this.wallMaterial = new THREE.MeshBasicMaterial({
      color: 'yellow',
      side: THREE.DoubleSide,
    })

    this.renderer = new THREE.WebGLRenderer()
    this.renderer.setSize(width, height)
    this.renderer.setClearColor(0x000000)
    canvas.appendChild(this.renderer.domElement)
    this.renderer.render(this.scene, this.camera)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.update()
    this.run()
  }

  animate = () => {
    if (!this.running) return

    this.blocks.forEach(b => {
      const axis = new THREE.Vector3(1, 0, 0).normalize()
      const rad = Math.PI / 180 / 2
      b.face.rotateOnWorldAxis(axis, rad)
      b.wall.rotateOnWorldAxis(axis, rad)
    })
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
    requestAnimationFrame(this.animate)
  }

  createMesh(pathInfo: ISvgPath) {
    const block = craeteBlock(pathInfo, this.faceMaterial, this.wallMaterial)
    this.scene.add(block.face, block.wall)
    this.blocks.push(block)
  }

  async importFromString(text: string) {
    const pathInfoList = await parseFont(text, this.style)
    const spaceSize = 50
    okageo.svg
      .fitRect(
        splirtGrid(pathInfoList).map(path => ({ d: path.d, style: this.style })),
        -spaceSize / 2,
        -spaceSize / 2,
        spaceSize,
        spaceSize,
      )
      .forEach(p => this.createMesh(p))
  }

  setStyle(style: { fillStyle: string }) {
    this.style.fillStyle = style.fillStyle
  }

  run() {
    this.running = true
    this.animate()
  }

  clear() {
    this.blocks.forEach(b => {
      this.scene.remove(b.face)
      this.scene.remove(b.wall)
    })
    this.blocks = []
  }

  dispose() {
    this.running = false
    this.renderer.dispose()
    this.scene.dispose()
    this.faceMaterial.dispose()
  }
}
