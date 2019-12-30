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

  return okageo.svg.getGroupedPathList(pathList, style)
}
export function splitShape(shape: ISvgPath, line: IVec2[]): ISvgPath[] {
  return okageo.svg.splitPath(shape, line)
}

export function getGrid(pathInfoList: ISvgPath[], gridSize: number): IVec2[][] {
  return okageo.geo.getGrid(okageo.geo.getOuterRectangle(pathInfoList.map(p => p.d)), gridSize)
}

export function splitPathListByGrid(pathInfoList: ISvgPath[], gridSize: number): ISvgPath[] {
  const gridList = getGrid(pathInfoList, gridSize)
  let splited = pathInfoList.concat()

  gridList.forEach(line => {
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
  const size2D = okageo.geo.getOuterRectangle([pathInfo.d])
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
