import * as THREE from 'three'
import { OrbitControls } from 'three-orbitcontrols-ts'
import { Font, load } from 'opentype.js'
import okageo, { IVec2, ISvgPath, ISvgStyle } from 'okageo'

let _font: Font | null
const fontURL = 'https://fonts.gstatic.com/ea/notosansjapanese/v6/NotoSansJP-Medium.otf'

export function loadFont(): Promise<Font> {
  return new Promise((resolve, reject) => {
    if (_font) resolve(_font)

    load(fontURL, (err, font) => {
      if (!font || err) {
        return reject(new Error('Font could not be loaded: ' + err))
      }
      return resolve(font)
    })
  })
}

export async function parseFont(text: string, style: ISvgStyle): Promise<ISvgPath[]> {
  const font = await loadFont()
  const lines = text.split(/\n|\r\n/)
  const size = 72
  let pathList: IVec2[][] = []
  lines.forEach((line, i) => {
    pathList = pathList.concat(
      okageo.svg
        .parseOpenPath(font.getPath(line, 0, size * 1.1 * i, size))
        .map(info => okageo.geo.omitSamePoint(info.d)),
    )
  })

  return okageo.geo.getIncludedPolygonGroups(pathList).map(group => {
    const [d, ...included] = group
    return { d, included, style }
  })
}

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
  material: THREE.MeshBasicMaterial
  wallMaterial: THREE.MeshBasicMaterial
  meshes: THREE.Mesh[] = []

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
    this.camera.position.set(5, -1, 8)
    this.camera.lookAt(0, 0, 0)
    this.material = new THREE.MeshBasicMaterial({
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

    this.controls.update()
    this.renderer.render(this.scene, this.camera)
    requestAnimationFrame(this.animate)
  }

  createMesh(pathInfo: ISvgPath) {
    const depth = 2
    const wallGeometry = new THREE.Geometry()
    const shape = new THREE.Shape()
    pathInfo.d.forEach((v, i) => {
      const from = { x: v.x, y: -v.y }
      const to = {
        x: pathInfo.d[(i + 1) % pathInfo.d.length].x,
        y: -pathInfo.d[(i + 1) % pathInfo.d.length].y,
      }

      if (i === 0) shape.moveTo(from.x, from.y)
      else shape.lineTo(from.x, from.y)

      // はみ出ないよう側面はdepthより短くする
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(okageo.geo.getDistance(from, to), depth * 0.95),
      )
      const center = okageo.geo.getCenter(from, to)
      mesh.translateX(center.x)
      mesh.translateY(center.y)
      mesh.translateZ(-depth / 2)
      mesh.rotateX(-Math.PI / 2)
      mesh.rotateY(okageo.geo.getRadian(to, from))
      wallGeometry.mergeMesh(mesh)
    })

    const wallMeash = new THREE.Mesh(wallGeometry, this.wallMaterial)
    this.scene.add(wallMeash)
    this.meshes.push(wallMeash)

    const shapeMeshTop = new THREE.Mesh(new THREE.ShapeGeometry(shape), this.material)
    const shapeMeshBottom = shapeMeshTop.clone()
    shapeMeshBottom.translateZ(-depth)
    const shapeGeometry = new THREE.Geometry()
    shapeGeometry.mergeMesh(shapeMeshTop)
    shapeGeometry.mergeMesh(shapeMeshBottom)
    const shapeMesh = new THREE.Mesh(shapeGeometry, this.material)
    this.scene.add(shapeMesh)
    this.meshes.push(shapeMesh)
  }

  async importFromString(text: string) {
    const pathInfoList = await parseFont(text, this.style)
    const size = 10
    okageo.svg
      .fitRect(pathInfoList, -size / 2, -size / 2, size, size)
      // .forEach((p, i) => (i === 0 ? this.createMesh(p) : ''))
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
    this.meshes.forEach(m => this.scene.remove(m))
    this.meshes = []
  }

  dispose() {
    this.running = false
    this.renderer.dispose()
    this.scene.dispose()
    this.material.dispose()
  }
}
