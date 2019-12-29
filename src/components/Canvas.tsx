import * as React from 'react'
import * as THREE from 'three'
import PropTypes from 'prop-types'
import Grid from '@material-ui/core/Grid'
import Button from '@material-ui/core/Button'
import { IConfig } from '../types'
import App from '../App'

export type Props = {
  width: number
  height: number
  config: IConfig
  count: number
}

const Canvas: React.FC<Props> = props => {
  const canvasRef = React.useRef(null)
  const [app, setApp] = React.useState<App | null>(null)

  // app初期化と片付け
  React.useEffect(() => {
    const app = new App({
      canvas: canvasRef.current!,
      width: props.width,
      height: props.height,
    })
    setApp(app)
    return () => app.dispose()
  }, [props.height, props.width])

  // プロパティ反映
  React.useEffect(() => {
    if (!app) return
    app.setStyle(props.config.faceColor, props.config.wallColor)
    app.setRotateSpeed(props.config.rotateSpeed)
  }, [app, props.config.faceColor, props.config.rotateSpeed, props.config.wallColor])

  // テキストインポート
  React.useEffect(() => {
    if (!app) return
    app.clear()
    app.importFromString(props.config.text)
  }, [app, props.config.text])

  const onClickToggle = React.useCallback(() => {
    if (!app) return
    app.spread()
  }, [app])

  return (
    <div>
      <div ref={canvasRef} />
      <Grid container spacing={2}>
        <Grid item>
          <Button variant="contained" onClick={onClickToggle}>
            Action
          </Button>
        </Grid>
      </Grid>
    </div>
  )
}

Canvas.propTypes = {
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  config: PropTypes.shape({
    text: PropTypes.string.isRequired,
    faceColor: PropTypes.string.isRequired,
    wallColor: PropTypes.string.isRequired,
  }).isRequired,
  count: PropTypes.number.isRequired,
}
Canvas.defaultProps = {
  width: 300,
  height: 300,
  count: 0,
}

export default Canvas
