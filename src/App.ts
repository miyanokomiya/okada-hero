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
    this.camera.position.set(16, -1, 30)
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
      mesh.rotateY(-okageo.geo.getRadian(to, from))
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

  splitShape(shape: ISvgPath, line: IVec2[]): ISvgPath[] {
    // 包含ポリゴンと共に全て分割
    let splited = okageo.geo.splitPolyByLine(shape.d, line)
    if (splited.length < 2) return [shape]

    // 本体と回転方向が一致しているかで分類
    const rootLoopwise = okageo.geo.getLoopwise(shape.d)
    const sameLoopwiseList: IVec2[][] = []
    const oppositeLoopwiseList: IVec2[][] = []
    shape.included!.forEach(s => {
      if (okageo.geo.getLoopwise(s) === rootLoopwise) {
        sameLoopwiseList.push(s)
      } else {
        oppositeLoopwiseList.push(s)
      }
    })

    // 本体と同回転のものはそのまま分割
    sameLoopwiseList.forEach(poly => {
      const sp = okageo.geo.splitPolyByLine(poly, line)
      splited = [...splited, ...(sp.length > 0 ? sp : [poly])]
    })

    // 本体と逆回転のものは特殊処理
    const notPolyList: IVec2[][] = []
    oppositeLoopwiseList.forEach(poly => {
      const sp = okageo.geo.splitPolyByLine(poly, line)
      if (sp.length > 0) {
        // 分割されたらブーリアン差をとるために集める
        notPolyList.push(poly)
      } else {
        // 分割なしならそのまま
        splited.push(poly)
      }
    })

    // 切断されたくり抜き領域を差し引いたポリゴンを生成
    const splitedAfterNot = splited.map(s => {
      return notPolyList.reduce((p, c) => {
        return okageo.geo.getPolygonNotPolygon(p, c)
      }, s)
    })

    // 包含関係で再度グルーピング
    const groups = okageo.geo.getIncludedPolygonGroups(splitedAfterNot)

    // 分割後shape生成
    const splitedShapeList: ISvgPath[] = []
    groups.forEach(group => {
      const [path, ...included] = group
      splitedShapeList.push({ d: path, included, style: shape.style })
    })

    return splitedShapeList
  }

  async importFromString(text: string) {
    const pathInfoList = await parseFont(text, this.style)
    let splited = pathInfoList.concat()
    ;[...Array(100)].forEach((_, x) => {
      const line = [
        { x: -500 + x * 10, y: -500 },
        { x: -500 + x * 10, y: 500 },
      ]
      let list: ISvgPath[] = []
      splited.forEach(path => {
        list = list.concat(this.splitShape(path, line))
      })
      splited = list
    })

    const size = 50
    okageo.svg
      .fitRect(
        splited.map(path => ({ d: path.d, style: this.style })),
        -size / 2,
        -size / 2,
        size,
        size,
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
