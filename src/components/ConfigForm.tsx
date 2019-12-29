import * as React from 'react'
import red from '@material-ui/core/colors/red'
import Grid from '@material-ui/core/Grid'
import Button from '@material-ui/core/Button'
import TextField from '@material-ui/core/TextField'
import Typography from '@material-ui/core/Typography'
import Slider from '@material-ui/core/Slider'
import { CompactPicker, ColorResult } from 'react-color'
import okageo, { ISvgPath } from 'okageo'
import PropTypes from 'prop-types'
import { IConfig } from '../types'
import { parseFont, getGrid, splitPathListByGrid } from '../utils'

export type Props = {
  width: number
  config: IConfig
  onSubmit: (options: IConfig, force?: boolean) => void
}

const OptionForm: React.FC<Props> = props => {
  const canvasRef = React.useRef(null)
  const [draftText, setDraftText] = React.useState(props.config.text)
  const [draftGridSize, setDraftGridSize] = React.useState(props.config.gridSize)
  const [pathInfoList, setPathInfoList] = React.useState<ISvgPath[]>([])

  React.useEffect(() => {
    parseFont(draftText, okageo.svg.createStyle()).then(pathInfoList =>
      setPathInfoList(pathInfoList),
    )
  }, [draftText])

  React.useEffect(() => {
    if (!canvasRef) return
    if (pathInfoList.length === 0) return

    const canvas = canvasRef.current as any
    const ctx = canvas.getContext('2d')
    const style = {
      ...okageo.svg.createStyle(),
      fill: true,
      fillStyle: props.config.faceColor,
      stroke: true,
      strokeStyle: props.config.wallColor,
    }
    const gridStyle = {
      ...okageo.svg.createStyle(),
      stroke: true,
      strokeStyle: '#000',
    }
    const gridList = getGrid(pathInfoList, draftGridSize).map(d => ({
      d,
      style: gridStyle,
    }))

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    okageo.svg
      .fitRect(
        [...pathInfoList.map(p => ({ ...p, style })), ...gridList],
        0,
        0,
        canvas.width,
        canvas.height,
      )
      .forEach(p => {
        okageo.svg.draw(ctx, p)
      })
  }, [props.width, props.config.faceColor, props.config.wallColor, pathInfoList, draftGridSize])

  const InvalidGrid = React.useMemo(() => {
    const splited = splitPathListByGrid(pathInfoList, draftGridSize)
    return splited.find(p => p.included && p.included.length > 0) ? (
      <Typography color="error">Invalid Grid! It must be more narrow.</Typography>
    ) : (
      ''
    )
  }, [pathInfoList, draftGridSize])

  const onInputDraftText = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraftText(e.currentTarget.value)
  }, [])

  const onInputFaceColor = React.useCallback(
    (color: ColorResult) => {
      props.onSubmit({
        ...props.config,
        faceColor: color.hex,
      })
    },
    [props],
  )

  const onInputWallColor = React.useCallback(
    (color: ColorResult) => {
      props.onSubmit({
        ...props.config,
        wallColor: color.hex,
      })
    },
    [props],
  )

  const onInputRotateSpeed = React.useCallback(
    (_, value: any) => {
      props.onSubmit({
        ...props.config,
        rotateSpeed: value,
      })
    },
    [props],
  )

  const onInputGridSize = React.useCallback((_, value: any) => {
    setDraftGridSize(value)
  }, [])

  const onSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      props.onSubmit(
        {
          ...props.config,
          text: draftText,
          gridSize: draftGridSize,
        },
        true,
      )
    },
    [props, draftText, draftGridSize],
  )

  return (
    <form onSubmit={onSubmit}>
      <Grid container style={{ marginTop: '1rem' }} spacing={2}>
        <Grid item xs={12} sm={6}>
          <Typography>Auto Rotation</Typography>
          <Slider
            marks={[{ value: 0, label: '0' }]}
            step={0.5}
            min={-10}
            max={10}
            value={props.config.rotateSpeed}
            onChange={onInputRotateSpeed}
          />
        </Grid>
      </Grid>
      <Grid container style={{ marginTop: '1rem' }} spacing={2}>
        <Grid item>
          <Typography>Face</Typography>
          <CompactPicker color={props.config.faceColor} onChange={onInputFaceColor} />
        </Grid>
        <Grid item>
          <Typography>Wall</Typography>
          <CompactPicker color={props.config.wallColor} onChange={onInputWallColor} />
        </Grid>
      </Grid>
      <Grid container style={{ marginTop: '1rem' }}>
        <Grid item>
          <Button type="submit" variant="contained">
            Apply
          </Button>
        </Grid>
      </Grid>
      <Grid container style={{ marginTop: '1rem' }}>
        <Grid item xs={12}>
          <Typography>Text</Typography>
          <TextField
            multiline
            fullWidth
            variant="outlined"
            value={draftText}
            onChange={onInputDraftText}
          />
        </Grid>
      </Grid>
      <Grid container style={{ marginTop: '1rem' }}>
        <Grid item xs={12} sm={6}>
          <Typography>Grid</Typography>
          {InvalidGrid}
          <Slider step={1} min={5} max={30} value={draftGridSize} onChange={onInputGridSize} />
        </Grid>
        <Grid item xs={12}>
          <canvas
            ref={canvasRef}
            width={props.width}
            height={props.width * 0.6}
            style={{ border: '1px solid black' }}
          ></canvas>
        </Grid>
      </Grid>
    </form>
  )
}

OptionForm.propTypes = {
  width: PropTypes.number.isRequired,
  config: PropTypes.shape({
    text: PropTypes.string.isRequired,
    faceColor: PropTypes.string.isRequired,
    wallColor: PropTypes.string.isRequired,
    rotateSpeed: PropTypes.number.isRequired,
    gridSize: PropTypes.number.isRequired,
  }).isRequired,
  onSubmit: PropTypes.func.isRequired,
}
OptionForm.defaultProps = {}

export default OptionForm
