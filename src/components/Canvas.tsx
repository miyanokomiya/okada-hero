import * as React from 'react'
import * as THREE from 'three'
import PropTypes from 'prop-types'
import { IConfig } from '../types'
import App from '../App'

export type Props = {
  width?: number
  height?: number
  config: IConfig
  count?: number
}

const Canvas: React.FC<Props> = props => {
  const canvasRef = React.useRef(null)
  const [app, setApp] = React.useState<App | null>(null)
  const [running, setRunning] = React.useState(true)

  // app初期化と片付け
  React.useEffect(() => {
    const app = new App({
      canvas: canvasRef.current!,
      width: props.width || 500,
      height: props.height || 500,
    })
    app.run()
    app.importFromString(props.config.text)
    setApp(app)
    setRunning(true)
    return () => app.dispose()
  }, [props.config.text, props.height, props.width])

  // テキストインポート
  React.useEffect(() => {
    if (!app) return
    app.clear()
    app.importFromString(props.config.text)
  }, [app, props.config.text, props.count])

  // プロパティ反映
  React.useEffect(() => {
    if (!app) return
    app.setStyle({ fillStyle: props.config.fillStyle })
  }, [app, props.config.fillStyle])

  return (
    <div>
      <div ref={canvasRef} />
    </div>
  )
}

Canvas.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
  config: PropTypes.shape({
    text: PropTypes.string.isRequired,
    fillStyle: PropTypes.string.isRequired,
  }).isRequired,
  count: PropTypes.number,
}
Canvas.defaultProps = {
  width: 300,
  height: 300,
  count: 0,
}

export default Canvas
