import * as THREE from 'three'
import { Font, load } from 'opentype.js'
import okageo, { IVec2, ISvgPath, ISvgStyle } from 'okageo'

export interface IBlock {
  face: THREE.Mesh
  wall: THREE.Mesh
  position: THREE.Vector3
}

let _font: Font | null
const fontURL = 'https://fonts.gstatic.com/ea/notosansjapanese/v6/NotoSansJP-Medium.otf'

function loadFont(): Promise<Font> {
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
export function splitShape(shape: ISvgPath, line: IVec2[]): ISvgPath[] {
  let splited = okageo.geo.splitPolyByLine(shape.d, line)
  if (splited.length < 2) return [shape]

  // 本体と回転方向が一致しているかで分類
  const rootLoopwise = okageo.geo.getLoopwise(shape.d)
  const sameLoopwiseList: IVec2[][] = []
  const oppositeLoopwiseList: IVec2[][] = []
  if (shape.included) {
    shape.included.forEach(s => {
      if (okageo.geo.getLoopwise(s) === rootLoopwise) {
        sameLoopwiseList.push(s)
      } else {
        oppositeLoopwiseList.push(s)
      }
    })
  }

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
  const splitedAfterNot = splited.map(s =>
    notPolyList.reduce((p, c) => okageo.geo.getPolygonNotPolygon(p, c), s),
  )

  return okageo.geo.getIncludedPolygonGroups(splitedAfterNot).map(group => {
    const [path, ...included] = group
    return { d: path, included, style: shape.style }
  })
}

export function getMaxSize(
  pathInfoList: ISvgPath[],
): { x: number; y: number; width: number; height: number } {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  pathInfoList.forEach(path =>
    path.d.forEach(v => {
      minX = Math.min(minX, v.x)
      minY = Math.min(minY, v.y)
      maxX = Math.max(maxX, v.x)
      maxY = Math.max(maxY, v.y)
    }),
  )

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

export function splirtGrid(pathInfoList: ISvgPath[]): ISvgPath[] {
  const gridSize = 10
  const size = getMaxSize(pathInfoList)
  let splited = pathInfoList.concat()
  ;[...Array(Math.ceil(size.width / gridSize))].forEach((_, i) => {
    if (i === 0) return

    const line = [
      { x: size.x + i * gridSize, y: size.y },
      { x: size.x + i * gridSize, y: size.y + size.height },
    ]
    let list: ISvgPath[] = []
    splited.forEach(path => {
      list = list.concat(splitShape(path, line))
    })
    splited = list
  })
  ;[...Array(Math.ceil(size.height / gridSize))].forEach((_, i) => {
    if (i === 0) return

    const line = [
      { x: size.x, y: size.y + i * gridSize },
      { x: size.x + size.width, y: size.y + i * gridSize },
    ]
    let list: ISvgPath[] = []
    splited.forEach(path => {
      list = list.concat(splitShape(path, line))
    })
    splited = list
  })

  return splited
}

export function craeteBlock(
  pathInfo: ISvgPath,
  faceMaterial: THREE.Material,
  wallMaterial: THREE.Material,
): IBlock {
  const depth = 2
  const size2D = getMaxSize([pathInfo])
  const center = new THREE.Vector3(
    size2D.x + size2D.width / 2,
    -(size2D.y + size2D.height / 2),
    depth / 2,
  )
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
    const fromCenter = okageo.geo.getCenter(from, to)
    mesh.translateX(fromCenter.x)
    mesh.translateY(fromCenter.y)
    mesh.translateZ(-depth / 2)
    mesh.rotateX(-Math.PI / 2)
    mesh.rotateY(-okageo.geo.getRadian(to, from))
    wallGeometry.mergeMesh(mesh)
  })

  wallGeometry.center()
  const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial)
  wallMesh.position.set(center.x, center.y, center.z)

  const shapeMeshTop = new THREE.Mesh(new THREE.ShapeGeometry(shape))
  const shapeMeshBottom = shapeMeshTop.clone()
  shapeMeshBottom.translateZ(-depth)
  const shapeGeometry = new THREE.Geometry()
  shapeGeometry.mergeMesh(shapeMeshTop)
  shapeGeometry.mergeMesh(shapeMeshBottom)
  shapeGeometry.center()
  const shapeMesh = new THREE.Mesh(shapeGeometry, faceMaterial)
  shapeMesh.position.set(center.x, center.y, center.z)

  return { face: shapeMesh, wall: wallMesh, position: center }
}
